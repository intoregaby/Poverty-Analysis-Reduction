// Pure rules for the Program Member pages, kept apart from React so they are easy to test.

export function electionState(election, now = new Date()) {
  const start = new Date(election.starts_at);
  const end = new Date(election.ends_at);
  if (now < start) return "upcoming";
  if (now > end) return "closed";
  return "open";
}

// One vote per member per election: `votes` holds only the signed-in member's own votes.
export const hasVoted = (votes, electionId) => votes.some((vote) => vote.election_id === electionId);

export function insuranceSummary(row, now = new Date()) {
  if (!row) return null;
  const due = Number(row.amount_due);
  const paid = Number(row.amount_paid);
  const balance = Math.max(0, due - paid);
  const status = balance === 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
  const end = new Date(row.period_end);
  const daysLeft = Math.ceil((end - now) / 86400000);
  return { due, paid, balance, status, periodStart: row.period_start, periodEnd: row.period_end, daysLeft, overdue: balance > 0 && daysLeft < 0 };
}

// Annual amount for a household: the rate of the member's category times the people in the household.
export function amountForHousehold(category, householdSize, rates) {
  const rate = rates.find((item) => item.category === category);
  return rate ? rate.annual_per_person * Math.max(1, householdSize) : null;
}

export const nextVisit = (visits, now = new Date()) =>
  visits.filter((visit) => visit.status === "Scheduled" && new Date(visit.scheduled_at) >= now).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0] || null;

export const maskPhone = (phone) => (phone ? `${phone.slice(0, 4)}•••${phone.slice(-3)}` : "");
