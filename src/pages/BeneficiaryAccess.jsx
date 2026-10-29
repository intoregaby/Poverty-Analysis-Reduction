import React, { useState } from "react";
import { CalendarDays, Wallet, CheckCircle2, MessageSquare } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/analyst/Card";
import PanelGuide from "@/components/analyst/PanelGuide";

const PROGRAMMES = [
  { name: "VUP Direct Support", status: "Active", since: "Jan 2022", next: "5 Nov" },
  { name: "Girinka Munyarwanda", status: "Active", since: "Mar 2021", next: "—" },
];

const HISTORY = [
  { date: "5 Oct", amount: "RWF 12,500", status: "Paid" },
  { date: "5 Sep", amount: "RWF 12,500", status: "Paid" },
  { date: "5 Aug", amount: "RWF 12,500", status: "Paid" },
];

export default function BeneficiaryAccess({ embedded = false }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="pb-14">
      {!embedded && <PageHeader
        title="My Benefits"
        badge={
          <span className="hidden items-center gap-1.5 rounded-full border border-hairline px-2 py-[3px] text-[11px] text-sub sm:inline-flex">
            Mukasine Beatrice
          </span>
        }
      />}

      <PanelGuide id="program member-access" title="My Benefits">
        This page shows your payments, enrolled programmes and support. Use it to check when your
        next payment is due and to send a complaint if something is wrong.
      </PanelGuide>

      <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4">
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">Your Benefits</h2>
          <p className="mt-0.5 text-[12px] text-sub">Check your payments and programmes</p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card tour="me-payment" title="Next payment" subtitle="VUP Direct Support" className="xl:col-span-2">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] text-sub"><CalendarDays className="h-3.5 w-3.5" /> Date</p>
                <p className="mt-1 text-[18px] font-semibold text-ink">5 Nov 2024</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] text-sub"><Wallet className="h-3.5 w-3.5" /> Amount</p>
                <p className="mt-1 text-[18px] font-semibold text-ink">RWF 12,500</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] text-sub"><CheckCircle2 className="h-3.5 w-3.5" /> Status</p>
                <p className="mt-1 text-[18px] font-semibold text-pos">Scheduled</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-1.5 text-[11px] font-medium text-sub">Payment history</p>
              <ul className="divide-y divide-hairline/70">
                {HISTORY.map((h) => (
                  <li key={h.date} className="flex items-center justify-between py-1.5">
                    <span className="text-[12px] text-ink">{h.date}</span>
                    <span className="text-[12px] tabular-nums text-sub">{h.amount}</span>
                    <span className="inline-flex rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-2 py-[2px] text-[10px] font-medium text-[#067647]">{h.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card tour="me-programmes" title="Your programmes" subtitle="Enrolled">
            <ul className="space-y-3">
              {PROGRAMMES.map((p) => (
                <li key={p.name} className="rounded-lg border border-hairline px-3 py-2.5">
                  <p className="text-[12.5px] font-medium text-ink">{p.name}</p>
                  <p className="text-[10.5px] text-sub">Since {p.since} · next {p.next}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card tour="me-complaint" title="Submit a complaint" subtitle="We reply within 5 working days" className="mt-4">
          {sent ? (
            <div className="rounded-lg border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 text-[12px] text-[#067647]">
              Your complaint was received. A field agent will contact you.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="space-y-3"
            >
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                required
                className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue"
                required
                rows={4}
                className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand"
              />
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand/90">
                <MessageSquare className="h-4 w-4" /> Send
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}