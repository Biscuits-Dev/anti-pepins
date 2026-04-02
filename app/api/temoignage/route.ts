import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const SCAM_TYPES = [
  'phishing', 'romance', 'fake-shop', 'investment',
  'tech-support', 'sms-livraison', 'lottery', 'fake-job',
  'identity', 'harassment', 'autre',
] as const;

function sanitizeString(value: string): string {
  return value
    .replaceAll(/<[^>]*>/g, '')
    .replaceAll(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

const TemoignageSchema = z.object({
  prenom: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'Le prénom ne peut pas être vide après nettoyage'),

age: z
  .number()
  .int('L\'âge doit être un entier')
  .min(10, 'L\'âge minimum est 10 ans')
  .max(120, 'L\'âge maximum est 120 ans'),

scamType: z.enum(SCAM_TYPES),

  incidentDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Date invalide')
    .refine((v) => {
      const date = new Date(v);
      const now = new Date();
      const minDate = new Date('2000-01-01');
      return date >= minDate && date <= now;
    }, 'La date doit être entre 2000 et aujourd\'hui'),

  content: z
    .string()
    .min(20, 'Le témoignage doit contenir au moins 20 caractères')
    .max(5000, 'Le témoignage ne peut pas dépasser 5000 caractères')
    .transform(sanitizeString)
    .refine((v) => v.length >= 20, 'Le témoignage est trop court après nettoyage'),
});

type TemoignageInput = z.infer<typeof TemoignageSchema>;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; 

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 10 * 60 * 1000);

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url?.trim() || !key?.trim()) {
    throw new Error('Variables d\'environnement Supabase manquantes');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return errorResponse('Content-Type invalide. JSON requis.', 415);
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && Number.parseInt(contentLength, 10) > 32_768) {
    return errorResponse('Payload trop volumineux.', 413);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return errorResponse(
      'Trop de soumissions. Veuillez réessayer plus tard.',
      429,
      { retryAfter }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse('Corps de la requête invalide.', 400);
  }

  const parsed = TemoignageSchema.safeParse(rawBody);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    console.warn('[temoignage] validation échouée:', fieldErrors);
    return errorResponse('Données invalides.', 400, { fieldErrors });
  }

  const data: TemoignageInput = parsed.data;

  let supabase: ReturnType<typeof getSupabaseClient>;
  try {
    supabase = getSupabaseClient();
  } catch (err) {
    console.error('[temoignage] config Supabase manquante:', err);
    return errorResponse('Erreur de configuration serveur.', 500);
  }

  const { error: dbError } = await supabase.from('temoignages').insert({
    prenom:        data.prenom,
    age:           data.age,
    scam_type:     data.scamType,
    incident_date: data.incidentDate,
    content:       data.content,
    ip_address:    ip,
    user_agent:    request.headers.get('user-agent')?.slice(0, 512) ?? null,
  });

  if (dbError) {
    console.error('[temoignage] erreur Supabase:', {
      code:    dbError.code,
      message: dbError.message,
      hint:    dbError.hint,
    });
    return errorResponse('Erreur lors de l\'enregistrement du témoignage.', 500);
  }

  return NextResponse.json(
    { success: true, message: 'Témoignage enregistré avec succès. Il sera publié après modération.' },
    { status: 201 }
  );
}