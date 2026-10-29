// Programme operational data — 360 agents, 360 beneficiaries, jobs, cooperatives, skills, awards

// ── Featured detailed records (rich profiles) ──────────────────────────────
const AGENTS_FEATURED = [
  { id: "AG-001", name: "Nshuti Patrick", district: "Nyaruguru", phone: "+250 788 310 445", beneficiaries: 47, rating: 4.8, status: "Active", joined: "Jan 2022", wards: ["Rusenge", "Kibingo"], skillsTaught: ["Tailoring", "Masonry"], visits: 8 },
  { id: "AG-002", name: "Keza Aline", district: "Nyamagabe", phone: "+250 788 220 118", beneficiaries: 39, rating: 4.6, status: "Active", joined: "Mar 2022", wards: ["Mata", "Kivu"], skillsTaught: ["Hairdressing", "Beekeeping"], visits: 6 },
  { id: "AG-003", name: "Mugisha Eric", district: "Gisagara", phone: "+250 788 505 772", beneficiaries: 31, rating: 4.9, status: "Active", joined: "Feb 2021", wards: ["Gitanga"], skillsTaught: ["Carpentry", "Tailoring"], visits: 5 },
  { id: "AG-004", name: "Uwase Diane", district: "Nyanza", phone: "+250 788 661 209", beneficiaries: 42, rating: 4.4, status: "Active", joined: "Jul 2022", wards: ["Rwabicuma"], skillsTaught: ["Soap-making", "Knitting"], visits: 7 },
  { id: "AG-005", name: "Habimana Jean", district: "Ruhango", phone: "+250 788 770 334", beneficiaries: 28, rating: 4.2, status: "On leave", joined: "Sep 2021", wards: ["Mbuye"], skillsTaught: ["Masonry"], visits: 0 },
  { id: "AG-006", name: "Mukamana Claire", district: "Muhanga", phone: "+250 788 412 889", beneficiaries: 35, rating: 4.7, status: "Active", joined: "Nov 2021", wards: ["Shyogwe"], skillsTaught: ["Tailoring", "Embroidery"], visits: 6 },
  { id: "AG-007", name: "Iradukunda Alex", district: "Kamonyi", phone: "+250 788 903 551", beneficiaries: 33, rating: 4.5, status: "Active", joined: "Apr 2022", wards: ["Rugalika"], skillsTaught: ["Carpentry", "Welding"], visits: 4 },
  { id: "AG-008", name: "Ingabire Grace", district: "Nyaruguru", phone: "+250 788 114 660", beneficiaries: 41, rating: 4.8, status: "Active", joined: "Jan 2022", wards: ["Cyahinda"], skillsTaught: ["Beekeeping", "Farming"], visits: 9 },
  { id: "AG-009", name: "Twizeyimana Eric", district: "Nyamagabe", phone: "+250 788 332 007", beneficiaries: 30, rating: 4.3, status: "Active", joined: "Aug 2022", wards: ["Uwinkingi"], skillsTaught: ["Masonry", "Plumbing"], visits: 5 },
  { id: "AG-010", name: "Mukasine Beatrice", district: "Gisagara", phone: "+250 788 556 198", beneficiaries: 36, rating: 4.6, status: "Active", joined: "May 2022", wards: ["Muganza"], skillsTaught: ["Soap-making"], visits: 6 },
  { id: "AG-011", name: "Nshimiyimana David", district: "Nyanza", phone: "+250 788 779 420", beneficiaries: 38, rating: 4.5, status: "Active", joined: "Oct 2021", wards: ["Nyagisozi"], skillsTaught: ["Tailoring", "Knitting"], visits: 7 },
  { id: "AG-012", name: "Nyiraneza Solange", district: "Muhanga", phone: "+250 788 228 913", beneficiaries: 34, rating: 4.7, status: "Active", joined: "Mar 2022", wards: ["Cyeza"], skillsTaught: ["Hairdressing", "Embroidery"], visits: 5 },
];

