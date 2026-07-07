/**
 * Optimizer seam — source-selection scoring. Phase-1 uses a deterministic
 * weighted model (Cost 25 / Service 25 / Compliance 20 / Capacity 15 / Risk 15,
 * per Methodology §4.9). The mock derives the non-priced sub-scores
 * deterministically from the provider id so results are stable across renders.
 * A real implementation (Phase 2) would pull live SLA / capacity / risk metrics.
 */

export type OptimizerWeights = {
  cost: number;
  service: number;
  compliance: number;
  capacity: number;
  risk: number;
};

export const OPTIMIZER_WEIGHTS: OptimizerWeights = {
  cost: 25,
  service: 25,
  compliance: 20,
  capacity: 15,
  risk: 15,
};

export type RiskFlag = "Low" | "Elevated" | "High";

/** Map a 0–100 risk sub-score to a display flag (higher score = lower risk). */
export function riskFlagFromScore(riskScore: number): RiskFlag {
  if (riskScore >= 85) return "Low";
  if (riskScore >= 70) return "Elevated";
  return "High";
}

export function riskFlagChipStatus(flag: RiskFlag): string {
  switch (flag) {
    case "Low":
      return "verified";
    case "Elevated":
      return "pending";
    case "High":
      return "rejected";
  }
}

export interface QuoteScoreInput {
  id: string;
  providerId: string;
  providerName: string;
  priceZAR: number;
  etaDays: number;
  /** Optional 0–100 sub-metrics; derived deterministically when absent. */
  complianceScore?: number;
  capacityScore?: number;
  riskScore?: number;
}

export interface ScoredQuote extends QuoteScoreInput {
  costScore: number;
  serviceScore: number;
  complianceScoreWeighted: number;
  capacityScoreWeighted: number;
  riskScoreWeighted: number;
  totalScore: number;
  rank: number;
}

export interface OptimizerResult {
  ranked: ScoredQuote[];
  recommendedQuoteId: string | null;
  /** Benchmark (mean of competing prices) minus the recommended price. */
  savingsZAR: number;
  weights: OptimizerWeights;
}

export interface Optimizer {
  score(quotes: QuoteScoreInput[], weights?: OptimizerWeights): OptimizerResult;
}

/** Adjust one weight and scale the others so the total stays 100. */
export function adjustOptimizerWeight(
  weights: OptimizerWeights,
  key: keyof OptimizerWeights,
  newValue: number,
): OptimizerWeights {
  const clamped = Math.max(5, Math.min(50, Math.round(newValue)));
  const others = (Object.keys(weights) as (keyof OptimizerWeights)[]).filter((k) => k !== key);
  const otherSum = others.reduce((s, k) => s + weights[k], 0);
  const remaining = 100 - clamped;
  const next = { ...weights, [key]: clamped };
  if (otherSum <= 0) return next;
  for (const k of others) {
    next[k] = Math.max(5, Math.round((weights[k] / otherSum) * remaining));
  }
  const drift = 100 - (Object.values(next) as number[]).reduce((s, v) => s + v, 0);
  if (drift !== 0) next[others[0]] = Math.max(5, next[others[0]] + drift);
  return next;
}

/** Stable 0–1 hash from a string id (deterministic, no crypto needed). */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Normalise so the best (min for cost/eta) gets full marks, worst gets ~40%. */
function inverseNorm(value: number, min: number, max: number): number {
  if (max <= min) return 1;
  const t = (value - min) / (max - min); // 0 best … 1 worst
  return 1 - t * 0.6; // 1.0 … 0.4
}

function derived(seed: string, lo: number, hi: number): number {
  return Math.round(lo + hash01(seed) * (hi - lo));
}

export const optimizer: Optimizer = {
  score(quotes, weights = OPTIMIZER_WEIGHTS) {
    if (quotes.length === 0) {
      return { ranked: [], recommendedQuoteId: null, savingsZAR: 0, weights };
    }
    const prices = quotes.map((q) => q.priceZAR);
    const etas = quotes.map((q) => q.etaDays);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const minE = Math.min(...etas);
    const maxE = Math.max(...etas);
    const meanP = prices.reduce((s, p) => s + p, 0) / prices.length;

    const scored = quotes.map((q) => {
      const compliance = q.complianceScore ?? derived(`${q.providerId}:comp`, 70, 99);
      const capacity = q.capacityScore ?? derived(`${q.providerId}:cap`, 60, 98);
      const risk = q.riskScore ?? derived(`${q.providerId}:risk`, 60, 97);

      const costScore = inverseNorm(q.priceZAR, minP, maxP) * weights.cost;
      const serviceScore = inverseNorm(q.etaDays, minE, maxE) * weights.service;
      const complianceScoreWeighted = (compliance / 100) * weights.compliance;
      const capacityScoreWeighted = (capacity / 100) * weights.capacity;
      const riskScoreWeighted = (risk / 100) * weights.risk;
      const totalScore =
        costScore +
        serviceScore +
        complianceScoreWeighted +
        capacityScoreWeighted +
        riskScoreWeighted;

      return {
        ...q,
        complianceScore: compliance,
        capacityScore: capacity,
        riskScore: risk,
        costScore: round1(costScore),
        serviceScore: round1(serviceScore),
        complianceScoreWeighted: round1(complianceScoreWeighted),
        capacityScoreWeighted: round1(capacityScoreWeighted),
        riskScoreWeighted: round1(riskScoreWeighted),
        totalScore: round1(totalScore),
        rank: 0,
      } satisfies ScoredQuote;
    });

    scored.sort((a, b) => b.totalScore - a.totalScore);
    scored.forEach((q, i) => (q.rank = i + 1));
    const recommended = scored[0] ?? null;

    return {
      ranked: scored,
      recommendedQuoteId: recommended?.id ?? null,
      savingsZAR: recommended ? Math.max(0, Math.round(meanP - recommended.priceZAR)) : 0,
      weights,
    };
  },
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
