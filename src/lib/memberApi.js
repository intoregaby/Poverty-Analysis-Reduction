import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

// Every call here goes to the database as the signed-in person. What comes back is already limited by row level
// security, so these functions never filter for permissions themselves.
const need = () => { if (!supabase) throw new Error("The database is not configured."); return supabase; };
const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

async function currentSession() {
  const { data } = await need().auth.getSession();
  return data.session;
}

export function useDatabaseSession() {
  return useQuery({ queryKey: ["session"], queryFn: async () => Boolean(await currentSession()), staleTime: 30_000 });
}

export async function fetchMe() {
  const db = need();
  const session = await currentSession();
  if (!session) return null;
  const profile = unwrap(await db.from("profiles").select("*").eq("id", session.user.id).single());
  if (!profile.member_id) return { profile, member: null };
  const member = unwrap(await db.from("members").select("*, family_members(*), member_services(*)").eq("id", profile.member_id).single());
  return { profile, member };
}
export const useMe = () => useQuery({ queryKey: ["me"], queryFn: fetchMe });

export const useMyCooperatives = (memberId) => useQuery({
  queryKey: ["my-coops", memberId], enabled: Boolean(memberId),
  queryFn: async () => unwrap(await need().from("cooperative_memberships").select("coop_role, since, cooperatives(*)").eq("member_id", memberId).order("since")),
});

export const useCoopDirectory = (coopId) => useQuery({
  queryKey: ["coop-directory", coopId], enabled: Boolean(coopId),
  queryFn: async () => unwrap(await need().rpc("coop_directory", { p_coop: coopId })),
});

export const useCoopSpace = (coopId, memberId) => useQuery({
  queryKey: ["coop-space", coopId, memberId], enabled: Boolean(coopId && memberId),
  queryFn: async () => {
    const db = need();
    const [elections, announcements, meetings, votes] = await Promise.all([
      db.from("elections").select("*").eq("cooperative_id", coopId).order("starts_at", { ascending: false }),
      db.from("announcements").select("*").eq("cooperative_id", coopId).order("created_at", { ascending: false }).limit(5),
      db.from("meetings").select("*").eq("cooperative_id", coopId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
      db.from("votes").select("election_id, cast_at"),
    ]);
    const list = unwrap(elections);
    // Candidate names come from a function, because a member may not read other members' full records.
    const candidates = list[0] ? unwrap(await db.rpc("election_candidates", { p_election: list[0].id })) : [];
    return { elections: list.map((item, index) => (index === 0 ? { ...item, candidates } : { ...item, candidates: [] })), announcements: unwrap(announcements), meetings: unwrap(meetings), votes: unwrap(votes) };
  },
});

export function useCastVote(coopId, memberId) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ electionId, candidateId }) => unwrap(await need().rpc("cast_vote", { p_election: electionId, p_candidate: candidateId })),
    onSuccess: () => client.invalidateQueries({ queryKey: ["coop-space", coopId, memberId] }),
  });
}

export const useMyAgent = (memberId) => useQuery({
  queryKey: ["my-agent", memberId], enabled: Boolean(memberId),
  queryFn: async () => {
    const db = need();
    const [assignments, visits] = await Promise.all([
      db.from("agent_assignments").select("*, agents(full_name, phone, photo_url, district, sectors, cells)").eq("member_id", memberId).order("assigned_at", { ascending: false }),
      db.from("visits").select("*").eq("member_id", memberId).neq("status", "Cancelled").order("scheduled_at"),
    ]);
    return { assignments: unwrap(assignments), visits: unwrap(visits) };
  },
});

export const useMyInsurance = (memberId) => useQuery({
  queryKey: ["my-insurance", memberId], enabled: Boolean(memberId),
  queryFn: async () => {
    const db = need();
    const [status, rates] = await Promise.all([
      db.from("insurance_status").select("*").eq("member_id", memberId).order("period_start", { ascending: false }),
      db.from("insurance_rates").select("*"),
    ]);
    return { status: unwrap(status), rates: unwrap(rates) };
  },
});

export const useMyNotifications = (memberId) => useQuery({
  queryKey: ["my-notifications", memberId], enabled: Boolean(memberId),
  queryFn: async () => unwrap(await need().from("notifications").select("*").eq("member_id", memberId).order("created_at", { ascending: false }).limit(5)),
});