const BENEFICIARIES_FEATURED = [
  {
    id: "BN-001", name: "Mukasine Beatrice", district: "Nyaruguru", sector: "Kibingo", cell: "Rusenge",
    age: 34, familySize: 5, status: "Active", cooperative: "Twiyubake Cooperative", monthlyPayment: 12500, agent: "Nshuti Patrick",
    health: { status: "Paid", scheme: "Mutuelle de Santé", expires: "Dec 2024", cardNo: "MS-2024-88431" },
    skills: [{ name: "Tailoring", level: "Intermediate", progress: 65, agent: "Nshuti Patrick" }, { name: "Knitting", level: "Beginner", progress: 30, agent: "Nshuti Patrick" }],
    family: [
      { name: "Habimana Jean", relation: "Husband", age: 38, skills: ["Masonry", "Driving", "Plumbing"] },
      { name: "Kabera Eric", relation: "Son", age: 17, skills: ["Computer literacy", "Farming"] },
      { name: "Iradukunda Aline", relation: "Daughter", age: 14, skills: ["Tailoring"] },
    ],
    tasks: [
      { title: "Complete tailoring module 3", status: "In progress", due: "10 Nov", agent: "Nshuti Patrick" },
      { title: "Submit cooperative monthly report", status: "Pending", due: "5 Nov", agent: "Nshuti Patrick" },
      { title: "Attend skills assessment", status: "Done", due: "28 Oct", agent: "Nshuti Patrick" },
    ],
    awards: [{ skill: "Tailoring", date: "Sep 2024", type: "Certificate of completion", agent: "Nshuti Patrick" }],
  },
  {
    id: "BN-002", name: "Habimana Jean", district: "Nyaruguru", sector: "Kibingo", cell: "Kibingo",
    age: 38, familySize: 5, status: "Active", cooperative: "Twiyubake Cooperative", monthlyPayment: 12500, agent: "Nshuti Patrick",
    health: { status: "Paid", scheme: "Mutuelle de Santé", expires: "Dec 2024", cardNo: "MS-2024-88432" },
    skills: [{ name: "Masonry", level: "Advanced", progress: 90, agent: "Nshuti Patrick" }, { name: "Plumbing", level: "Intermediate", progress: 55, agent: "Nshuti Patrick" }],
    family: [
      { name: "Mukasine Beatrice", relation: "Wife", age: 34, skills: ["Tailoring", "Knitting"] },
      { name: "Kabera Eric", relation: "Son", age: 17, skills: ["Computer literacy", "Farming"] },
    ],
    tasks: [
      { title: "Masonry certification exam", status: "Pending", due: "12 Nov", agent: "Nshuti Patrick" },
      { title: "Lead cooperative construction project", status: "In progress", due: "20 Nov", agent: "Nshuti Patrick" },
    ],
    awards: [{ skill: "Masonry", date: "Aug 2024", type: "Best mason — Sector award", agent: "Nshuti Patrick" }],
  },
  {
    id: "BN-003", name: "Uwase Diane", district: "Nyanza", sector: "Rwabicuma", cell: "Cyiza",
    age: 29, familySize: 3, status: "Pending", cooperative: null, monthlyPayment: 0, agent: "Uwase Diane",
    health: { status: "Unpaid", scheme: "Mutuelle de Santé", expires: "Expired Oct 2024", cardNo: "MS-2024-77120" },
    skills: [{ name: "Hairdressing", level: "Beginner", progress: 20, agent: "Uwase Diane" }],
    family: [
      { name: "Mugisha Eric", relation: "Husband", age: 32, skills: ["Carpentry", "Welding"] },
      { name: "Tuyisenge Aline", relation: "Daughter", age: 8, skills: [] },
    ],
    tasks: [
      { title: "Enrol in Mutuelle de Santé", status: "Pending", due: "5 Nov", agent: "Uwase Diane" },
      { title: "Begin hairdressing training", status: "Pending", due: "8 Nov", agent: "Uwase Diane" },
    ],
    awards: [],
  },
  {
    id: "BN-004", name: "Nshuti Patrick", district: "Nyamagabe", sector: "Mata", cell: "Mata",
    age: 41, familySize: 6, status: "Active", cooperative: "Dukorane Cooperative", monthlyPayment: 12500, agent: "Keza Aline",
    health: { status: "Paid", scheme: "Mutuelle de Santé", expires: "Dec 2024", cardNo: "MS-2024-66204" },
    skills: [{ name: "Beekeeping", level: "Advanced", progress: 85, agent: "Keza Aline" }, { name: "Farming", level: "Advanced", progress: 95, agent: "Keza Aline" }],
    family: [
      { name: "Ingabire Grace", relation: "Wife", age: 38, skills: ["Beekeeping", "Tailoring"] },
      { name: "Mugisha Eric", relation: "Son", age: 19, skills: ["Driving", "Welding"] },
      { name: "Keza Aline", relation: "Daughter", age: 16, skills: ["Tailoring"] },
    ],
    tasks: [
      { title: "Harvest honey — 20 hives", status: "In progress", due: "15 Nov", agent: "Keza Aline" },
      { title: "Deliver honey to cooperative store", status: "Pending", due: "18 Nov", agent: "Keza Aline" },
    ],
    awards: [{ skill: "Beekeeping", date: "Jul 2024", type: "Top producer — District award", agent: "Keza Aline" }],
  },
  {
    id: "BN-005", name: "Mukamana Claire", district: "Gisagara", sector: "Gitanga", cell: "Gitanga",
    age: 45, familySize: 4, status: "Suspended", cooperative: null, monthlyPayment: 0, agent: "Mugisha Eric",
    health: { status: "Expiring", scheme: "Mutuelle de Santé", expires: "30 Nov 2024", cardNo: "MS-2024-55983" },
    skills: [{ name: "Carpentry", level: "Intermediate", progress: 50, agent: "Mugisha Eric" }],
    family: [
      { name: "Twizeyimana Eric", relation: "Husband", age: 48, skills: ["Carpentry", "Farming"] },
      { name: "Uwase Diane", relation: "Daughter", age: 20, skills: ["Hairdressing"] },
    ],
    tasks: [
      { title: "Resolve suspension — field visit", status: "Pending", due: "6 Nov", agent: "Mugisha Eric" },
      { title: "Renew Mutuelle de Santé", status: "Pending", due: "25 Nov", agent: "Mugisha Eric" },
    ],
    awards: [],
  },
  {
    id: "BN-006", name: "Ingabire Grace", district: "Muhanga", sector: "Shyogwe", cell: "Shyogwe",
    age: 31, familySize: 3, status: "Active", cooperative: "Turengere Abana", monthlyPayment: 12500, agent: "Mukamana Claire",
    health: { status: "Paid", scheme: "Mutuelle de Santé", expires: "Dec 2024", cardNo: "MS-2024-44710" },
    skills: [{ name: "Tailoring", level: "Advanced", progress: 88, agent: "Mukamana Claire" }, { name: "Embroidery", level: "Intermediate", progress: 60, agent: "Mukamana Claire" }],
    family: [
      { name: "Nshimiyimana David", relation: "Husband", age: 34, skills: ["Welding", "Driving"] },
      { name: "Tuyisenge Aline", relation: "Son", age: 10, skills: [] },
    ],
    tasks: [
      { title: "Complete embroidery portfolio", status: "In progress", due: "14 Nov", agent: "Mukamana Claire" },
      { title: "Mentor 2 new cooperative members", status: "In progress", due: "20 Nov", agent: "Mukamana Claire" },
    ],
    awards: [{ skill: "Tailoring", date: "Oct 2024", type: "Master tailor — Sector award", agent: "Mukamana Claire" }],
  },
  {
    id: "BN-007", name: "Twizeyimana Eric", district: "Kamonyi", sector: "Rugalika", cell: "Rugalika",
    age: 27, familySize: 2, status: "Active", cooperative: "Dukorane Cooperative", monthlyPayment: 12500, agent: "Iradukunda Alex",
    health: { status: "Paid", scheme: "Mutuelle de Santé", expires: "Dec 2024", cardNo: "MS-2024-33187" },
    skills: [{ name: "Welding", level: "Intermediate", progress: 70, agent: "Iradukunda Alex" }, { name: "Carpentry", level: "Advanced", progress: 82, agent: "Iradukunda Alex" }],
    family: [
      { name: "Nyiraneza Solange", relation: "Wife", age: 25, skills: ["Hairdressing", "Knitting"] },
    ],
    tasks: [
      { title: "Welding certification — practical exam", status: "Pending", due: "11 Nov", agent: "Iradukunda Alex" },
      { title: "Deliver furniture order — 12 chairs", status: "In progress", due: "16 Nov", agent: "Iradukunda Alex" },
    ],
    awards: [],
  },
  {
    id: "BN-008", name: "Nyiraneza Solange", district: "Nyanza", sector: "Nyagisozi", cell: "Kabuye",
    age: 36, familySize: 5, status: "Active", cooperative: "Twiyubake Cooperative", monthlyPayment: 12500, agent: "Nshimiyimana David",
    health: { status: "Paid", scheme: "Mutuelle de Santé", expires: "Dec 2024", cardNo: "MS-2024-22501" },
    skills: [{ name: "Knitting", level: "Advanced", progress: 92, agent: "Nshimiyimana David" }, { name: "Tailoring", level: "Advanced", progress: 80, agent: "Nshimiyimana David" }],
    family: [
      { name: "Nshimiyimana David", relation: "Husband", age: 40, skills: ["Tailoring", "Masonry"] },
      { name: "Iradukunda Alex", relation: "Son", age: 18, skills: ["Computer literacy", "Farming"] },
      { name: "Mukasine Beatrice", relation: "Daughter", age: 12, skills: ["Knitting"] },
    ],
    tasks: [
      { title: "Train 3 new knitters in cooperative", status: "In progress", due: "19 Nov", agent: "Nshimiyimana David" },
      { title: "Supply school uniforms — 40 units", status: "Pending", due: "22 Nov", agent: "Nshimiyimana David" },
    ],
    awards: [{ skill: "Knitting", date: "Jun 2024", type: "Top earner — Cooperative award", agent: "Nshimiyimana David" }],
  },
  {
    id: "BN-009", name: "Kabera Eric", district: "Nyaruguru", sector: "Cyahinda", cell: "Akabuga",
    age: 22, familySize: 1, status: "Active", cooperative: "Abahinzi ba Kibingo", monthlyPayment: 10000, agent: "Ingabire Grace",
    health: { status: "Paid", scheme: "Mutuelle de Santé", expires: "Dec 2024", cardNo: "MS-2024-11944" },
    skills: [{ name: "Farming", level: "Intermediate", progress: 60, agent: "Ingabire Grace" }, { name: "Computer literacy", level: "Beginner", progress: 35, agent: "Ingabire Grace" }],
    family: [],
    tasks: [
      { title: "Complete digital literacy module 1", status: "In progress", due: "9 Nov", agent: "Ingabire Grace" },
      { title: "Apply for cooperative membership", status: "Done", due: "30 Oct", agent: "Ingabire Grace" },
    ],
    awards: [],
  },
  {
    id: "BN-010", name: "Iradukunda Aline", district: "Muhanga", sector: "Cyeza", cell: "Cyeza",
    age: 33, familySize: 4, status: "Active", cooperative: "Turengere Abana", monthlyPayment: 12500, agent: "Nyiraneza Solange",
    health: { status: "Expiring", scheme: "Mutuelle de Santé", expires: "15 Nov 2024", cardNo: "MS-2024-00628" },
    skills: [{ name: "Embroidery", level: "Intermediate", progress: 58, agent: "Nyiraneza Solange" }, { name: "Hairdressing", level: "Beginner", progress: 25, agent: "Nyiraneza Solange" }],
    family: [
      { name: "Mugisha Eric", relation: "Husband", age: 36, skills: ["Carpentry", "Plumbing"] },
      { name: "Keza Aline", relation: "Daughter", age: 9, skills: [] },
    ],
    tasks: [
      { title: "Renew Mutuelle de Santé — 4 members", status: "Pending", due: "15 Nov", agent: "Nyiraneza Solange" },
      { title: "Submit embroidery samples to cooperative", status: "In progress", due: "13 Nov", agent: "Nyiraneza Solange" },
    ],
    awards: [],
  },
];

