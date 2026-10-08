// Core domain types. The real backend should return the same shapes.

export type BattleMode = "individual" | "team";
export type RevealMode = "cinematic" | "simple";

export interface Battle {
  id: string;
  code: string; // short code used in registration IDs, e.g. "BOL"
  name: string;
  subtitle: string; // e.g. "Build a Blockbuster"
  description: string;
  mode: BattleMode;
  teamMin: number;
  teamMax: number;
  capacity: number; // individuals, or teams for team battles
  feeISE: number; // per member
  feeOther: number; // per member
  isOpen: boolean;
  accent: string;
  accent2: string;
  image: string;
  revealMode: RevealMode;
  /** When true, every assigned registration in this battle can see its role. */
  revealed: boolean;
}

export interface Portfolio {
  id: string;
  battleId: string;
  name: string;
  description: string;
  slots: number;
}

export const BRANCHES = [
  "ISE",
  "CSE",
  "CSE (AI & ML)",
  "CSE (Cyber Security)",
  "CCE",
  "AI & DS",
  "ECE",
  "EEE",
  "ME",
  "CIVIL",
  "BT",
  "RAI",
  "MCA",
  "MBA",
  "Other",
] as const;
export type Branch = (typeof BRANCHES)[number];

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "PG"] as const;
export type Year = (typeof YEARS)[number];

export interface Member {
  name: string;
  usn: string;
  email: string;
  phone: string;
  branch: Branch;
  year: Year;
}

export type PaymentStatus = "not_submitted" | "pending" | "verified" | "rejected";

export interface Payment {
  status: PaymentStatus;
  utr?: string;
  screenshot?: string; // data URL in the mock; storage path in the real backend
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectReason?: string;
}

export type AssignMethod = "first" | "second" | "third" | "manual";

export interface Assignment {
  portfolioId: string;
  method: AssignMethod;
  drawn: boolean; // won a random draw for an oversubscribed role
  assignedAt: string;
  seed?: number;
}

export interface Registration {
  id: string;
  battleId: string;
  ownerEmail: string; // Google account that created the registration
  teamName?: string;
  teamCode?: string;
  viewers: string[]; // teammates' Google accounts that joined via team code
  members: Member[]; // members[0] is the leader / individual
  preferences: [string, string, string]; // portfolio IDs, rank 1..3
  fee: number; // computed by the "server"
  payment: Payment;
  assignment?: Assignment;
  revealed: boolean; // per-person reveal
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export type Channel = "email" | "whatsapp";

export interface NotificationLog {
  id: string;
  at: string;
  channel: Channel;
  to: string;
  registrationId: string;
  subject: string;
  body: string;
  status: "queued" | "sent";
}

export interface Settings {
  upiId: string;
  payeeName: string;
  adminPasscode?: string; // legacy (local mock) — admin access is now profiles.role
}

export interface DB {
  version: number;
  battles: Battle[];
  portfolios: Portfolio[];
  registrations: Registration[];
  audit: AuditEntry[];
  notifications: NotificationLog[];
  settings: Settings;
  seq: Record<string, number>;
  /** Public per-battle seat counts (view battle_seats). Absent → derive from registrations. */
  seats?: Record<string, number>;
}

export interface Session {
  name: string;
  email: string;
}

export interface Draft {
  battleId?: string;
  preferences?: string[];
  locked?: boolean;
  registrationId?: string;
}
