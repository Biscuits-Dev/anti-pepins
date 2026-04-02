/**
 * @file database.ts
 * Base de données en mémoire pour la gestion des listes et de l'historique.
 *
 * Améliorations :
 *  - ReportedScam exporté pour usage externe
 *  - Normalisation extraite en helper réutilisable
 *  - Stats immutables retournées par valeur
 *  - Import/export avec validation des données entrantes
 */

import type { ListEntry, AnalysisHistory, AnalyzableType, ScamType, RiskLevel } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportedScam {
  readonly id: string;
  readonly value: string; // masqué
  readonly type: AnalyzableType;
  readonly score: number;
  readonly scamTypes: readonly ScamType[];
  readonly reportedAt: string; // ISO 8601
  readonly details: string;
}

// ─── Structure interne ────────────────────────────────────────────────────────

interface Db {
  blacklist:     Map<string, ListEntry>;
  whitelist:     Map<string, ListEntry>;
  history:       Map<string, AnalysisHistory>;
  reportedScams: Map<string, ReportedScam>;
}

const db: Db = {
  blacklist:     new Map(),
  whitelist:     new Map(),
  history:       new Map(),
  reportedScams: new Map(),
};

// ─── Données par défaut ───────────────────────────────────────────────────────

const DEFAULT_BLACKLIST: readonly Omit<ListEntry, "addedAt">[] = [
  { value: "amaz0n.com", type: "url", reason: "Domain spoofing – imitation d'Amazon",  addedBy: "system" },
  { value: "paypaI.com", type: "url", reason: "Domain spoofing – imitation de PayPal",  addedBy: "system" },
  { value: "g00gle.com", type: "url", reason: "Domain spoofing – imitation de Google",  addedBy: "system" },
] as const;

const DEFAULT_WHITELIST: readonly Omit<ListEntry, "addedAt">[] = [
  // Domaines officiels Biscuits IA / Anti-Pépins
  { value: "biscuits-ia.com",         type: "url", reason: "Domaine officiel Biscuits IA 🍪",        addedBy: "system" },
  { value: "anti-pepins.biscuits-ia.com", type: "url", reason: "Domaine officiel Anti-Pépins 🛡️",   addedBy: "system" },
  // Autres domaines de confiance
  { value: "google.com",         type: "url", reason: "Domaine de confiance",                        addedBy: "system" },
  { value: "amazon.com",         type: "url", reason: "Domaine de confiance",                        addedBy: "system" },
  { value: "paypal.com",         type: "url", reason: "Domaine de confiance",                        addedBy: "system" },
  { value: "impots.gouv.fr",     type: "url", reason: "Site gouvernemental français",                addedBy: "system" },
  { value: "ameli.fr",           type: "url", reason: "Site officiel de l'Assurance Maladie",        addedBy: "system" },
  { value: "laposte.fr",         type: "url", reason: "Site officiel de La Poste",                   addedBy: "system" },
  { value: "service-public.fr",  type: "url", reason: "Portail officiel de l'administration française", addedBy: "system" },
] as const;

function initDb(): void {
  const now = new Date().toISOString();
  for (const entry of DEFAULT_BLACKLIST) {
    if (!db.blacklist.has(entry.value)) db.blacklist.set(entry.value, { ...entry, addedAt: now });
  }
  for (const entry of DEFAULT_WHITELIST) {
    if (!db.whitelist.has(entry.value)) db.whitelist.set(entry.value, { ...entry, addedAt: now });
  }
}

initDb();

// ─── Normalisation ────────────────────────────────────────────────────────────

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

// ─── Blacklist ────────────────────────────────────────────────────────────────

export function isInBlacklist(value: string): boolean {
  const key = normalizeKey(value);
  if (db.blacklist.has(key)) return true;
  for (const k of db.blacklist.keys()) {
    if (key.includes(k) || k.includes(key)) return true;
  }
  return false;
}

export function addToBlacklist(
  value: string,
  type: AnalyzableType,
  reason: string,
  addedBy = "user",
): ListEntry {
  const entry: ListEntry = {
    value:   normalizeKey(value),
    type,
    reason,
    addedAt: new Date().toISOString(),
    addedBy,
  };
  db.blacklist.set(entry.value, entry);
  return entry;
}

export function removeFromBlacklist(value: string): boolean {
  return db.blacklist.delete(normalizeKey(value));
}

export function getBlacklist(): ListEntry[] {
  return Array.from(db.blacklist.values());
}

// ─── Whitelist ────────────────────────────────────────────────────────────────

export function isInWhitelist(value: string): boolean {
  const key = normalizeKey(value);
  if (db.whitelist.has(key)) return true;
  for (const k of db.whitelist.keys()) {
    if (key.includes(k)) return true;
  }
  return false;
}

export function addToWhitelist(
  value: string,
  type: AnalyzableType,
  reason: string,
  addedBy = "user",
): ListEntry {
  const entry: ListEntry = {
    value:   normalizeKey(value),
    type,
    reason,
    addedAt: new Date().toISOString(),
    addedBy,
  };
  db.whitelist.set(entry.value, entry);
  return entry;
}