// ── Name & location pools for generation ────────────────────────────────────
const FIRST_NAMES = ["Patrick","Jean","Eric","Aline","Diane","Claire","Grace","Alex","Beatrice","Solange","David","Kevin","Divine","Ines","Gael","Bertin","Cedric","Yannick","Olivier","Nadia","Laetitia","Brigitte","Chantal","Florence","Rosine","Claudine","Annette","Yvette","Marguerite","Gisele","Mireille","Nadine","Evelyne","Adeline","Pascaline","Berthe","Esperance","Felicite","Immaculee","Innocente","Julienne","Odette","Pelagie","Seraphine","Theresie","Vestine","Vitaline","Bernadette","Josiane","Lucie","Nathalie","Olga","Prisca","Rose","Sylvie","Veronique","Yolande","Cecile","Denise","Estelle","Genevieve","Helene","Irene","Jeanne","Kevine","Olive","Pauline","Sabine","Therese","Valerie","Celine","Delphine","Emmanuelle","Germaine","Henriette","Laurence","Noelle","Pierrette"];
const LAST_NAMES = ["Nshuti","Habimana","Mugisha","Uwase","Ingabire","Iradukunda","Mukamana","Twizeyimana","Mukasine","Nshimiyimana","Nyiraneza","Keza","Kabera","Tuyisenge","Umutoni","Gatete","Rwema","Mbanda","Shyiramera","Bizimana","Gakuba","Hakizimana","Kagame","Mugiraneza","Niyonzima","Rukundo","Sibomana","Uwamahoro","Nyirahabimana","Nishimwe","Mbabazi","Tuyisenge","Mukamazimpaka","Gashumba","Karangwa","Murekezi","Bizimana","Ndayishimiye","Uwimbabazi","Rwagatangabo"];
const DISTRICTS = ["Nyaruguru","Nyamagabe","Gisagara","Nyanza","Ruhango","Muhanga","Kamonyi"];
const SECTORS_BY_DISTRICT = {
  Nyaruguru: ["Kibingo","Rusenge","Cyahinda","Mata","Muganza","Ngera","Nyagisozi","Kivu","Busanze","Mata"],
  Nyamagabe: ["Mata","Kivu","Uwinkingi","Mukula","Kibumbwe","Tare","Gasaka","Kibirizi","Gatare","Nshili"],
  Gisagara: ["Gitanga","Muganza","Mugambwa","Kibirizi","Mamba","Mukinduri","Nyamure","Save","Gishubi","Ndora"],
  Nyanza: ["Rwabicuma","Nyagisozi","Cyiza","Kabuye","Busasamana","Mukingo","Ntyazo","Rwabusoro","Gisorora","Gisagara"],
  Ruhango: ["Mbuye","Bweramvune","Mwendo","Kinazi","Mpunzi","Musebeya","Rukumba","Ntongwe","Ruhango","Kinazi"],
  Muhanga: ["Shyogwe","Cyeza","Nyabinoni","Kabacuzi","Gitaramuka","Musebeya","Rugendabari","Kabagari","Muhanga","Muyira"],
  Kamonyi: ["Rugalika","Gacurabwenge","Runda","Karama","Kayenzi","Mugina","Nyarubaka","Rukomango","Kamonyi","Rugarika"],
};
const CELLS = ["Rusenge","Kibingo","Cyahinda","Mata","Muganza","Kabuye","Gitanga","Shyogwe","Cyeza","Rugalika","Nyamure","Gisorora","Mwendo","Rugendabari","Runda","Kayenzi","Musebeya","Kibirizi","Gasaka","Akabuga","Busanze","Tare","Mukinduri","Gishubi"];
const SKILLS_POOL = ["Tailoring","Masonry","Carpentry","Beekeeping","Hairdressing","Welding","Soap-making","Knitting","Embroidery","Farming","Computer literacy","Plumbing"];
const SKILL_LEVELS = ["Beginner","Intermediate","Advanced"];
const RELATIONS = ["Husband","Wife","Son","Daughter","Father","Mother","Brother","Sister"];
const JOINED = ["Jan 2022","Mar 2022","Feb 2021","Jul 2022","Sep 2021","Nov 2021","Apr 2022","Aug 2022","Oct 2021","May 2022","Jun 2022","Dec 2021","Jan 2023","Feb 2023"];
const TASK_TITLES = ["Complete training module","Submit cooperative report","Attend skills assessment","Renew Mutuelle de Santé","Deliver products to cooperative store","Mentor new cooperative members","Practical certification exam","Field visit — home assessment","Submit production samples","Attend cooperative meeting","Begin new training module","Resolve pending documentation"];
const TASK_STATUSES = ["Pending","In progress","In progress","Pending","Done","Pending","In progress"];
const AWARD_TYPES = ["Certificate of completion","Top producer — Sector award","Best craftsman — District award","Top earner — Cooperative award","Master artisan recognition"];
const AWARD_DATES = ["Jan 2024","Feb 2024","Mar 2024","Apr 2024","May 2024","Jun 2024","Jul 2024","Aug 2024","Sep 2024","Oct 2024"];

