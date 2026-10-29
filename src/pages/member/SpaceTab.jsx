import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, CheckCircle2, MapPin, Megaphone, Phone, Users, Vote } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "@/components/analyst/Card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCastVote, useCoopDirectory, useCoopSpace } from "@/lib/memberApi";
import { electionState, hasVoted } from "@/lib/memberRules";
import { formatDate, formatDateTime } from "@/lib/format";
import { CoopSwitcher, useChosenCoop } from "@/pages/member/CooperativesTab";

const TONE = { open: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]", upcoming: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]", closed: "border-hairline bg-canvas text-sub" };

// Light on data: one query bundle, no images, short lists.
export default function SpaceTab({ member }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const { list, current, setChosen } = useChosenCoop(member.id);
  const coop = current?.cooperatives;
  const { data: space, isLoading } = useCoopSpace(coop?.id, member.id);
  const { data: people = [] } = useCoopDirectory(coop?.id);
  const cast = useCastVote(coop?.id, member.id);
  const [pick, setPick] = useState(null);
  const [error, setError] = useState("");

  if (!current) return <p className="rounded-lg border border-dashed border-hairline bg-white px-4 py-8 text-center text-[12.5px] text-sub">{t("member.coops.none")}</p>;
  if (isLoading || !space) return <p className="py-8 text-center text-[12.5px] text-sub">{t("common.loading")}</p>;

  const election = space.elections[0];
  const state = election ? electionState(election) : null;
  const voted = election ? hasVoted(space.votes, election.id) : false;
  const leaders = people.filter((person) => person.coop_role !== "member" && person.phone);

  const confirmVote = async () => {
    setError("");
    try { await cast.mutateAsync({ electionId: election.id, candidateId: pick.id }); setPick(null); } catch (err) { setError(err.message); setPick(null); }
  };

  return (
    <div className="mx-auto max-w-[640px]" data-tour="member-space">
      <CoopSwitcher list={list} current={current} onChange={setChosen} />
      <h2 className="mb-3 text-[18px] font-semibold tracking-tight text-ink">{coop.name}</h2>

      <Card title={t("member.space.voteTitle")} subtitle={election?.title} className="mb-4" tour="member-vote">
        {!election ? <p className="text-[12.5px] text-sub">{t("member.space.noElection")}</p> : (
          <>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${TONE[state]}`}>{t(`member.space.state.${state}`)}</span>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
              <div><dt className="flex items-center gap-1.5 text-[11px] text-sub"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{t("member.space.where")}</dt><dd className="font-medium text-ink">{election.venue}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-[11px] text-sub"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{t("member.space.when")}</dt><dd className="font-medium text-ink">{formatDateTime(election.starts_at, language)} → {formatDateTime(election.ends_at, language)}</dd></div>
            </dl>

            {voted ? (
              <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-[#ABEFC6] bg-[#ECFDF3] px-3 py-3 text-[13px] font-medium text-[#067647]"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{t("member.space.voted")}</p>
            ) : state === "open" ? (
              <div className="mt-4">
                <p className="mb-2 text-[12px] text-sub">{t("member.space.pick")}</p>
                <ul className="space-y-2">
                  {election.candidates.map((candidate) => (
                    <li key={candidate.id}>
                      <button type="button" onClick={() => setPick({ id: candidate.id, name: candidate.full_name })} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-hairline px-3 py-2.5 text-left text-[13px] font-medium text-ink hover:border-brand hover:bg-brand-soft">
                        {candidate.full_name}<Vote className="h-4 w-4 text-brand" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <p className="mt-4 text-[12.5px] text-sub">{t(`member.space.cannot.${state}`)}</p>}
            {error && <p role="alert" className="mt-3 text-[12px] text-[#B54708]">{error}</p>}
          </>
        )}
      </Card>

      <Card title={t("member.space.announcements")} className="mb-4" tour="member-announcements">
        {space.announcements.length === 0 ? <p className="text-[12px] text-sub">{t("member.space.none")}</p> : (
          <ul className="space-y-3">{space.announcements.map((item) => <li key={item.id}><p className="flex items-center gap-1.5 text-[13px] font-medium text-ink"><Megaphone className="h-3.5 w-3.5 text-brand" aria-hidden="true" />{item.title}</p><p className="text-[12px] text-sub">{item.body}</p><p className="text-[10.5px] text-[#8A94A6]">{formatDate(item.created_at, language)}</p></li>)}</ul>
        )}
      </Card>

      <Card title={t("member.space.meetings")} className="mb-4">
        {space.meetings.length === 0 ? <p className="text-[12px] text-sub">{t("member.space.none")}</p> : (
          <ul className="space-y-2">{space.meetings.map((item) => <li key={item.id} className="text-[12.5px]"><span className="font-medium text-ink">{item.title}</span><span className="block text-[11.5px] text-sub">{formatDateTime(item.starts_at, language)} · {item.venue}</span></li>)}</ul>
        )}
      </Card>

      <Card title={t("member.space.contacts")} className="mb-4">
        <ul className="space-y-2">{leaders.map((leader) => <li key={leader.member_id} className="flex items-center justify-between text-[12.5px]"><span className="text-ink">{leader.full_name}</span><a href={`tel:${leader.phone}`} className="inline-flex items-center gap-1 text-brand"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{leader.phone}</a></li>)}</ul>
      </Card>

      <Link to="/beneficiary?tab=cooperatives" className="flex items-center justify-center gap-2 rounded-lg border border-hairline bg-white px-3 py-3 text-[13px] font-medium text-brand hover:bg-brand-soft"><Users className="h-4 w-4" aria-hidden="true" />{t("member.space.memberList")}</Link>

      <AlertDialog open={Boolean(pick)} onOpenChange={(open) => { if (!open) setPick(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("member.space.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("member.space.confirmText", { name: pick?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVote} disabled={cast.isPending}>{t("member.space.confirmVote")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
