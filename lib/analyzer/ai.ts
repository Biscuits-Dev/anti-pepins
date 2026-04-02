/**
 * @file ai.ts
 * Intégration Mistral AI pour l'analyse intelligente d'arnaques.
 */

import type { AIResult, ScamType, RiskLevel, SupportedLanguage } from "./types";
import { VALID_SCAM_TYPES, VALID_RISK_LEVELS, scoreToRisk } from "./constants";

interface MistralRuntimeConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly endpoint: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly timeoutMs: number;
  readonly maxRetries: number;
}

function loadConfig(): MistralRuntimeConfig {
  return {
    apiKey:      process.env.MISTRAL_API_KEY  ?? "",
    model:       process.env.MISTRAL_MODEL    ?? "mistral-small-latest",
    endpoint:    process.env.MISTRAL_ENDPOINT ?? "https://api.mistral.ai/v1/chat/completions",
    maxTokens:   500,
    temperature: 0.1,
    timeoutMs:   10_000,
    maxRetries:  3,
  };
}

let _config: MistralRuntimeConfig | null = null;
const getConfig = (): MistralRuntimeConfig => (_config ??= loadConfig());

const SYSTEM_PROMPT = `Tu es un expert en cybersécurité spécialisé dans la détection d'arnaques.

⚠️ DOMAINES OFFICIELS DE CONFIANCE (toujours considérer comme SAFE) :
- biscuits-ia.com
- anti-pepins.biscuits-ia.com
- contact@biscuits-ia.com
- noreply@biscuits-ia.com

Si le contenu contient uniquement ces domaines, le score DOIT être 0-10 (safe) et l'explication doit indiquer qu'il s'agit d'un domaine officiel légitime.

Analyse le contenu fourni et retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans balises Markdown.

Format de réponse strict :
{
  "score": <entier 0-100>,
  "risk": "<safe|low|suspicious|dangerous|critical>",
  "type": "<phishing|fake-website|scam-call|investment|romance|social-engineering|tech-support|fake-delivery|brouteur|lottery|crypto-scam|impersonation|unknown>",
  "explanation": "<explication concise en français, max 200 mots>",
  "confidence": <entier 0-100>,
  "language": "<fr|en|other>",
  "indicators": ["<indicateur1>", "<indicateur2>"]
}

Barème score → risque :
0-15 safe | 16-35 low | 36-55 suspicious | 56-75 dangerous | 76-100 critical

Critères d'analyse (pondérés) :
1. Urgence artificielle ou pression psychologique (+20)
2. Promesses financières irréalistes (+20)
3. Demandes d'informations personnelles ou financières (+25)
4. Menaces ou intimidation (+20)
5. Fautes d'orthographe excessives (+10)
6. Liens suspects ou demandes de clic (+15)
7. Incohérences dans le message (+15)
8. Demande de confidentialité excessive (+10)` as const;

interface CacheEntry {
  result: AIResult;
  expiresAt: number;
}

const CACHE_TTL_MS  = 5 * 60 * 1_000; // 5 min
const CACHE_MAX_SIZE = 500;

const aiCache = new Map<string, CacheEntry>();

function getCached(key: string): AIResult | null {
  const entry = aiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    aiCache.delete(key);
    return null;
  }
  aiCache.delete(key);
  aiCache.set(key, entry);
  return entry.result;
}