// ── Seeded RNG for stable data ──────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20241024);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const uniquePick = (arr, used) => {
  let v = pick(arr);
  let tries = 0;
  while (used.has(v) && tries < 6) { v = pick(arr); tries++; }
  used.add(v);
  return v;
};

// ── Generate the remaining agents (AG-013 … AG-360) ────────────────────────
function genAgents(count, startIdx) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    const district = pick(DISTRICTS);
    const sectors = SECTORS_BY_DISTRICT[district];
    const skillsUsed = new Set();
    const skillsTaught = [uniquePick(SKILLS_POOL, skillsUsed), uniquePick(SKILLS_POOL, skillsUsed)].filter(Boolean);
    const status = rng() < 0.9 ? "Active" : "On leave";
    out.push({
      id: `AG-${String(idx).padStart(3, "0")}`,
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      district,
      phone: `+250 788 ${randInt(100, 999)} ${randInt(100, 999)}`,
      beneficiaries: randInt(18, 52),
      rating: Math.round((4 + rng()) * 10) / 10,
      status,
      joined: pick(JOINED),
      wards: [pick(sectors)],
      skillsTaught,
      visits: status === "Active" ? randInt(0, 9) : 0,
    });
  }
  return out;
}

// ── Generate the remaining beneficiaries (BN-011 … BN-360) ─────────────────
function genBeneficiaries(count, startIdx, agentNames) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    const district = pick(DISTRICTS);
    const sector = pick(SECTORS_BY_DISTRICT[district]);
    const cell = pick(CELLS);
    const agent = pick(agentNames);
    const statusRoll = rng();
    const status = statusRoll < 0.85 ? "Active" : statusRoll < 0.93 ? "Pending" : "Suspended";
    const healthRoll = rng();
    const healthStatus = healthRoll < 0.78 ? "Paid" : healthRoll < 0.9 ? "Expiring" : "Unpaid";
    const hasCoop = rng() < 0.7;

    const skillsUsed = new Set();
    const numSkills = randInt(1, 3);
    const skills = [];
    for (let s = 0; s < numSkills; s++) {
      const sk = uniquePick(SKILLS_POOL, skillsUsed);
      skills.push({ name: sk, level: pick(SKILL_LEVELS), progress: randInt(15, 95), agent });
    }

    const familySize = randInt(1, 8);
    const family = [];
    const numFamily = randInt(0, Math.min(4, Math.max(0, familySize - 1)));
    for (let f = 0; f < numFamily; f++) {
      const fUsed = new Set();
      const fSkills = [];
      const ns = randInt(0, 3);
      for (let k = 0; k < ns; k++) fSkills.push(uniquePick(SKILLS_POOL, fUsed));
      family.push({ name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, relation: pick(RELATIONS), age: randInt(5, 60), skills: fSkills });
    }

    const numTasks = randInt(1, 3);
    const tasks = [];
    for (let t = 0; t < numTasks; t++) {
      tasks.push({ title: pick(TASK_TITLES), status: pick(TASK_STATUSES), due: `${randInt(5, 28)} Nov`, agent });
    }

    const awards = rng() < 0.12 ? [{ skill: pick(SKILLS_POOL), date: pick(AWARD_DATES), type: pick(AWARD_TYPES), agent }] : [];

    out.push({
      id: `BN-${String(idx).padStart(3, "0")}`,
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      district, sector, cell,
      age: randInt(19, 55),
      familySize,
      status,
      cooperative: hasCoop ? pick(COOPERATIVES).name : null,
      monthlyPayment: status === "Active" ? (rng() < 0.8 ? 12500 : 10000) : 0,
      agent,
      health: {
        status: healthStatus,
        scheme: "Mutuelle de Santé",
        expires: healthStatus === "Paid" ? "Dec 2024" : healthStatus === "Expiring" ? `${pick(["15","20","25","28","30"])} Nov 2024` : "Expired Oct 2024",
        cardNo: `MS-2024-${randInt(10000, 99999)}`,
      },
      skills, family, tasks, awards,
    });
  }
  return out;
}

