// Market templates turn a creator's hot take into Panta-valid fields without
// any AI: question, resolution rule, sources, category and timing.

import type { Category } from "./config";

export type TemplateField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "datetime" | "url" | "number" | "select";
  options?: string[];
};

export type TemplateOutput = {
  question: string;
  resolutionRule: string;
  sources: string[];
  category: Category;
  endTime: number; // trading closes
  resolutionTime: number; // result expected
};

export type Template = {
  id: string;
  name: string;
  blurb: string;
  kind: "panta" | "forecast";
  fields: TemplateField[];
  build: (v: Record<string, string>) => TemplateOutput | null;
};

const H = 3600;

function toUnix(local: string | undefined): number | null {
  if (!local) return null;
  const t = Date.parse(local);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

function fmtDate(sec: number): string {
  return new Date(sec * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function fmtDateTime(sec: number): string {
  return new Date(sec * 1000).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

const req = (v: Record<string, string>, ...keys: string[]) => keys.every((k) => (v[k] ?? "").trim() !== "");

export const TEMPLATES: Template[] = [
  {
    id: "match",
    name: "Match result",
    blurb: "Will a team win a fixture? Closes at kickoff.",
    kind: "panta",
    fields: [
      { key: "team", label: "Team you're calling", placeholder: "Arsenal" },
      { key: "opponent", label: "Opponent", placeholder: "Chelsea" },
      { key: "competition", label: "Competition", placeholder: "Premier League" },
      { key: "kickoff", label: "Kickoff (your local time)", type: "datetime" },
      { key: "source", label: "Official results page", type: "url", placeholder: "https://www.premierleague.com/results" },
    ],
    build: (v) => {
      if (!req(v, "team", "opponent", "competition", "kickoff", "source")) return null;
      const kickoff = toUnix(v.kickoff);
      if (!kickoff) return null;
      const d = fmtDate(kickoff);
      return {
        question: `Will ${v.team} beat ${v.opponent} on ${d}?`,
        resolutionRule:
          `Resolves YES if ${v.team} wins its ${v.competition} match against ${v.opponent} scheduled to kick off at ${fmtDateTime(kickoff)}, ` +
          `based on the official full-time result published at the source. A draw or a ${v.opponent} win resolves NO. ` +
          `If the match is postponed or abandoned and not completed by the resolution time, the market follows Panta's cancellation rules.`,
        sources: [v.source.trim()],
        category: "sports",
        endTime: kickoff,
        resolutionTime: kickoff + 4 * H,
      };
    },
  },
  {
    id: "chart",
    name: "Chart position",
    blurb: "Will a song or album hit a chart spot?",
    kind: "panta",
    fields: [
      { key: "title", label: "Song or album", placeholder: "Song title" },
      { key: "artist", label: "Artist", placeholder: "Artist name" },
      { key: "chart", label: "Chart", placeholder: "Billboard Hot 100" },
      { key: "position", label: "Top position (1 = number one)", type: "number", placeholder: "1" },
      { key: "chartDate", label: "Chart publication date", type: "datetime" },
      { key: "source", label: "Official chart page", type: "url", placeholder: "https://www.billboard.com/charts/hot-100/" },
    ],
    build: (v) => {
      if (!req(v, "title", "artist", "chart", "position", "chartDate", "source")) return null;
      const pub = toUnix(v.chartDate);
      const pos = Number(v.position);
      if (!pub || !Number.isInteger(pos) || pos < 1) return null;
      const spot = pos === 1 ? "#1" : `top ${pos}`;
      return {
        question: `Will "${v.title}" by ${v.artist} reach ${spot} on the ${v.chart} published ${fmtDate(pub)}?`,
        resolutionRule:
          `Resolves YES if "${v.title}" by ${v.artist} appears at ${pos === 1 ? "number 1" : `position ${pos} or higher`} on the ${v.chart} ` +
          `chart published on ${fmtDate(pub)}, as shown on the official chart page. Otherwise resolves NO.`,
        sources: [v.source.trim()],
        category: "entertainment",
        endTime: pub - 24 * H,
        resolutionTime: pub + 12 * H,
      };
    },
  },
  {
    id: "reality",
    name: "Reality show",
    blurb: "Eviction, winner or challenge result on a broadcast.",
    kind: "panta",
    fields: [
      { key: "contestant", label: "Contestant", placeholder: "Contestant name" },
      { key: "show", label: "Show", placeholder: "Big Brother Naija" },
      { key: "event", label: "What happens", type: "select", options: ["be evicted", "win the show", "win Head of House"] },
      { key: "airtime", label: "Broadcast time (your local time)", type: "datetime" },
      { key: "source", label: "Official show or broadcaster page", type: "url" },
    ],
    build: (v) => {
      if (!req(v, "contestant", "show", "event", "airtime", "source")) return null;
      const air = toUnix(v.airtime);
      if (!air) return null;
      return {
        question: `Will ${v.contestant} ${v.event} on ${v.show} on ${fmtDate(air)}?`,
        resolutionRule:
          `Resolves YES if ${v.contestant} is officially announced to ${v.event} on ${v.show} in the broadcast starting ${fmtDateTime(air)}, ` +
          `as confirmed by the official show or broadcaster source. Resolves NO if anyone else does or nothing is announced in that broadcast.`,
        sources: [v.source.trim()],
        category: "entertainment",
        endTime: air,
        resolutionTime: air + 6 * H,
      };
    },
  },
  {
    id: "award",
    name: "Award winner",
    blurb: "Will a nominee win their category?",
    kind: "panta",
    fields: [
      { key: "nominee", label: "Nominee", placeholder: "Nominee name" },
      { key: "award", label: "Award category", placeholder: "Best New Artist" },
      { key: "ceremony", label: "Ceremony", placeholder: "Headies 2026" },
      { key: "ceremonyTime", label: "Ceremony start (your local time)", type: "datetime" },
      { key: "source", label: "Official awards page", type: "url" },
    ],
    build: (v) => {
      if (!req(v, "nominee", "award", "ceremony", "ceremonyTime", "source")) return null;
      const t = toUnix(v.ceremonyTime);
      if (!t) return null;
      return {
        question: `Will ${v.nominee} win ${v.award} at the ${v.ceremony}?`,
        resolutionRule:
          `Resolves YES if ${v.nominee} is announced as the winner of ${v.award} at the ${v.ceremony} starting ${fmtDateTime(t)}, ` +
          `per the official awards source. Resolves NO if another nominee wins or the category is not awarded.`,
        sources: [v.source.trim()],
        category: "entertainment",
        endTime: t,
        resolutionTime: t + 12 * H,
      };
    },
  },
  {
    id: "price",
    name: "Crypto price",
    blurb: "Will a coin be above a price at a set time?",
    kind: "panta",
    fields: [
      { key: "asset", label: "Asset", placeholder: "SOL" },
      { key: "direction", label: "Direction", type: "select", options: ["above", "below"] },
      { key: "price", label: "Price (USD)", type: "number", placeholder: "250" },
      { key: "at", label: "Snapshot time (your local time)", type: "datetime" },
      { key: "source", label: "Price source page", type: "url", placeholder: "https://www.coingecko.com/en/coins/solana" },
    ],
    build: (v) => {
      if (!req(v, "asset", "direction", "price", "at", "source")) return null;
      const at = toUnix(v.at);
      const px = Number(v.price);
      if (!at || !(px > 0)) return null;
      return {
        question: `Will ${v.asset.toUpperCase()} be ${v.direction} $${px.toLocaleString("en-US")} on ${fmtDate(at)}?`,
        resolutionRule:
          `Resolves YES if the ${v.asset.toUpperCase()}/USD price shown by the named source at ${fmtDateTime(at)} is ${v.direction} ` +
          `$${px.toLocaleString("en-US")}. Otherwise resolves NO.`,
        sources: [v.source.trim()],
        category: "crypto",
        endTime: at - 2 * H,
        resolutionTime: at + 2 * H,
      };
    },
  },
  {
    id: "custom",
    name: "Custom call",
    blurb: "Write your own question and rule.",
    kind: "panta",
    fields: [],
    build: () => null,
  },
  {
    id: "about-me",
    name: "About me (free call)",
    blurb: "Questions about your own content or channel. No money, just bragging rights.",
    kind: "forecast",
    fields: [
      { key: "question", label: "Your question", placeholder: "Will my next video pass 100k views in 7 days?" },
      { key: "closes", label: "Calls close (your local time)", type: "datetime" },
      { key: "resultBy", label: "Result by (your local time)", type: "datetime" },
      { key: "source", label: "Where fans can check the result", type: "url" },
    ],
    build: (v) => {
      if (!req(v, "question", "closes", "resultBy", "source")) return null;
      const c = toUnix(v.closes);
      const r = toUnix(v.resultBy);
      if (!c || !r) return null;
      const question = v.question.trim();
      return {
        question,
        resolutionRule:
          `Free call. Resolves YES if this happens by ${fmtDateTime(r)}, as shown at the linked source; otherwise NO. ` +
          `The creator resolves free calls and must link evidence. No money is involved.`,
        sources: [v.source.trim()],
        category: "other",
        endTime: c,
        resolutionTime: r,
      };
    },
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
