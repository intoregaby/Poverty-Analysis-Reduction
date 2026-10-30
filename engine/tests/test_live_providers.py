"""Live provider evidence. Only a trivial public prompt is ever sent (no project data). Keys are read from
.env.local at run time, never printed. Tests are skipped (-> scenario BLOCKED) when a key is absent."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402
from ireme import gateway as gw  # noqa: E402
from ireme.gateway_http import http_transport  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "implementation" / "evidence" / "live_providers.json"


def load_env():
    env = {}
    f = ROOT / ".env.local"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env()
SCHEMA = {"type": "object", "required": ["ok"], "properties": {"ok": {"type": "boolean"}}, "additionalProperties": False}
MSG = [{"role": "system", "content": "Reply with JSON only."},
       {"role": "user", "content": 'Return exactly this JSON object: {"ok": true}'}]
evidence = {}


@unittest.skipUnless(ENV.get("GROQ_API_KEY") and ENV.get("NVIDIA_API_KEY"), "Groq and NVIDIA keys not configured")
class Live(unittest.TestCase):
    def gateway(self, transport=http_transport):
        provs = {k: v for k, v in gw.default_providers().items() if k in ("groq", "nvidia")}
        return gw.Gateway(provs, transport, dict(ENV))

    @acceptance("AI-16", evidence="real")
    def test_live_capability_probe_for_structured_output_each_provider(self):
        for name in ("groq", "nvidia"):
            g = self.gateway()
            g.providers = {name: g.providers[name]}
            try:
                out = g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
            except gw.GatewayExhausted as e:
                evidence[f"{name}_json_schema_probe"] = {"unavailable": [a["outcome"] for a in e.attempts]}
                self.skipTest(f"{name} unavailable at test time: {[a['outcome'] for a in e.attempts]}")
            self.assertEqual(out["result"], {"ok": True})
            evidence[f"{name}_json_schema_probe"] = {"model": out["audit"]["model"], "ok": True}

    @acceptance("AI-13", evidence="real")
    def test_live_unavailable_primary_model_fails_over_to_real_second_provider(self):
        def t(p, url, req, key):
            if p.name == "groq":
                return http_transport(p, url, req, key, model="no-such-model-ireme-probe")   # real 404 from Groq
            return http_transport(p, url, req, key)
        g = self.gateway(t)
        g.benchmark[("structured_analysis", "groq")] = 1.0     # force Groq first
        try:
            out = g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        except gw.GatewayExhausted as e:
            evidence["failover"] = {"unavailable": e.attempts}
            self.skipTest(f"second provider unavailable at test time: {e.attempts}")
        self.assertEqual(out["result"], {"ok": True})
        outcomes = [a["outcome"] for a in out["audit"]["attempts"]]
        self.assertTrue(outcomes[0].startswith("fatal:"), outcomes)
        # Failover must leave the failed credential. With several authorized Groq keys configured the
        # next Groq credential is tried before NVIDIA (keys are tried in order within a provider), so
        # the real answer comes from either a secondary Groq key or the next provider.
        self.assertNotEqual(out["audit"]["provider"], "groq")
        self.assertIn(out["audit"]["provider"], {"nvidia", *[f"groq#{i}" for i in range(2, 10)]},
                      out["audit"]["provider"])
        evidence["failover"] = {"attempts": out["audit"]["attempts"]}
        blob = json.dumps(g.audit) + json.dumps(evidence)
        for value in ENV.values():
            if value.startswith(("gsk_", "nvapi-")) and len(value) > 8:
                self.assertNotIn(value, blob)

    @acceptance("AI-15", evidence="real")
    def test_live_error_paths_do_not_echo_keys(self):
        def t(p, url, req, key):
            return http_transport(p, url, req, key, model="no-such-model-ireme-probe")
        g = self.gateway(t)
        with self.assertRaises(gw.GatewayExhausted) as cm:
            g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        blob = json.dumps(cm.exception.attempts)
        self.assertNotIn(ENV["GROQ_API_KEY"], blob)
        self.assertNotIn(ENV["NVIDIA_API_KEY"], blob)

    @acceptance("AI-12", evidence="real")
    def test_live_rejected_key_fails_over_to_the_configured_second_key(self):
        """Real 401 from a bad credential, then a real answer from the second configured key."""
        if not ENV.get("GROQ_API_KEY"):
            self.skipTest("Groq key not configured")
        env = {"GROQ_API_KEY": "gsk_" + "0" * 52, "GROQ_API_KEY_2": ENV["GROQ_API_KEY"]}
        g = gw.Gateway({"groq": gw.default_providers()["groq"]}, http_transport, env)
        try:
            out = g.complete(gw.Request("structured_analysis", MSG, schema=SCHEMA))
        except gw.GatewayExhausted as e:
            evidence["invalid_key_failover"] = {"unavailable": e.attempts}
            self.skipTest(f"live failover unavailable: {e.attempts}")
        attempts = out["audit"]["attempts"]
        self.assertTrue(attempts[0]["outcome"].startswith("fatal:"), attempts)
        self.assertEqual(out["audit"]["provider"], "groq#2")
        self.assertEqual(out["result"], {"ok": True})
        evidence["invalid_key_failover"] = {"attempts": attempts}
        blob = json.dumps(g.audit) + json.dumps(evidence)
        self.assertNotIn(ENV["GROQ_API_KEY"], blob)

    @acceptance("AI-14", evidence="real")
    def test_live_local_only_never_calls_a_remote_provider(self):
        """Real local Ollama answer while every cloud provider is configured; only loopback is used."""
        called = []

        def t(p, url, req, key):
            called.append(p.name)
            return http_transport(p, url, req, key)

        g = gw.Gateway(gw.default_providers(), t, dict(ENV))
        try:
            out = g.complete(gw.Request("structured_analysis", MSG, local_only=True))
        except gw.GatewayExhausted as e:
            evidence["local_only"] = {"unavailable": e.attempts}
            self.skipTest(f"local Ollama unavailable: {e.attempts}")
        except gw.PolicyDenied as e:
            evidence["local_only"] = {"denied": str(e)}
            self.skipTest(f"local provider not eligible: {e}")
        self.assertEqual(called, ["ollama_local"])
        self.assertEqual(out["audit"]["provider"], "ollama_local")
        self.assertTrue(isinstance(out["result"], str) and out["result"].strip())
        evidence["local_only"] = {"model": out["audit"]["model"], "provider": out["audit"]["provider"]}

    @classmethod
    def tearDownClass(cls):
        if evidence:
            OUT.write_text(json.dumps(evidence, indent=1, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