// ── Static reference data ───────────────────────────────────────────────────
export const COOPERATIVES = [
  { id: "CO-001", name: "Twiyubake Cooperative", sector: "Kibingo, Nyaruguru", members: 48, activity: "Tailoring & Knitting", monthlyRevenue: 480000, joinStatus: "Open", leader: "Mukasine Beatrice", verified: true, founded: "2022", description: "School uniforms, embroidery, and fashion items. Supplies 3 local schools." },
  { id: "CO-002", name: "Dukorane Cooperative", sector: "Mata, Nyamagabe", members: 62, activity: "Beekeeping & Honey", monthlyRevenue: 720000, joinStatus: "Open", leader: "Nshuti Patrick", verified: true, founded: "2021", description: "Raw honey, beeswax candles, and soap. Supplies Kigali supermarkets." },
  { id: "CO-003", name: "Turengere Abana", sector: "Shyogwe, Muhanga", members: 35, activity: "Tailoring & Embroidery", monthlyRevenue: 390000, joinStatus: "Open", leader: "Ingabire Grace", verified: true, founded: "2022", description: "Children's clothing and ceremonial embroidery. Mentors new tailors." },
  { id: "CO-004", name: "Abahinzi ba Kibingo", sector: "Cyahinda, Nyaruguru", members: 54, activity: "Agriculture & Farming", monthlyRevenue: 610000, joinStatus: "Open", leader: "Kabera Eric", verified: false, founded: "2023", description: "Maize, beans, and vegetables. Supplies the school feeding programme." },
  { id: "CO-005", name: "Ubumwe Welding", sector: "Rugalika, Kamonyi", members: 28, activity: "Welding & Metalwork", monthlyRevenue: 540000, joinStatus: "Full", leader: "Twizeyimana Eric", verified: true, founded: "2021", description: "Doors, windows, and gates. At capacity — waitlist of 6." },
  { id: "CO-006", name: "Duterimbere Gasabo", sector: "Muganza, Gisagara", members: 41, activity: "Soap-making", monthlyRevenue: 310000, joinStatus: "Open", leader: "Mukasine Beatrice", verified: true, founded: "2022", description: "Bar soap and liquid detergent. Supplies 5 local shops." },
  { id: "CO-007", name: "Iterambere Hair", sector: "Nyagisozi, Nyanza", members: 22, activity: "Hairdressing & Salon", monthlyRevenue: 260000, joinStatus: "Open", leader: "Nyiraneza Solange", verified: false, founded: "2023", description: "Salon services and braiding training for young women." },
  { id: "CO-008", name: "Komeza Imihigo", sector: "Gitanga, Gisagara", members: 38, activity: "Carpentry & Furniture", monthlyRevenue: 450000, joinStatus: "Open", leader: "Mukamana Claire", verified: true, founded: "2021", description: "Chairs, tables, and beds. Accepts custom orders across the district." },
];