function setCached(key: string, result: AIResult): void {
  if (aiCache.size >= CACHE_MAX_SIZE) {
    // Éviction de l'entrée la moins récemment utilisée (première de la Map)
    const oldest = aiCache.keys().next().value;
    if (oldest !== undefined) aiCache.delete(oldest);
  }
  aiCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

function hashText(text: string): string {
  const normalized = text.toLowerCase().trimStart().substring(0, 500);
  let h = 5_381;
  for (let i = 0; i < normalized.length; i++) {
    // eslint-disable-next-line no-bitwise
    h = (((h << 5) + h) ^ normalized.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export async function analyzeWithAI(text: string): Promise<AIResult> {
  const cacheKey = hashText(text);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const cfg = getConfig();
  if (!cfg.apiKey) return localFallback(text);

  let lastError: unknown;

  for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
    try {
      const result = await callMistralWithTimeout(text, cfg);
      setCached(cacheKey, result);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < cfg.maxRetries) {
        // Backoff exponentiel avec jitter : ~200 ms, ~400 ms, ~800 ms…
        await sleep(200 * 2 ** (attempt - 1) + Math.random() * 100);
      }
    }
  }

  console.error(`[ai] Échec après ${cfg.maxRetries} tentatives :`, lastError);
  return localFallback(text);
}

export function isAIConfigured(): boolean {
  return !!getConfig().apiKey;
}

export function clearAICache(): void {
  aiCache.clear();
}

export function getAICacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return { size: aiCache.size, maxSize: CACHE_MAX_SIZE, ttlMs: CACHE_TTL_MS };
}

async function callMistralWithTimeout(text: string, cfg: MistralRuntimeConfig): Promise<AIResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const response = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model:           cfg.model,
        max_tokens:      cfg.maxTokens,
        temperature:     cfg.temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: `Analyse ce contenu :\n\n${text}` },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Mistral HTTP ${response.status}: ${body.substring(0, 200)}`);
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Réponse Mistral vide");

    return parseAIResponse(content);
  } finally {
    clearTimeout(timer);
  }
}

const JSON_OBJECT_RE = /\{[\s\S]*\}/;

function parseAIResponse(content: string): AIResult {
  const jsonMatch = JSON_OBJECT_RE.exec(content);
  if (!jsonMatch) throw new Error("Aucun JSON dans la réponse Mistral");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    throw new Error("JSON invalide dans la réponse Mistral");
  }

  return {
    score:       clamp(Number(parsed.score),      0, 100),
    risk:        validateRisk(parsed.risk),
    type:        validateScamType(parsed.type),
    explanation: String(parsed.explanation || "Analyse non disponible").substring(0, 500),
    confidence:  clamp(Number(parsed.confidence), 0, 100),
    language:    validateLanguage(parsed.language),
    indicators:  parseIndicators(parsed.indicators),
  };
}

interface KeywordGroup {
  readonly keywords:  ReadonlySet<string>;
  readonly points:    number;
  readonly indicator: string;
}

const KEYWORD_GROUPS = new Map<ScamType, KeywordGroup>([
  ["phishing", {
    keywords:  new Set(["banque","compte","mot de passe","code","sécurité","vérifier","confirmer","suspendu","bloqué"]),
    points:    8,
    indicator: "phishing_keywords",
  }],
  ["lottery", {
    keywords:  new Set(["gagnez","argent","loterie","million","héritage","jackpot"]),
    points:    8,
    indicator: "lottery_keywords",
  }],
  ["unknown", {
    // "urgency" n'a pas de type propre, on l'associe à unknown
    keywords:  new Set(["urgent","immédiat","vite","dernier délai"]),
    points:    5,
    indicator: "urgency_keywords",
  }],
  ["investment", {
    keywords:  new Set(["crypto","bitcoin","investissement","rendement","multiplier"]),
    points:    6,
    indicator: "investment_keywords",
  }],
]);

const URL_RE = /https?:\/\//;

/**
 * Analyse heuristique rapide (sans IA).
 * Utilisée quand l'API Mistral n'est pas disponible ou a échoué.
 */
function localFallback(text: string): AIResult {
  const lower = text.toLowerCase();
  const indicators: string[] = [];
  let score = 0;

  let dominantType: ScamType = "unknown";
  let dominantScore = 0;

  for (const [scamType, group] of KEYWORD_GROUPS) {
    const matched = [...group.keywords].filter((w) => lower.includes(w));
    if (matched.length === 0) continue;

    const groupScore = group.points * Math.min(matched.length, 3);
    score += groupScore;
    indicators.push(`${group.indicator}: ${matched.slice(0, 3).join(", ")}`);

    if (groupScore > dominantScore) {
      dominantScore = groupScore;
      dominantType  = scamType;
    }
  }

  if (URL_RE.test(text)) {
    score += 8;
    indicators.push("url_presente");
  }

  score = Math.min(100, score);

  return {
    score,
    risk: scoreToRisk(score),
    type: dominantType,
    explanation: indicators.length > 0
      ? `Analyse locale (sans IA) : ${indicators.length} groupe(s) de mots-clés détecté(s). Activez l'API Mistral pour une analyse approfondie.`
      : "Aucun indicateur suspect détecté par l'analyse locale.",
    confidence: 25,
    language:   detectLanguageSimple(text),
    indicators,
  };
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/** Borne `n` entre `min` et `max`. Retourne `min` si `n` est NaN. */
function clamp(n: number, min: number, max: number): number {
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}

function validateRisk(value: unknown): RiskLevel {
  return VALID_RISK_LEVELS.has(value as RiskLevel) ? (value as RiskLevel) : "suspicious";
}

function validateScamType(value: unknown): ScamType {
  return VALID_SCAM_TYPES.has(value as ScamType) ? (value as ScamType) : "unknown";
}

function validateLanguage(value: unknown): SupportedLanguage {
  if (value === "fr" || value === "en") return value;
  return "unknown";
}

function parseIndicators(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[])
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.substring(0, 200))
    .slice(0, 20);
}

// Sets pré-compilés une seule fois pour le détecteur de langue
const FR_WORDS = new Set(["le","la","les","un","une","est","sont","je","tu","il","nous","vous","ils"]);
const EN_WORDS = new Set(["the","a","an","is","are","i","you","he","she","we","they"]);

function detectLanguageSimple(text: string): SupportedLanguage {
  let fr = 0, en = 0;
  for (const word of text.toLowerCase().split(/\s+/)) {
    if (FR_WORDS.has(word)) fr++;
    if (EN_WORDS.has(word)) en++;
  }
  if (fr > en) return "fr";
  if (en > fr) return "en";
  return "unknown";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}