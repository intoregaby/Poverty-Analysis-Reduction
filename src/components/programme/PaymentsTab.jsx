import React, { useState } from "react";
import { Send } from "lucide-react";
import Card from "@/components/analyst/Card";
import { useProgrammeScope } from "@/lib/programmeScope";

export default function PaymentsTab() {
  const { payments: PAYMENTS, beneficiaries: BENEFICIARIES } = useProgrammeScope();
  const [ben, setBen] = useState("");
  const [amount, setAmount] = useState("");
  const [programme, setProgramme] = useState("VUP Direct Support");
  const [channel, setChannel] = useState("Mobile Money");
  const [sent, setSent] = useState(false);

  const total = PAYMENTS.reduce((s, p) => s + (p.status === "Delivered" ? p.amount : 0), 0);
  const failed = PAYMENTS.filter((p) => p.status === "Failed").length;
  const pending = PAYMENTS.filter((p) => p.status === "Pending").length;

  const handleSend = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setBen(""); setAmount("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-hairline bg-white px-4 py-3.5">
          <p className="text-[11px] text-[#8A94A6]">Delivered, Oct</p>
          <p className="mt-1 text-[20px] font-semibold text-ink tabular-nums">RWF {total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-hairline bg-white px-4 py-3.5">
          <p className="text-[11px] text-[#8A94A6]">Failed</p>
          <p className="mt-1 text-[20px] font-semibold text-[#B42318] tabular-nums">{failed}</p>
        </div>
        <div className="rounded-xl border border-hairline bg-white px-4 py-3.5">
          <p className="text-[11px] text-[#8A94A6]">Pending</p>
          <p className="mt-1 text-[20px] font-semibold text-[#B54708] tabular-nums">{pending}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Send cash to member" subtitle="Instant transfer" className="lg:col-span-1">
          {sent ? (
            <div className="rounded-lg border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 text-[12px] text-[#067647]">
              Payment sent successfully. The member will receive a confirmation.
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-sub">Program Member</label>
                <select value={ben} onChange={(e) => setBen(e.target.value)} required className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand">
                  <option value="">Select program member…</option>
                  {BENEFICIARIES.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.district}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-sub">Amount (RWF)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="12500" className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-sub">Programme</label>
                <select value={programme} onChange={(e) => setProgramme(e.target.value)} className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand">
                  <option>VUP Direct Support</option>
                  <option>Girinka Munyarwanda</option>
                  <option>Expanded Public Works</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-sub">Channel</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full rounded-md border border-hairline px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand">
                  <option>Mobile Money</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-[12px] font-medium text-white hover:bg-brand/90">
                <Send className="h-4 w-4" /> Send payment
              </button>
            </form>
          )}
        </Card>

        <Card title="Payment history" subtitle="Recent transactions" className="lg:col-span-2" bodyClassName="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-[12px]">
              <thead>
                <tr className="border-y border-hairline bg-[#FAFBFD] text-[10px] uppercase tracking-[0.06em] text-[#8A94A6]">
                  <th className="py-2 pl-5 pr-3 text-left font-medium">ID</th>
                  <th className="px-3 py-2 text-left font-medium">Program Member</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Channel</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="py-2 pl-3 pr-5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {PAYMENTS.map((p) => (
                  <tr key={p.id} className="border-b border-hairline/70 last:border-0 hover:bg-[#FAFBFD]">
                    <td className="py-2 pl-5 pr-3 font-medium text-sub">{p.id}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-ink">{p.beneficiary}</p>
                      <p className="text-[10px] text-sub">{p.district}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-ink">RWF {p.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-sub">{p.channel}</td>
                    <td className="px-3 py-2 text-sub">{p.date}</td>
                    <td className="py-2 pl-3 pr-5 text-right">
                      <span className={`inline-flex rounded-full border px-2 py-[2px] text-[10px] font-medium ${
                        p.status === "Delivered" ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]" :
                        p.status === "Pending" ? "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]" :
                        "border-[#FEE4E2] bg-[#FEF3F2] text-[#B42318]"
                      }`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}