// Each agent and beneficiary belongs to exactly one programme. The sample split follows the programme sizes.
const PROGRAMME_SPLIT = [["VUP Direct Support", 0.44], ["Girinka Munyarwanda", 0.28], ["Expanded Public Works", 0.19], ["Nsymibondo y'Icyaro", 0.09]];
const FEATURED_AGENT_PROGRAMME = { "Nshuti Patrick": "VUP Direct Support", "Keza Aline": "VUP Direct Support", "Mugisha Eric": "VUP Direct Support", "Uwase Diane": "VUP Direct Support" };

function programmeFor(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) { hash ^= key.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  const unit = ((hash >>> 0) % 10000) / 10000;
  let total = 0;
  for (const [name, share] of PROGRAMME_SPLIT) { total += share; if (unit < total) return name; }
  return PROGRAMME_SPLIT[0][0];
}

// Build full 360-agent roster
export const AGENTS = [...AGENTS_FEATURED, ...genAgents(348, 13)].map((agent) => ({ ...agent, programme: FEATURED_AGENT_PROGRAMME[agent.name] || programmeFor(agent.id) }));

// A beneficiary belongs to the programme of the agent who serves them.
const _agentProgramme = new Map();
AGENTS.forEach((agent) => { if (!_agentProgramme.has(agent.name)) _agentProgramme.set(agent.name, agent.programme); });

