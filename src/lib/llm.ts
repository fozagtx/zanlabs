import "server-only";
import { z } from "zod";
import { env } from "./env";
import { CATEGORIES } from "./config";
import { HttpError } from "./http";

// Optional AI drafting: turns a creator's casual hot take into a precise,
// resolvable market. Works with any chat-completions compatible endpoint
// configured via LLM_API_URL / LLM_API_KEY / LLM_MODEL. The linter still has
// the final say; the model only proposes wording.

export const DraftSchema = z.object({
  question: z.string().min(10).max(512),
  resolutionRule: z.string().min(30).max(2048),
  sources: z.array(z.string()).min(1).max(5),
  category: z.enum(CATEGORIES),
  closesAtIso: z.string().nullable(),
  resultAtIso: z.string().nullable(),
  creatorControlled: z.boolean(),
  notes: z.string().max(400).nullable(),
});
export type Draft = z.infer<typeof DraftSchema>;

const SYSTEM = `You turn a creator's casual prediction ("hot take") into a binary YES/NO prediction market that a neutral third party can resolve.
Rules:
- The question is one short yes/no question (aim for 70 characters or fewer), ending with "?", with a concrete date.
- The resolution rule states exactly what makes it YES and what makes it NO, names the official public source, and the timezone.
- Sources are public https URLs of official results pages (league sites, official charts, broadcasters, price pages). Never social media posts.
- If the outcome is decided by the creator or their circle (their own posts, follower counts, uploads, collabs), set creatorControlled true.
- Never produce markets about death, injury, violence, crime, minors, or private lives. If asked, return the safest unrelated rewrite and explain in notes.
- Dates: give ISO 8601 with timezone for when trading should close (before the outcome is knowable) and when the result will be known.
Respond with JSON only, matching: {"question","resolutionRule","sources","category","closesAtIso","resultAtIso","creatorControlled","notes"}.
category is one of: ${CATEGORIES.join(", ")}.`;

export async function draftMarket(hotTake: string, nowIso: string, timezone: string): Promise<Draft> {
  const cfg = env.llm();
  if (!cfg) throw new HttpError(503, "BAD_REQUEST", "AI drafting isn't configured on this deployment. Use a template instead.");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Now: ${nowIso} (creator timezone ${timezone}).\nHot take: ${hotTake.slice(0, 600)}` },
      ],
    }),
  });
  if (!res.ok) throw new HttpError(502, "BAD_REQUEST", "The drafting service didn't respond. Try a template instead.");
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new HttpError(502, "BAD_REQUEST", "The draft came back malformed. Try rephrasing.");
  }
  const draft = DraftSchema.safeParse(parsed);
  if (!draft.success) throw new HttpError(502, "BAD_REQUEST", "The draft was incomplete. Try rephrasing or use a template.");
  return draft.data;
}
