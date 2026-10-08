import type { Battle, DB, Member, Portfolio, Registration } from "./types";

export const DB_VERSION = 1;

const battles: Battle[] = [
  {
    id: "bollywood",
    code: "BOL",
    name: "Bollywood Saga",
    subtitle: "Build a Blockbuster",
    description:
      "Stars, scripts and box-office wars. Pitch, cast and market your film while rivals try to steal the spotlight.",
    mode: "individual",
    teamMin: 1,
    teamMax: 1,
    capacity: 60,
    feeISE: 100,
    feeOther: 150,
    isOpen: true,
    accent: "#e11d74",
    accent2: "#f5c542",
    image: "/battles/bollywood.jpg",
    revealMode: "cinematic",
    revealed: false,
  },
  {
    id: "ipl",
    code: "IPL",
    name: "IPL Mega Auction 2027",
    subtitle: "Build a Franchise",
    description:
      "Purse in hand, paddle raised. Out-bid, out-think and out-build nine rival franchises to assemble a title-winning squad.",
    mode: "team",
    teamMin: 2,
    teamMax: 3,
    capacity: 10,
    feeISE: 100,
    feeOther: 150,
    isOpen: true,
    accent: "#3b82f6",
    accent2: "#f97316",
    image: "/battles/ipl.jpg",
    revealMode: "cinematic",
    revealed: false,
  },
  {
    id: "loksabha",
    code: "LOK",
    name: "Lok Sabha",
    subtitle: "Play Politics",
    description:
      "Alliances form and fracture. Debate, negotiate and manoeuvre your way through the floor of the House.",
    mode: "individual",
    teamMin: 1,
    teamMax: 1,
    capacity: 80,
    feeISE: 80,
    feeOther: 120,
    isOpen: true,
    accent: "#ff9933",
    accent2: "#22c55e",
    image: "/battles/loksabha.jpg",
    revealMode: "cinematic",
    revealed: false,
  },
];

const p = (battleId: string, id: string, name: string, description: string, slots: number): Portfolio => ({
  id: `${battleId}-${id}`,
  battleId,
  name,
  description,
  slots,
});

const portfolios: Portfolio[] = [
  p("bollywood", "producer", "The Producer", "Holds the purse strings. Every rupee is a bet.", 8),
  p("bollywood", "director", "The Director", "Vision, control, and the final cut.", 8),
  p("bollywood", "superstar", "The Superstar", "One entry scene can make or break opening weekend.", 8),
  p("bollywood", "leading-lady", "The Leading Lady", "Commands the screen and the headlines.", 8),
  p("bollywood", "maestro", "The Music Maestro", "Chartbusters sell tickets before the trailer drops.", 8),
  p("bollywood", "writer", "The Screenwriter", "Plot twists are your currency.", 8),
  p("bollywood", "distributor", "The Distributor", "Screens, territories, release dates — you decide.", 8),
  p("bollywood", "critic", "The Critic", "Your star rating moves markets.", 8),

  p("ipl", "mi", "Mumbai Indians", "Five-time champions. Expectations are brutal.", 1),
  p("ipl", "csk", "Chennai Super Kings", "Legacy, loyalty and the yellow army.", 1),
  p("ipl", "rcb", "Royal Challengers Bengaluru", "The loudest crowd in the league.", 1),
  p("ipl", "kkr", "Kolkata Knight Riders", "Purple, gold and mystery spin.", 1),
  p("ipl", "srh", "Sunrisers Hyderabad", "Built on pace and fearless batting.", 1),
  p("ipl", "dc", "Delhi Capitals", "Young core, big ambitions.", 1),
  p("ipl", "pbks", "Punjab Kings", "High risk, high reward auction table.", 1),
  p("ipl", "rr", "Rajasthan Royals", "Moneyball masters of the league.", 1),
  p("ipl", "gt", "Gujarat Titans", "Champions in their debut season.", 1),
  p("ipl", "lsg", "Lucknow Super Giants", "Deep pockets, deeper benches.", 1),

  p("loksabha", "pm", "Leader of the House", "Command the majority — if you can keep it.", 2),
  p("loksabha", "lop", "Leader of Opposition", "Every bill passes through your scrutiny.", 2),
  p("loksabha", "finance", "Finance Minister", "The budget is your battlefield.", 4),
  p("loksabha", "home", "Home Minister", "Law, order and quiet power.", 4),
  p("loksabha", "external", "External Affairs Minister", "Diplomacy beyond the chamber.", 4),
  p("loksabha", "kingmaker", "Coalition Kingmaker", "Small party, decisive votes.", 8),
  p("loksabha", "ruling-mp", "Ruling Alliance MP", "Hold the line on the treasury benches.", 28),
  p("loksabha", "opp-mp", "Opposition MP", "Make noise, make news, make them answer.", 28),
];

// ---------- demo registrations so the admin panel has something to show ----------

const FIRST = ["Aarav", "Diya", "Rohan", "Ananya", "Karthik", "Sneha", "Vikram", "Meera", "Arjun", "Isha", "Nikhil", "Priya", "Sanjay", "Tanvi", "Rahul", "Kavya", "Aditya", "Neha"];
const LAST = ["Shetty", "Rao", "Kamath", "Bhat", "Pai", "Nayak", "Hegde", "Acharya", "Prabhu", "Kini"];
const BR = ["ISE", "CSE", "ECE", "ME", "AI & DS", "ISE", "CSE (AI & ML)", "EEE"] as const;
const BR_CODE: Record<string, string> = { ISE: "IS", CSE: "CS", ECE: "EC", ME: "ME", "AI & DS": "AD", "CSE (AI & ML)": "AM", EEE: "EE" };

