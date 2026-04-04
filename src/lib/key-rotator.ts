/**
 * Key Rotator - Provider-agnostic LLM bucket rotation with per-bucket cooldowns.
 *
 * Ported from world-model-agent for EPK Generator use.
 *
 * Each LLMBucket is a key x model combination with its own independent RPD quota.
 * On 429, the bucket is marked burned for the day and the next bucket is tried.
 *
 * Strategy:
 *   - 429 on any bucket -> disabled until midnight UTC (daily quota is spent)
 *   - Auth errors (401/402/403) -> disabled until midnight UTC
 *   - Pool order matters: put high-RPD (lite) models first, quality models later
 *   - Daily reset at midnight UTC clears all state
 *   - Success resets nothing (bucket is fine, keep using it)
 */

export interface LLMBucket {
  provider: "gemini" | "anthropic" | "openai" | "minimax" | "opencode" | "openrouter";
  model: string;
  apiKey: string;
  label: string;
}

interface BucketState {
  bucket: LLMBucket;
  burnedUntil: number;
  usesToday: number;
  lastResetDate: string;
}

export interface LLMResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number } | null;
}

function todayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

function nextMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return tomorrow.getTime();
}

export class KeyRotator {
  private states: BucketState[];
  private agentName: string;

  constructor(opts: {
    agentName: string;
    buckets: LLMBucket[];
    defaultCooldownMs?: number;
  }) {
    this.agentName = opts.agentName;
    this.states = opts.buckets.map((bucket) => ({
      bucket,
      burnedUntil: 0,
      usesToday: 0,
      lastResetDate: todayUTC(),
    }));
  }

  async call(
    callFn: (bucket: LLMBucket) => Promise<LLMResponse>,
    isRateLimit: (err: unknown) => boolean
  ): Promise<LLMResponse & { bucket: LLMBucket }> {
    const now = Date.now();
    let lastError: unknown = null;
    let skipped = 0;

    for (const state of this.states) {
      const today = todayUTC();
      if (state.lastResetDate !== today) {
        state.usesToday = 0;
        state.burnedUntil = 0;
        state.lastResetDate = today;
      }

      if (now < state.burnedUntil) {
        skipped++;
        continue;
      }

      try {
        const response = await callFn(state.bucket);
        state.usesToday++;
        return { ...response, bucket: state.bucket };
      } catch (err) {
        lastError = err;

        if (isRateLimit(err)) {
          state.burnedUntil = nextMidnightUTC();
          console.warn(
            `[${this.agentName}] 429 on ${state.bucket.label} (${state.usesToday} used today) - burned until midnight UTC, trying next...`
          );
          continue;
        }

        const errMsg = (err as any)?.message || String(err);
        if (
          /\b(401|402|403|Invalid API key|Unauthorized|Forbidden|requires more credits)\b/i.test(
            errMsg
          )
        ) {
          state.burnedUntil = nextMidnightUTC();
          const reason = /402|credits/i.test(errMsg) ? "Out of credits" : "Auth error";
          console.warn(
            `[${this.agentName}] ${reason} on ${state.bucket.label} - burned until midnight UTC. Trying next...`
          );
          continue;
        }

        throw err;
      }
    }

    const total = this.states.length;
    if (lastError) {
      const nextAvail = Math.min(...this.states.map((s) => s.burnedUntil || Infinity));
      const waitSec = Math.max(0, Math.ceil((nextAvail - Date.now()) / 1000));
      console.error(
        `[${this.agentName}] All ${total} buckets exhausted (${skipped} burned). Next recovery in ~${waitSec}s.`
      );
      throw lastError;
    }

    const nextAvail = Math.min(...this.states.map((s) => s.burnedUntil));
    const waitSec = Math.max(0, Math.ceil((nextAvail - Date.now()) / 1000));
    throw new Error(
      `[${this.agentName}] All ${total} buckets burned for the day. Next recovery in ~${waitSec}s.`
    );
  }

  allCoolingDown(): number {
    const now = Date.now();
    const allBurned = this.states.every((s) => s.burnedUntil > now);
    if (!allBurned) return 0;
    return Math.min(...this.states.map((s) => s.burnedUntil));
  }

  status(): string {
    const now = Date.now();
    return this.states
      .map((s) => {
        const status =
          s.burnedUntil > now
            ? `BURNED(${Math.ceil((s.burnedUntil - now) / 60000)}m)`
            : "OK";
        return `${s.bucket.label}:${status}(${s.usesToday})`;
      })
      .join(" | ");
  }
}
