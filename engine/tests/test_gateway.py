import json
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402
from ireme import gateway as gw  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
GROQ_KEY = "gsk_" + "A1b2C3d4E5f6G7h8I9j0K1l2"
NVD_KEY = "nvapi-" + "Z9y8X7w6V5u4T3s2R1q0P9o8"
ENV = {"GROQ_API_KEY": GROQ_KEY, "NVIDIA_API_KEY": NVD_KEY}
SCHEMA = {"type": "object", "required": ["ok"], "properties": {"ok": {"type": "boolean"}}, "additionalProperties": False}
MSG = [{"role": "user", "content": "Classify this public document title."}]


def make(transport, env=ENV, **kw):
    return gw.Gateway(gw.default_providers(), transport, dict(env), sleep=lambda s: None, clock=lambda: 100.0, **kw)


def ok_transport(calls):
    def t(p, url, req, key):
        calls.append(p.name)
        return {"content": json.dumps({"ok": True}), "model": f"{p.name}-m"}
    return t


class Gateway(unittest.TestCase):
    @acceptance("AI-12")
    def test_quota_429_fails_over_without_hammering_same_provider(self):
        calls = []

        def t(p, url, req, key):
            calls.append(p.name)
            if p.name == "groq":
                raise gw.ProviderError("transient_429", "rate limited", retry_after=30)
            return {"content": json.dumps({"ok": True}), "model": "m"}
        g = make(t, benchmark={("structured_analysis", "groq"): 0.9, ("structured_analysis", "nvidia"): 0.5})
        out = g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        self.assertEqual(calls, ["groq", "nvidia"])
        self.assertEqual(out["audit"]["provider"], "nvidia")
        self.assertEqual(g.cooldown_until["groq"], 130.0)                   # Retry-After honoured
        calls.clear()
        g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        self.assertEqual(calls, ["nvidia"])                                  # cooled-down provider skipped

    @acceptance("AI-13")
    def test_cloud_unavailable_all_providers_gives_explicit_exhaustion_not_invented_answer(self):
        def t(p, url, req, key):
            raise gw.ProviderError("connection_timeout", "down")
        g = make(t)
        with self.assertRaises(gw.GatewayExhausted) as cm:
            g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        self.assertLessEqual(len(cm.exception.attempts), 3)                  # bounded attempts
        self.assertEqual(g.audit[-1]["outcome"], "exhausted")

    @acceptance("AI-13")
    def test_policy_errors_are_never_retried(self):
        calls = []

        def t(p, url, req, key):
            calls.append(p.name)
            raise gw.ProviderError("policy_denied", "blocked")
        with self.assertRaises(gw.PolicyDenied):
            make(t).complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        self.assertEqual(len(calls), 1)

    @acceptance("AI-14")
    def test_local_only_never_touches_a_cloud_provider(self):
        calls = []
        g = make(ok_transport(calls))
        out = g.complete(gw.Request("structured_analysis", MSG, local_only=True, schema=None))
        self.assertEqual(out["audit"]["provider"], "ollama_local")
        self.assertEqual(set(calls), {"ollama_local"})
        # a "local" provider whose URL is not loopback (e.g. a cloud proxy) is not accepted as local
        bad = gw.default_providers()
        bad["ollama_local"] = gw.Provider("ollama_local", "https://ollama.com/v1", None, True, frozenset())
        with self.assertRaises(gw.PolicyDenied):
            gw.Gateway(bad, ok_transport([]), dict(ENV)).complete(gw.Request("structured_analysis", MSG, local_only=True))

    @acceptance("AI-15", "PRIV-12")
    def test_provider_secrets_never_leak_into_prompts_errors_or_audit(self):
        with self.assertRaises(gw.PolicyDenied):
            make(ok_transport([])).complete(gw.Request("structured_analysis",
                                                       [{"role": "user", "content": f"use key {GROQ_KEY}"}]))

        def leaky(p, url, req, key):
            raise gw.ProviderError("connection_timeout", f"failed with Authorization: Bearer {key} for {key}")
        g = make(leaky)
        with self.assertRaises(gw.GatewayExhausted) as cm:
            g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        blob = json.dumps(cm.exception.attempts) + json.dumps(g.audit)
        self.assertNotIn(GROQ_KEY, blob)
        self.assertNotIn(NVD_KEY, blob)
        self.assertNotIn("Bearer " + GROQ_KEY, gw.redact(f"Authorization: Bearer {GROQ_KEY}"))

    @acceptance("AI-16")
    def test_missing_capability_excludes_provider_and_none_means_denied(self):
        calls = []
        g = make(ok_transport(calls))
        g.complete(gw.Request("structured_analysis", MSG, needs=frozenset({"tools"}), schema=SCHEMA))
        self.assertEqual(calls, ["groq"])                                    # only Groq declares tools
        with self.assertRaises(gw.PolicyDenied):
            g.complete(gw.Request("structured_analysis", MSG, needs=frozenset({"vision"})))

    @acceptance("AI-11")
    def test_invalid_model_output_fails_over_then_is_rejected(self):
        def t(p, url, req, key):
            return {"content": json.dumps({"ok": "yes", "extra": 1}), "model": "m"}
        with self.assertRaises(gw.GatewayExhausted) as cm:
            make(t).complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        self.assertTrue(all(a["outcome"] == "schema_invalid" for a in cm.exception.attempts))

    @acceptance("PRIV-01")
    def test_confidential_microdata_never_leaves_for_a_remote_provider(self):
        calls = []
        g = make(ok_transport(calls))
        for sens in ("confidential_microdata", "beneficiary_operational", "secrets"):
            with self.assertRaises(gw.PolicyDenied, msg=sens):
                g.complete(gw.Request("structured_analysis", MSG, sensitivity=sens))
        with self.assertRaises(gw.PolicyDenied):
            g.complete(gw.Request("microdata_processing", MSG, sensitivity="restricted_aggregate"))
        # restricted aggregates without disclosure clearance never go to a remote provider
        r = g.complete(gw.Request("structured_analysis", MSG, sensitivity="restricted_aggregate"))
        self.assertEqual(r["audit"]["provider"], "ollama_local")
        self.assertEqual(calls, ["ollama_local"])
        # explicit, cleared, local-only handling is the single permitted path for microdata
        loc = g.complete(gw.Request("microdata_processing", MSG, sensitivity="confidential_microdata", local_only=True,
                                    clearance="dc-local-1"))
        self.assertEqual(loc["audit"]["provider"], "ollama_local")
        calls.clear()
        g.complete(gw.Request("structured_analysis", MSG, sensitivity="restricted_aggregate", clearance="dc-2026-07"))
        self.assertEqual(len(calls), 1)
        self.assertNotEqual(calls[0], "")

    @acceptance("AI-17")
    def test_translation_must_preserve_every_number(self):
        src = "Kamonyi's poverty rate is 39.7% (95% CI 33.1 to 46.2)."
        self.assertTrue(gw.numbers_preserved(src, "Umubare w'ubukene muri Kamonyi ni 39,7% (CI 95% 33,1 kugeza 46,2)."))
        self.assertFalse(gw.numbers_preserved(src, "Umubare w'ubukene muri Kamonyi ni 49.7% (CI 95% 33.1 kugeza 46.2)."))
        self.assertFalse(gw.numbers_preserved(src, "Ubukene ni 39.7%."))

    @acceptance("AI-18")
    def test_prompt_data_and_schema_hashes_are_pinned_in_audit(self):
        g = make(ok_transport([]))
        a = g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))["audit"]
        b = g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))["audit"]
        c = g.complete(gw.Request("structured_analysis", MSG + [{"role": "user", "content": "x"}], schema=SCHEMA))["audit"]
        self.assertEqual(a["prompt_sha256"], b["prompt_sha256"])
        self.assertNotEqual(a["prompt_sha256"], c["prompt_sha256"])
        self.assertRegex(a["schema_sha256"], r"^[0-9a-f]{64}$")
        self.assertEqual(a["model"], "groq-m")

    @acceptance("AI-12")
    def test_benchmark_evaluation_drives_routing(self):
        def t(p, url, req, key):
            ans = {"groq": True, "nvidia": False}.get(p.name, True)
            return {"content": json.dumps({"ok": ans}), "model": "m"}
        g = make(t)
        cases = [(gw.Request("structured_analysis", MSG, schema=SCHEMA), lambda r: r["ok"] is True)] * 4
        scores = gw.evaluate_models(g, "structured_analysis", cases)
        self.assertEqual((scores["groq"], scores["nvidia"]), (1.0, 0.0))
        self.assertEqual(g.eligible(gw.Request("structured_analysis", MSG, schema=SCHEMA))[0].name, "groq")