// Build full 360-beneficiary registry
const _agentNames = AGENTS.map((a) => a.name);
export const BENEFICIARIES = [...BENEFICIARIES_FEATURED, ...genBeneficiaries(350, 11, _agentNames)].map((person) => ({ ...person, programme: _agentProgramme.get(person.agent) || programmeFor(person.id) }));

export const JOBS = [
  { id: "JOB-001", title: "Community Health Worker", programme: "VUP Direct Support", budget: 85000, type: "Contract", deadline: "10 Nov 2024", applicants: 12, skills: ["First Aid", "Communication", "Literacy"], exam: { date: "5 Nov 2024", time: "10:00", venue: "Kibingo Sector Hall" }, interview: { date: "8 Nov 2024", time: "14:00", venue: "District Office" }, status: "Open" },
  { id: "JOB-002", title: "Cooperative Bookkeeper", programme: "Girinka Munyarwanda", budget: 120000, type: "Full-time", deadline: "12 Nov 2024", applicants: 8, skills: ["Accounting", "Computer literacy", "QuickBooks"], exam: { date: "9 Nov 2024", time: "09:00", venue: "Muhanga Training Centre" }, interview: { date: "13 Nov 2024", time: "11:00", venue: "Cooperative Office" }, status: "Open" },
  { id: "JOB-003", title: "Tailoring Trainer", programme: "Expanded Public Works", budget: 95000, type: "Contract", deadline: "8 Nov 2024", applicants: 5, skills: ["Tailoring", "Teaching", "Embroidery"], exam: { date: "6 Nov 2024", time: "14:00", venue: "Shyogwe Workshop" }, interview: { date: "10 Nov 2024", time: "09:00", venue: "Programme Office" }, status: "In exam" },
  { id: "JOB-004", title: "Beekeeping Extension Officer", programme: "VUP Direct Support", budget: 110000, type: "Full-time", deadline: "15 Nov 2024", applicants: 6, skills: ["Beekeeping", "Farming", "First Aid"], exam: { date: "12 Nov 2024", time: "10:00", venue: "Mata Sector Hall" }, interview: { date: "16 Nov 2024", time: "13:00", venue: "District Office" }, status: "Open" },
  { id: "JOB-005", title: "Construction Team Lead", programme: "Expanded Public Works", budget: 140000, type: "Contract", deadline: "5 Nov 2024", applicants: 4, skills: ["Masonry", "Leadership", "Plumbing"], exam: { date: "3 Nov 2024", time: "09:00", venue: "Gitanga Site" }, interview: { date: "7 Nov 2024", time: "15:00", venue: "District Office" }, status: "In interview" },
  { id: "JOB-006", title: "Cooperative Manager", programme: "Girinka Munyarwanda", budget: 180000, type: "Full-time", deadline: "18 Nov 2024", applicants: 9, skills: ["Management", "Accounting", "Communication"], exam: { date: "14 Nov 2024", time: "10:00", venue: "Nyanza Town Hall" }, interview: { date: "19 Nov 2024", time: "11:00", venue: "Cooperative Office" }, status: "Open" },
];

export const SKILLS_CATALOG = [
  { name: "Tailoring", category: "Handicraft", beneficiaries: 34, agents: 8, levels: "Beginner → Advanced", certified: 12 },
  { name: "Masonry", category: "Construction", beneficiaries: 28, agents: 5, levels: "Beginner → Advanced", certified: 9 },
  { name: "Carpentry", category: "Construction", beneficiaries: 22, agents: 4, levels: "Beginner → Advanced", certified: 7 },
  { name: "Beekeeping", category: "Agriculture", beneficiaries: 18, agents: 3, levels: "Beginner → Advanced", certified: 6 },
  { name: "Hairdressing", category: "Services", beneficiaries: 19, agents: 4, levels: "Beginner → Intermediate", certified: 5 },
  { name: "Welding", category: "Metalwork", beneficiaries: 12, agents: 2, levels: "Beginner → Advanced", certified: 4 },
  { name: "Soap-making", category: "Manufacturing", beneficiaries: 16, agents: 3, levels: "Beginner → Intermediate", certified: 8 },
  { name: "Knitting", category: "Handicraft", beneficiaries: 21, agents: 5, levels: "Beginner → Advanced", certified: 11 },
  { name: "Embroidery", category: "Handicraft", beneficiaries: 14, agents: 3, levels: "Beginner → Intermediate", certified: 6 },
  { name: "Farming", category: "Agriculture", beneficiaries: 31, agents: 6, levels: "Beginner → Advanced", certified: 15 },
  { name: "Computer literacy", category: "Digital", beneficiaries: 9, agents: 2, levels: "Beginner", certified: 3 },
  { name: "Plumbing", category: "Construction", beneficiaries: 8, agents: 2, levels: "Beginner → Intermediate", certified: 3 },
];

