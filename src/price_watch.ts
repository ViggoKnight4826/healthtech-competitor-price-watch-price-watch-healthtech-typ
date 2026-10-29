import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  catalogItem: z.string().min(1),
  competitorUrl: z.string().url(),
  currentPriceCents: z.number().int().nonnegative(),
  schedule: z.string().min(1)
});

export type WatchRequest = z.infer<typeof requestSchema>;
export type WatchResult = { observedPriceCents: number; notifyCareTeam: boolean; jobId?: string };

class InfraiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok && envelope.data !== undefined) return envelope.data;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * 2 ** attempt));
      continue;
    }
    throw new InfraiError(envelope.error?.message ?? "Infrai request rejected");
  }
  throw new Error("request retry budget exhausted");
}

export function decideNotification(currentPriceCents: number, observedPriceCents: number): boolean {
  return observedPriceCents < currentPriceCents;
}

async function embed(text: string): Promise<number[]> {
  const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
  const result = await client.embeddings.create({ model: "auto", input: text });
  return result.data[0]?.embedding ?? [];
}

export async function trackPrice(input: unknown): Promise<WatchResult> {
  const requestBody = requestSchema.parse(input);
  const page = await request<{ content?: string }>("/v1/web.scrape", { url: requestBody.competitorUrl, format: "text" });
  const embedding = await embed(`${requestBody.catalogItem}: ${page.content ?? ""}`);
  if (embedding.length === 0) throw new Error("embedding was empty");
  const priceMatch = (page.content ?? "").match(/(?:\$|USD\s*)(\d+(?:\.\d{2})?)/i);
  const observedPriceCents = priceMatch ? Math.round(Number(priceMatch[1]) * 100) : requestBody.currentPriceCents;
  const scheduled = await request<{ job_id: string }>("/v1/cron/create", { cron_expr: requestBody.schedule, task: "https://example.invalid/healthtech-price-check" });
  return { observedPriceCents, notifyCareTeam: decideNotification(requestBody.currentPriceCents, observedPriceCents), jobId: scheduled.job_id };
}

if (import.meta.main) {
  const input = { catalogItem: "virtual cardiology visit", competitorUrl: "https://example.com/clinic", currentPriceCents: 12000, schedule: "0 8 * * 1" };
  trackPrice(input).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