class MultiKeyCredentials(unittest.TestCase):
    """`PROVIDER_API_KEY`, `_2` ... `_9`: tried in order, fail over on auth/quota, never logged."""

    def setUp(self):
        self.key1 = "gsk_" + "Q1w2E3r4T5y6U7i8O9p0A1s2"
        self.key2 = "gsk_" + "B2n3M4k5J6h7G8f9D0s1A2q3"
        self.key3 = "gsk_" + "C3v4N5b6K7j8H9g0F1d2S3w4"
        self.env = {"GROQ_API_KEY": self.key1, "GROQ_API_KEY_2": self.key2, "GROQ_API_KEY_3": self.key3}

    def test_key_names_and_configured_keys_are_ordered_and_deduplicated(self):
        self.assertEqual(gw.provider_key_names("GROQ_API_KEY"),
                         ("GROQ_API_KEY", "GROQ_API_KEY_2", "GROQ_API_KEY_3", "GROQ_API_KEY_4",
                          "GROQ_API_KEY_5", "GROQ_API_KEY_6", "GROQ_API_KEY_7", "GROQ_API_KEY_8",
                          "GROQ_API_KEY_9"))
        self.assertEqual(gw.configured_keys(self.env, "GROQ_API_KEY"), [self.key1, self.key2, self.key3])
        # a repeated value counts once: it is the same account, so it cannot add quota
        dup = {"GROQ_API_KEY": self.key1, "GROQ_API_KEY_2": self.key1}
        self.assertEqual(gw.configured_keys(dup, "GROQ_API_KEY"), [self.key1])
        # blank/missing entries are skipped rather than treated as a key
        sparse = {"GROQ_API_KEY": self.key1, "GROQ_API_KEY_2": "   ", "GROQ_API_KEY_3": self.key3}
        self.assertEqual(gw.configured_keys(sparse, "GROQ_API_KEY"), [self.key1, self.key3])
        self.assertTrue(gw.has_configured_keys(self.env))
        self.assertFalse(gw.has_configured_keys({}))

    def test_quota_on_first_key_fails_over_to_the_second_key(self):
        seen = []

        def t(p, url, req, key):
            seen.append((p.name, key))
            if key == self.key1:
                raise gw.ProviderError("transient_429", "rate limited", retry_after=20)
            return {"content": json.dumps({"ok": True}), "model": f"{p.name}-m"}

        g = make(t, env=self.env)
        self.assertIn("groq#2", g.providers)
        self.assertIn("groq#3", g.providers)
        out = g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        # first key is rate-limited, so the retry uses the *other* credential, not the same one
        self.assertEqual(seen, [("groq", self.key1), ("groq#2", self.key2)])
        self.assertEqual(out["audit"]["provider"], "groq#2")
        self.assertEqual(g.cooldown_until["groq"], 120.0)

    def test_revoked_key_fails_over_and_audit_records_each_attempt(self):
        def t(p, url, req, key):
            if key == self.key1:
                raise gw.ProviderError("auth_invalid", "401 unauthorized")
            return {"content": json.dumps({"ok": True}), "model": "m"}

        out = make(t, env=self.env).complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        # auth_invalid is fatal to that credential only (not in never_retry_on), so the next key is tried
        outcomes = [(a["provider"], a["outcome"]) for a in out["audit"]["attempts"]]
        self.assertEqual(outcomes, [("groq", "fatal:auth_invalid"), ("groq#2", "ok")])

    def test_all_keys_exhausted_is_explicit_and_never_echoes_a_key(self):
        def t(p, url, req, key):
            raise gw.ProviderError("connection_timeout", f"timeout using {key}")

        g = make(t, env=self.env)
        with self.assertRaises(gw.GatewayExhausted) as cm:
            g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        self.assertLessEqual(len(cm.exception.attempts), 3)                  # bounded attempts
        blob = json.dumps(cm.exception.attempts) + json.dumps(g.audit)
        for key in (self.key1, self.key2, self.key3):
            self.assertNotIn(key, blob)
        self.assertEqual(g.audit[-1]["outcome"], "exhausted")

    def test_secrets_are_redacted_even_without_key_expansion(self):
        def t(p, url, req, key):
            raise gw.ProviderError("connection_timeout", f"bad key {key}")
        # benchmark runs build gateways with expand_keys=False; suffixed keys must still be masked
        g = gw.Gateway({"groq": gw.default_providers()["groq"]}, t, dict(self.env),
                       sleep=lambda s: None, clock=lambda: 100.0, expand_keys=False)
        with self.assertRaises(gw.GatewayExhausted) as cm:
            g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        blob = json.dumps(cm.exception.attempts) + json.dumps(g.audit)
        self.assertNotIn(self.key1, blob)
        # a prompt carrying any configured key (even a secondary one) is refused outright
        with self.assertRaises(gw.PolicyDenied):
            g.complete(gw.Request("structured_analysis", [{"role": "user", "content": self.key2}]))

    def test_local_env_file_uses_canonical_names_only(self):
        """The real `.env.local` must expose keys only through canonical names (values never read here)."""
        env_file = ROOT / ".env.local"
        if not env_file.exists():
            self.skipTest("no local env file")
        allowed = re.compile(r"^(VITE_[A-Z0-9_]+|(GROQ|NVIDIA|OLLAMA)_API_KEY(_[2-9])?|"
                             r"OLLAMA_BASE_URL|IREME_[A-Z0-9_]+|SUPABASE_[A-Z0-9_]+)$")
        offenders = []
        for line in env_file.read_text(encoding="utf-8").splitlines():
            text = line.strip()
            if not text or text.startswith("#") or "=" not in text:
                continue
            name = text.split("=", 1)[0].strip()
            if not allowed.match(name):
                offenders.append(name)
        self.assertEqual(offenders, [])

    def test_real_env_local_builds_one_routing_slot_per_configured_key(self):
        """The real local credentials must produce exactly one provider slot per key, with no leaks."""
        env_file = ROOT / ".env.local"
        if not env_file.exists():
            self.skipTest("no local env file")
        env = {}
        for line in env_file.read_text(encoding="utf-8").splitlines():
            text = line.strip()
            if "=" in text and not text.startswith("#"):
                k, v = text.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
        expected = {}
        for base in ("GROQ_API_KEY", "NVIDIA_API_KEY", "OLLAMA_API_KEY"):
            expected[base] = len(gw.configured_keys(env, base))
        if not any(expected.values()):
            self.skipTest("no provider keys configured")

        seen_keys = []

        def t(p, url, req, key):
            seen_keys.append(key)
            return {"content": json.dumps({"ok": True}), "model": f"{p.name}-m"}

        g = make(t, env=env, benchmark={("structured_analysis", "groq"): 1.0})   # deterministic first slot
        slots = [n for n in g.providers if "#" in n]
        self.assertEqual(len(slots), sum(max(0, n - 1) for n in expected.values()), slots)
        # every configured value is known to the redactor, including secondary keys
        secrets = g._secrets()
        for base in ("GROQ_API_KEY", "NVIDIA_API_KEY", "OLLAMA_API_KEY"):
            for value in gw.configured_keys(env, base):
                self.assertIn(value, secrets)
        for value in seen_keys:
            self.assertTrue(value is None or value in secrets)   # only configured keys reach a provider

        before = len(g.audit)
        out = g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        blob = json.dumps(g.audit[before:]) + json.dumps(out)
        for value in secrets:
            self.assertNotIn(value, blob)

    def test_provider_base_name_groups_secondary_keys_with_their_provider(self):
        from ireme.gateway_http import provider_base_name
        self.assertEqual(provider_base_name(gw.Provider("groq#2", "https://x/v1", "GROQ_API_KEY_2", False,
                                                        frozenset())), "groq")
        self.assertEqual(provider_base_name(gw.Provider("nvidia", "https://x/v1", "NVIDIA_API_KEY", False,
                                                        frozenset())), "nvidia")



class FrontendBundle(unittest.TestCase):
    @acceptance("PRIV-14", evidence="synthetic")
    def test_no_secret_patterns_in_frontend_source_or_built_bundle(self):
        pats = [re.compile(p) for p in (r"gsk_[A-Za-z0-9]{20,}", r"nvapi-[A-Za-z0-9_\-]{20,}", r"\bsk-[A-Za-z0-9]{32,}",
                                        r"OLLAMA_API_KEY\s*[:=]\s*['\"][^'\"]{8,}", r"service_role")]
        hits = []
        for base in (ROOT / "dist", ROOT / "src"):
            if not base.exists():
                continue
            for f in base.rglob("*"):
                if f.is_file() and f.suffix in {".js", ".jsx", ".html", ".css", ".json", ".mjs", ".map"}:
                    txt = f.read_text(encoding="utf-8", errors="ignore")
                    for p in pats:
                        if p.search(txt):
                            hits.append((str(f.relative_to(ROOT)), p.pattern))
        self.assertEqual(hits, [])


if __name__ == "__main__":
    unittest.main()
