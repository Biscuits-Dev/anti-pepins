// lib/validation/report.ts
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export interface RawReportInput {
  scamType:     unknown;
  incidentDate: unknown;
  description:  unknown;
  amount?:      unknown;
  contactEmail?: unknown;
  receiveCopy?: unknown;
  needHelp?:    unknown;
}

export interface ValidatedReportInput {
  scamType:     string;
  incidentDate: string;
  description:  string;
  amount:       number | null;
  contactEmail: string | null;
  receiveCopy:  boolean;
  needHelp:     boolean;
}

export type ReportValidationResult =
  | { ok: true;  data: ValidatedReportInput }
  | { ok: false; errors: string[] };

export function isRawReportInput(value: unknown): value is RawReportInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return ['scamType', 'incidentDate', 'description'].every((k) => k in obj);
}

function sanitizeString(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string' || email.trim().length === 0) return null;
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) return "Le format de l'email est invalide.";
  return null;
}

function parseAmount(amount: unknown): number | null {
  if (typeof amount === 'number') return amount;
  if (typeof amount === 'string' && amount.trim().length > 0) {
    const parsed = Number.parseFloat(amount.trim());
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function extractEmail(email: unknown): string | null {
  if (typeof email !== 'string' || email.trim().length === 0) return null;
  return email.trim().toLowerCase();
}

export function validateReportInput(raw: RawReportInput): ReportValidationResult {
  const errors: string[] = [];

  if (typeof raw.scamType !== 'string' || raw.scamType.trim().length === 0) {
    errors.push("Le type d'arnaque est requis.");
  }

  if (typeof raw.incidentDate !== 'string' || raw.incidentDate.trim().length === 0) {
    errors.push("La date de l'incident est requise.");
  }

  if (typeof raw.description !== 'string' || sanitizeString(raw.description).length < 20) {
    errors.push('La description doit contenir au moins 20 caractères.');
  }

  const emailError = validateEmail(raw.contactEmail);
  if (emailError) errors.push(emailError);

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      scamType:     (raw.scamType as string).trim(),
      incidentDate: (raw.incidentDate as string).trim(),
      description:  sanitizeString(raw.description as string),
      amount:       parseAmount(raw.amount),
      contactEmail: extractEmail(raw.contactEmail),
      receiveCopy:  Boolean(raw.receiveCopy),
      needHelp:     Boolean(raw.needHelp),
    },
  };
}
