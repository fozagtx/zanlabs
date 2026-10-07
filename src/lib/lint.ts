// Market linter. Runs on the client (live checklist) and again on the server
// before any Panta call. It sorts every draft into a tier:
//   A — externally verifiable, named public source  → real money via Panta
//   B — the creator or their circle can influence it → free call only
//   C — prohibited topic                             → blocked
// Rationale: CFTC Staff Advisory 26-27 (Sep 2026) on contracts settling on a
// named person's own conduct; insider cases on creator markets; resolution
// disputes caused by vague wording.

import { MIN_START_DELAY_SEC } from "./config";

export type Tier = "A" | "B" | "C";

export type LintInput = {
  question: string;
  resolutionRule: string;
  sources: string[];
  category: string;
  startTime: number; // unix seconds
  endTime: number;
  resolutionTime: number;
  kind: "panta" | "forecast";
  creatorUsernames?: string[]; // linked social usernames, lowercased
  nowSec?: number;
};

export type LintCheck = { id: string; label: string; pass: boolean; severity: "error" | "warning" };

export type LintResult = {
  tier: Tier;
  ok: boolean; // no errors for the requested kind
  checks: LintCheck[];
  reasons: string[]; // human-readable notes on the tier decision
};

const PROHIBITED: RegExp[] = [
  /\b(die|dies|died|death|dead|deaths|kill|kills|killed|killing|murder\w*|suicid\w*|self[- ]?harm|overdos\w*)\b/i,
  /\b(injur\w*|hospitali[sz]ed|shoot\w*|stab\w*|assassinat\w*|terror\w*|bomb\w*|attack(ed|s)?|hostage\w*)\b/i,
  /\b(war|invasion|airstrike\w*|missile\w*)\b/i,
  /\b(rape\w*|sexual assault|abuse\w*|traffick\w*)\b/i,
  /\b(child|children|minors|underage|toddlers?)\b/i,
  /\b(arrest\w*|jail\w*|prison|convict\w*|indict\w*|charged with|sentenced)\b/i,
  /\b(pregnan\w*|divorce\w*|breaks? up|cheat\w*)\b/i,
];

const SELF_REFERENCE: RegExp[] = [
  /\bwill (i|we)\b/i,
  /\b(my|our|mine)\b/i,
  /\b(i|we)('ll| will| am| are|'m|'re)\b/i,
  /\bme\b/i,
];

const CREATOR_METRIC = /\b(subscribers?|subs|followers?|views|likes|streams? of my|stream|livestream|post|upload|video|collab|merch|giveaway)\b/i;

const VAGUE = /\b(soon|a lot|lots of|big|huge|viral|popular|successful|trending|blow up|go crazy|massive|soonish)\b/i;

const SOCIAL_HOSTS = ["x.com", "twitter.com", "instagram.com", "tiktok.com", "youtube.com", "youtu.be", "twitch.tv", "facebook.com", "threads.net", "snapchat.com"];

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const h = u.hostname;
    if (h === "localhost" || h.endsWith(".local") || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
    return h.includes(".");
  } catch {
    return false;
  }
}

function pointsAtCreatorAccount(src: string, usernames: string[]): boolean {
  try {
    const u = new URL(src);
    const host = u.hostname.replace(/^www\./, "");
    if (!SOCIAL_HOSTS.some((s) => host === s || host.endsWith("." + s))) return false;
    const pathLower = u.pathname.toLowerCase();
    return usernames.some((n) => n && (pathLower.includes(`/${n}`) || pathLower.includes(`/@${n}`)));
  } catch {
    return false;
  }
}

export function lintMarket(input: LintInput): LintResult {
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const q = input.question.trim();
  const rule = input.resolutionRule.trim();
  const text = `${q}\n${rule}`;
  const usernames = (input.creatorUsernames ?? []).map((n) => n.toLowerCase().replace(/^@/, ""));
  const checks: LintCheck[] = [];
  const reasons: string[] = [];
  const add = (id: string, label: string, pass: boolean, severity: "error" | "warning" = "error") =>
    checks.push({ id, label, pass, severity });

  // --- tier C: prohibited topics -------------------------------------------
  const prohibitedHit = PROHIBITED.find((re) => re.test(text));
  add("allowed_topic", "Not about death, injury, violence, crime, minors or private lives", !prohibitedHit);
  if (prohibitedHit) reasons.push("Mentions a prohibited topic.");

  // --- tier B: creator-controlled outcomes ---------------------------------
  const selfRef = SELF_REFERENCE.some((re) => re.test(q));
  const creatorMetric = selfRef && CREATOR_METRIC.test(q);
  const ownSource = input.sources.some((s) => pointsAtCreatorAccount(s, usernames));
  const handleInQuestion = usernames.some((n) => n.length >= 3 && new RegExp(`@?\\b${escapeRe(n)}\\b`, "i").test(q));
  const creatorControlled = selfRef || creatorMetric || ownSource || handleInQuestion;
  if (selfRef) reasons.push("The question is about you (I/my/we), which you can influence.");
  if (ownSource) reasons.push("A source is your own social account, which you control.");
  if (handleInQuestion) reasons.push("The question names your own handle.");

  // --- shape checks ----------------------------------------------------------
  add("question_length", "Question is 10–512 characters", q.length >= 10 && q.length <= 512);
  add("question_short", "Question fits on a share card (70 characters or fewer)", q.length <= 70, "warning");
  add("question_mark", "Question is phrased as a yes/no question", /\?\s*$/.test(q), "warning");
  add("rule_length", "Resolution rule is 30–2048 characters", rule.length >= 30 && rule.length <= 2048);
  add("rule_yes_no", "Rule says what makes it YES and what makes it NO", /\byes\b/i.test(rule) && /\bno\b/i.test(rule), "warning");
  add("not_vague", "No vague words like 'viral' or 'soon' without a number", !VAGUE.test(q), "warning");

  const validSources = input.sources.filter((s) => isHttpUrl(s.trim()));
  add("sources_present", "At least one public source URL (max 20)", validSources.length >= 1 && input.sources.length <= 20);
  add("sources_valid", "All sources are public http(s) links", validSources.length === input.sources.length);

  // --- timing ----------------------------------------------------------------
  const ordered = input.startTime < input.endTime && input.endTime <= input.resolutionTime;
  add("time_order", "Opens before it closes, and the result comes after it closes", ordered);
  if (input.kind === "panta") {
    add("start_delay", "Opens at least 1 hour from now (Panta rule)", input.startTime >= now + MIN_START_DELAY_SEC);
  } else {
    add("closes_future", "Closes in the future", input.endTime > now);
  }
  add("not_too_long", "Result within 90 days", input.resolutionTime - now <= 90 * 86400, "warning");

  // --- tier decision -----------------------------------------------------------
  const tier: Tier = prohibitedHit ? "C" : creatorControlled ? "B" : "A";
  add(
    "independent_outcome",
    "Outcome is decided by someone other than you (needed for real money)",
    !creatorControlled,
    input.kind === "panta" ? "error" : "warning",
  );
  if (input.category === "politics") reasons.push("Political markets are restricted in many countries; they stay geoblocked.");

  const relevant = checks.filter((c) => !(input.kind === "forecast" && c.id === "independent_outcome"));
  const ok = tier !== "C" && relevant.every((c) => c.pass || c.severity === "warning");
  return { tier, ok, checks, reasons };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