export function removeFromWhitelist(value: string): boolean {
  return db.whitelist.delete(normalizeKey(value));
}

export function getWhitelist(): ListEntry[] {
  return Array.from(db.whitelist.values());
}

// ─── Historique ───────────────────────────────────────────────────────────────

export function addToHistory(
  id: string,
  inputType: AnalyzableType,
  inputValue: string,
  score: number,
  risk: RiskLevel,
  scamTypes: readonly ScamType[],
): AnalysisHistory {
  const entry: AnalysisHistory = {
    id,
    inputType,
    inputValue: maskValue(inputValue, inputType),
    score,
    risk,
    scamTypes,
    timestamp: new Date().toISOString(),
    reported:  false,
  };
  db.history.set(id, entry);
  return entry;
}

export function getHistory(limit = 50): AnalysisHistory[] {
  return Array.from(db.history.values())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export function getHistoryEntry(id: string): AnalysisHistory | undefined {
  return db.history.get(id);
}

export function markAsReported(id: string): boolean {
  const entry = db.history.get(id);
  if (!entry) return false;
  entry.reported = true;
  return true;
}

export function clearHistory(): void {
  db.history.clear();
}

// ─── Signalements ─────────────────────────────────────────────────────────────

export function addReportedScam(
  value: string,
  type: AnalyzableType,
  score: number,
  scamTypes: readonly ScamType[],
  details: string,
): ReportedScam {
  const id = `scam_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const scam: ReportedScam = {
    id,
    value: maskValue(value, type),
    type,
    score,
    scamTypes,
    reportedAt: new Date().toISOString(),
    details,
  };
  db.reportedScams.set(id, scam);
  return scam;
}

export function getReportedScams(limit = 50): ReportedScam[] {
  return Array.from(db.reportedScams.values())
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
    .slice(0, limit);
}

// ─── Statistiques ─────────────────────────────────────────────────────────────

interface DbStats {
  readonly blacklistCount: number;
  readonly whitelistCount: number;
  readonly historyCount: number;
  readonly reportedScamsCount: number;
  readonly recentAnalyses: number;
  readonly scamRate: number;
}

export function getDatabaseStats(): DbStats {
  const history = Array.from(db.history.values());
  const oneDayAgo = Date.now() - 86_400_000;

  const recentAnalyses = history.filter(
    (h) => new Date(h.timestamp).getTime() > oneDayAgo,
  ).length;

  const scamCount = history.filter((h) => h.score >= 50).length;
  const scamRate  = history.length > 0
    ? Math.round((scamCount / history.length) * 100)
    : 0;

  return {
    blacklistCount:     db.blacklist.size,
    whitelistCount:     db.whitelist.size,
    historyCount:       db.history.size,
    reportedScamsCount: db.reportedScams.size,
    recentAnalyses,
    scamRate,
  };
}

// ─── Import / Export ──────────────────────────────────────────────────────────

export function exportDatabase(): string {
  return JSON.stringify({
    blacklist:     getBlacklist(),
    whitelist:     getWhitelist(),
    history:       getHistory(1_000),
    reportedScams: getReportedScams(1_000),
    exportedAt:    new Date().toISOString(),
  }, null, 2);
}

export function importDatabase(json: string): void {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json) as Record<string, unknown>;
  } catch {
    console.error("[database] JSON invalide lors de l'import");
    return;
  }

  const importList = <T extends { value: string }>(
    raw: unknown,
    map: Map<string, T>,
  ): void => {
    if (!Array.isArray(raw)) return;
    for (const entry of raw as T[]) {
      if (typeof entry?.value === "string") map.set(entry.value, entry);
    }
  };

  const importById = <T extends { id: string }>(
    raw: unknown,
    map: Map<string, T>,
  ): void => {
    if (!Array.isArray(raw)) return;
    for (const entry of raw as T[]) {
      if (typeof entry?.id === "string") map.set(entry.id, entry);
    }
  };

  importList(data.blacklist, db.blacklist);
  importList(data.whitelist, db.whitelist);
  importById(data.history,       db.history       as Map<string, AnalysisHistory & { id: string }>);
  importById(data.reportedScams, db.reportedScams  as Map<string, ReportedScam   & { id: string }>);
}

export function resetDatabase(): void {
  db.blacklist.clear();
  db.whitelist.clear();
  db.history.clear();
  db.reportedScams.clear();
  initDb();
}

// ─── Masquage des données ─────────────────────────────────────────────────────

function maskValue(value: string, type: AnalyzableType): string {
  if (type === "phone") {
    const digits = value.replaceAll(/\D/g, "");
    return digits.length > 4 ? "*".repeat(digits.length - 4) + digits.slice(-4) : value;
  }
  if (type === "email") {
    const [local, domain] = value.split("@");
    if (local && domain && local.length > 3) {
      return `${local[0]}***${local.slice(-1)}@${domain}`;
    }
  }
  return value;
}