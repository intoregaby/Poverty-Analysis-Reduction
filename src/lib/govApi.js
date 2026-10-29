import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useDatabaseSession } from "@/lib/memberApi";

// Reads for the Government and Programme panels. The database decides what each person may see: a district user gets
// their district, a sector user their sector, a programme owner their programme. Nothing here filters by role.
const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const need = () => { if (!supabase) throw new Error("The database is not configured."); return supabase; };

export const useGovMembers = () => {
  const { data: signedIn } = useDatabaseSession();
  return useQuery({
    queryKey: ["gov-members"], enabled: Boolean(signedIn),
    queryFn: async () => unwrap(await need().from("members").select("id, code, full_name, district, sector, cell, status, programme, category, household_size, insurance_status(amount_due, amount_paid, period_start, period_end)").order("full_name")),
  });
};

export const useMember360 = (id) => useQuery({
  queryKey: ["member-360", id], enabled: Boolean(id),
  queryFn: async () => {
    const db = need();
    const [member, agent, coops] = await Promise.all([
      db.from("members").select("*, family_members(*), member_services(*), insurance_status(*)").eq("id", id).single(),
      db.from("agent_assignments").select("proximity, assigned_at, agents(full_name, phone)").eq("member_id", id).eq("is_current", true).maybeSingle(),
      db.from("cooperative_memberships").select("coop_role, cooperatives(name, sector)").eq("member_id", id),
    ]);
    return { member: unwrap(member), agent: unwrap(agent), coops: unwrap(coops) };
  },
});

// The static cooperative list and the database share names, so leaders are looked up by name and district.
export const useCoopLeadersByName = (name, district) => useQuery({
  queryKey: ["coop-leaders", name, district], enabled: Boolean(name && district && supabase),
  queryFn: async () => {
    const db = need();
    const coop = unwrap(await db.from("cooperatives").select("id").eq("name", name).eq("district", district).maybeSingle());
    if (!coop) return null;
    const people = unwrap(await db.rpc("coop_directory", { p_coop: coop.id }));
    return people.filter((person) => person.coop_role !== "member");
  },
});

// Agent 360: the agent, when they joined (from the application), the application status and its history.
export const useAgent360 = (code) => {
  const { data: signedIn } = useDatabaseSession();
  return useQuery({
    queryKey: ["agent-360", code], enabled: Boolean(code && signedIn),
    queryFn: async () => {
      const db = need();
      const agent = unwrap(await db.from("agents").select("*, agent_applications(*)").eq("code", code).maybeSingle());
      if (!agent) return null;
      const [{ count }, visits] = await Promise.all([
        db.from("agent_assignments").select("id", { count: "exact", head: true }).eq("agent_id", agent.id).eq("is_current", true),
        db.from("visits").select("status").eq("agent_id", agent.id),
      ]);
      return { agent, application: agent.agent_applications[0] || null, members: count ?? 0, visits: unwrap(visits) };
    },
  });
};