function receiptSvg(utr: string, amount: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640"><rect width="360" height="640" fill="#f4f6fb"/><rect x="0" y="0" width="360" height="200" fill="#1e3a8a"/><circle cx="180" cy="110" r="38" fill="#22c55e"/><path d="M162 110l12 12 24-26" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/><text x="180" y="250" font-family="Arial" font-size="40" font-weight="bold" text-anchor="middle" fill="#0f172a">&#8377;${amount}</text><text x="180" y="285" font-family="Arial" font-size="16" text-anchor="middle" fill="#16a34a">Payment Successful</text><text x="30" y="350" font-family="Arial" font-size="13" fill="#64748b">To</text><text x="30" y="372" font-family="Arial" font-size="15" fill="#0f172a">VISTA NMAMIT</text><text x="30" y="420" font-family="Arial" font-size="13" fill="#64748b">UPI transaction ID</text><text x="30" y="442" font-family="Arial" font-size="15" fill="#0f172a">${utr}</text><text x="180" y="600" font-family="Arial" font-size="11" text-anchor="middle" fill="#94a3b8">DEMO SCREENSHOT</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function demoRegistrations(): { regs: Registration[]; seq: Record<string, number> } {
  const r = rng(42);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
  const regs: Registration[] = [];
  const seq: Record<string, number> = { BOL: 0, IPL: 0, LOK: 0 };
  let n = 0;

  const member = (): Member => {
    const f = pick(FIRST);
    const l = pick(LAST);
    const branch = pick(BR);
    n++;
    return {
      name: `${f} ${l}`,
      usn: `NNM2${Math.floor(r() * 4) + 2}${BR_CODE[branch]}${String(100 + n).padStart(3, "0")}`,
      email: `${f.toLowerCase()}.${l.toLowerCase()}${n}@nmamit.in`,
      phone: `9${Math.floor(100000000 + r() * 899999999)}`,
      branch,
      year: pick(["1st Year", "2nd Year", "3rd Year", "4th Year"] as const),
    };
  };

  const plan: [string, number][] = [
    ["bollywood", 14],
    ["ipl", 6],
    ["loksabha", 16],
  ];
  for (const [battleId, count] of plan) {
    const battle = battles.find((b) => b.id === battleId)!;
    const pf = portfolios.filter((x) => x.battleId === battleId);
    for (let i = 0; i < count; i++) {
      const size = battle.mode === "team" ? (r() > 0.5 ? 3 : 2) : 1;
      const members = Array.from({ length: size }, member);
      // bias first choices so some roles are oversubscribed
      const shuffled = [...pf].sort(() => r() - 0.5);
      if (r() < 0.45) {
        const hot = pf[0];
        shuffled.splice(shuffled.indexOf(hot), 1);
        shuffled.unshift(hot);
      }
      const fee = members.reduce((s, m) => s + (m.branch === "ISE" ? battle.feeISE : battle.feeOther), 0);
      seq[battle.code]++;
      const id = `VRD-${battle.code}-${String(seq[battle.code]).padStart(4, "0")}`;
      const roll = r();
      const status = roll < 0.55 ? "verified" : roll < 0.85 ? "pending" : roll < 0.93 ? "rejected" : "not_submitted";
      const utr = String(Math.floor(100000000000 + r() * 899999999999));
      const created = new Date(Date.UTC(2026, 9, 1 + Math.floor(r() * 6), Math.floor(r() * 14) + 3, Math.floor(r() * 60))).toISOString();
      regs.push({
        id,
        battleId,
        ownerEmail: members[0].email,
        teamName: battle.mode === "team" ? `${pick(["Mighty", "Royal", "Silent", "Golden", "Crimson"])} ${pick(["Strikers", "Warriors", "Titans", "Falcons", "Mavericks"])}` : undefined,
        teamCode: battle.mode === "team" ? `VRD-${Math.random().toString(36).slice(2, 6).toUpperCase()}` : undefined,
        viewers: [],
        members,
        preferences: [shuffled[0].id, shuffled[1].id, shuffled[2].id],
        fee,
        payment:
          status === "not_submitted"
            ? { status }
            : {
                status,
                utr,
                screenshot: receiptSvg(utr, fee),
                submittedAt: created,
                reviewedAt: status === "verified" || status === "rejected" ? created : undefined,
                reviewedBy: status === "verified" || status === "rejected" ? "admin" : undefined,
                rejectReason: status === "rejected" ? "UTR does not match screenshot" : undefined,
              },
        revealed: false,
        createdAt: created,
      });
    }
  }
  return { regs, seq };
}

export function seedDB(): DB {
  const { regs, seq } = demoRegistrations();
  return {
    version: DB_VERSION,
    battles: structuredClone(battles),
    portfolios: structuredClone(portfolios),
    registrations: regs,
    audit: [],
    notifications: [],
    settings: { upiId: "vista.nmamit@okaxis", payeeName: "VISTA NMAMIT", adminPasscode: "verdict2026" },
    seq,
  };
}