export const AWARDS = [
  { beneficiary: "Mukasine Beatrice", skill: "Tailoring", date: "Sep 2024", type: "Certificate of completion", agent: "Nshuti Patrick", cooperative: "Twiyubake" },
  { beneficiary: "Habimana Jean", skill: "Masonry", date: "Aug 2024", type: "Best mason — Sector award", agent: "Nshuti Patrick", cooperative: "Komeza Imihigo" },
  { beneficiary: "Nshuti Patrick", skill: "Beekeeping", date: "Jul 2024", type: "Top producer — District award", agent: "Keza Aline", cooperative: "Dukorane" },
  { beneficiary: "Ingabire Grace", skill: "Tailoring", date: "Oct 2024", type: "Master tailor — Sector award", agent: "Mukamana Claire", cooperative: "Turengere Abana" },
  { beneficiary: "Nyiraneza Solange", skill: "Knitting", date: "Jun 2024", type: "Top earner — Cooperative award", agent: "Nshimiyimana David", cooperative: "Twiyubake" },
  { beneficiary: "Mugisha Eric", skill: "Carpentry", date: "May 2024", type: "Craftsmanship — District award", agent: "Mugisha Eric", cooperative: "Komeza Imihigo" },
];

export const PAYMENTS = [
  { id: "PAY-1042", beneficiary: "Mukasine Beatrice", district: "Nyaruguru", amount: 12500, programme: "VUP Direct Support", date: "5 Oct 2024", status: "Delivered", channel: "Mobile Money" },
  { id: "PAY-1041", beneficiary: "Habimana Jean", district: "Nyaruguru", amount: 12500, programme: "VUP Direct Support", date: "5 Oct 2024", status: "Delivered", channel: "Mobile Money" },
  { id: "PAY-1040", beneficiary: "Nshuti Patrick", district: "Nyamagabe", amount: 12500, programme: "VUP Direct Support", date: "5 Oct 2024", status: "Delivered", channel: "Bank Transfer" },
  { id: "PAY-1039", beneficiary: "Ingabire Grace", district: "Muhanga", amount: 12500, programme: "VUP Direct Support", date: "5 Oct 2024", status: "Delivered", channel: "Mobile Money" },
  { id: "PAY-1038", beneficiary: "Twizeyimana Eric", district: "Kamonyi", amount: 12500, programme: "VUP Direct Support", date: "5 Oct 2024", status: "Failed", channel: "Mobile Money" },
  { id: "PAY-1037", beneficiary: "Nyiraneza Solange", district: "Nyanza", amount: 12500, programme: "VUP Direct Support", date: "5 Oct 2024", status: "Delivered", channel: "Mobile Money" },
  { id: "PAY-1036", beneficiary: "Kabera Eric", district: "Nyaruguru", amount: 10000, programme: "Expanded Public Works", date: "5 Oct 2024", status: "Delivered", channel: "Mobile Money" },
  { id: "PAY-1035", beneficiary: "Iradukunda Aline", district: "Muhanga", amount: 12500, programme: "VUP Direct Support", date: "5 Oct 2024", status: "Pending", channel: "Mobile Money" },
];

export const PROGRAMMES = [
  { name: "VUP Direct Support", beneficiaries: 1980, budget: "RWF 2.4B", status: "Active" },
  { name: "Girinka Munyarwanda", beneficiaries: 1240, budget: "RWF 1.1B", status: "Active" },
  { name: "Expanded Public Works", beneficiaries: 860, budget: "RWF 1.8B", status: "Active" },
  { name: "Nsymibondo y'Icyaro", beneficiaries: 420, budget: "RWF 0.6B", status: "Pilot" },
];

export const PM_TABS = [
  { id: "overview", label: "Overview" },
  { id: "requests", label: "Analyst requests" },
  { id: "agents", label: "Agents" },
  { id: "beneficiaries", label: "Program Members" },
  { id: "cooperatives", label: "Cooperatives" },
  { id: "jobs", label: "Jobs & Recruitment" },
  { id: "payments", label: "Payments" },
  { id: "skills", label: "Skills & Training" },
];

export const healthStatusStyle = (s) =>
  s === "Paid"
    ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
    : s === "Expiring"
    ? "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]"
    : "border-[#FEE4E2] bg-[#FEF3F2] text-[#B42318]";

export const taskStatusStyle = (s) =>
  s === "Done"
    ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
    : s === "In progress"
    ? "border-[#D3CEFF] bg-[#EFEDFF] text-[#4B3FCC]"
    : "border-hairline bg-[#FAFBFD] text-[#8A94A6]";

export const jobStatusStyle = (s) =>
  s === "Open"
    ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
    : s === "In exam"
    ? "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]"
    : s === "In interview"
    ? "border-[#D3CEFF] bg-[#EFEDFF] text-[#4B3FCC]"
    : "border-hairline bg-[#FAFBFD] text-[#8A94A6]";