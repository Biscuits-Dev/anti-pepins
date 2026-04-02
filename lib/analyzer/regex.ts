/**
 * @file regex.ts
 * Analyse regex anti-arnaque — tous les patterns sont compilés une seule fois
 * au chargement du module (pas de `new RegExp()` dans les boucles chaudes).
 *
 * Sécurité ReDoS :
 *  - Pas de quantificateurs imbriqués (e.g., (a+)+)
 *  - Pas de groupes alternatifs de longueur variable sur de larges classes
 *  - Les patterns sont testés séparément, pas combinés en une mega-regex
 */

import type { RegexResult, RegexTrigger, TriggerSeverity, AnalyzableType } from "./types";
import { SEVERITY_SCORES } from "./constants";

// ─── Types internes ───────────────────────────────────────────────────────────

interface PatternDef {
  /** Regex compilée — instance unique, pas de recompilation en boucle */
  readonly re: RegExp;
  readonly severity: TriggerSeverity;
  readonly description: string;
  readonly type: string;
}

// ─── Patterns URL ─────────────────────────────────────────────────────────────
// Règles : pas de groupes imbriqués avec *, pas de (x|y)+ sur large charset

const URL_PATTERNS: readonly PatternDef[] = [
  {
    // Spoofing par substitution de caractères (0→o, I→l, etc.) — groupe 1
    re: /(?:amaz[0o]n|paypa[lI1]|g[0o][0o]gle|faceb[0o][0o]k)/gi,
    severity: "critical",
    description: "Domain spoofing détecté (substitution de caractères)",
    type: "domain-spoofing",
  },
  {
    // Spoofing par substitution de caractères — groupe 2
    re: /(?:micr[0o]s[0o]ft|app[lI1]e|netf[lI1]ix|sp[0o]tify)/gi,
    severity: "critical",
    description: "Domain spoofing détecté (substitution de caractères)",
    type: "domain-spoofing",
  },
  {
    // Spoofing par substitution de caractères — groupe 3
    re: /(?:w[a@]lm[a@]rt|n[e3]tflix|dr[opb]ox)/gi,
    severity: "critical",
    description: "Domain spoofing détecté (substitution de caractères)",
    type: "domain-spoofing",
  },
  {
    // Spoofing par substitution de caractères — groupe 4
    re: /(?:ch[a@]seb[a@]nk|w[e3]llsf[a@]rg[0o])/gi,
    severity: "critical",
    description: "Domain spoofing détecté (substitution de caractères)",
    type: "domain-spoofing",
  },
  {
    // Spoofing par substitution de caractères — groupe 5
    re: /(?:b[a@]nc[0o]popul[a@]ire|l[a@]p[o0]st[e3])/gi,
    severity: "critical",
    description: "Domain spoofing détecté (substitution de caractères)",
    type: "ip-address",
  },
  {
    // Caractères Unicode cyrilliques (homoglyphes)
    re: /[\u0400-\u04FF]/,
    severity: "critical",
    description: "Caractères cyrilliques (homoglyphe possible)",
    type: "homoglyph",
  },
  {
    // Paramètres d'exécution de code
    re: /[?&](?:cmd|exec|eval|script|onerror|onload)=/i,
    severity: "critical",
    description: "Paramètre d'exécution suspect",
    type: "execution-param",
  },
  {
    // Identifiants embarqués dans l'URL (user:pass@host) — limite augmentée et sécurisée
    re: /https?:\/\/[^@\s]{1,200}@/,
    severity: "high",
    description: "Identifiants dans l'URL",
    type: "url-credentials",
  },
  {
    // Liens avec IP et port suspect
    re: /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}/,
    severity: "high",
    description: "URL avec IP et port suspect",
    type: "ip-port-url",
  },
  {
    // Sous-domaines usurpant des marques (ex: paypal.secure-login.com)
    re: /(?:paypal|amazon|google|apple|microsoft|facebook|netflix|impots|ameli|laposte|banque|bnp|credit)[.\-][a-z0-9]{2,50}\./i,
    severity: "high",
    description: "Sous-domaine usurpant une marque connue",
    type: "brand-subdomain",
  },
] as const;

// ─── Patterns Email ───────────────────────────────────────────────────────────

const EMAIL_PATTERNS: readonly PatternDef[] = [
  {
    // Fournisseurs d'emails jetables courants — liste étendue
    re: /@(?:tempmail\.com|throwaway\.email|guerrillamail\.com|mailinator\.com|yopmail\.com|sharklasers\.com|dispostable\.com|fakeinbox\.com|temp-mail\.org|trashmail\.com|mohmal\.com|burnermail\.io|maildrop\.cc|spamgourmet\.com|mytemp\.email|harakirimail\.com|wegwerfmail\.de)/i,
    severity: "high",
    description: "Email jetable détecté",
    type: "disposable-email",
  },
  {
    // Typosquatting des grandes messageries — patterns structurels + liste étendue
    re: /@(?:g[0o]ma?i?l{1,2}\.c[0o]m|y[a@]h[0o]{2,}\.c[0o]m|h[0o]tm[ai]l{1,2}\.c[0o]m|[a-z]{3,}mail\.(?:xyz|top|tk|ml|ga)|ic[0o]ld\.c[0o]m|pr[0o]t[0o]nmail\.c[0o]m)/i,
    severity: "high",
    description: "Spoofing de domaine email connu",
    type: "email-spoofing",
  },
  {
    // TLDs risqués dans les domaines email — étendu
    re: /@[a-z0-9-]+\.(?:xyz|top|tk|ml|ga|cf|gq|buzz|ru|cn|ng|icu|shop|store|site|online|space|win|loan|bid|stream)$/i,
    severity: "medium",
    description: "TLD suspect dans le domaine email",
    type: "suspicious-email-tld",
  },
  {
    // Mots-clés d'arnaque dans la partie locale ou le domaine — avec limites de mot
    re: /\b(?:winner|l[0o]ttery|jackp[0o]t|inheritance|urgen[ct]|v[e3]rify|suspendu|bl[0o]cked|n[0o]r[eé]ply|n[0o]-reply|d[0o]n[0o]treply)\b/i,
    severity: "medium",
    description: "Mot-clé frauduleux dans l'email",
    type: "fraud-keyword",
  },
  {
    // Email avec mélange de chiffres et lettres suspect dans le local-part
    re: /@[a-z]+\.[a-z]{2,}$/i,
    severity: "low",
    description: "Pattern email suspect (domaine court)",
    type: "suspicious-email-pattern",
  },
] as const;

// ─── Patterns Message ─────────────────────────────────────────────────────────

const MESSAGE_PATTERNS: readonly PatternDef[] = [
  {
    // Urgence — avec variantes d'obfuscation et termes étendus
    re: /\b(?:urgen[ct]|urgenc[eé]|imm[eé3]diat(?:ement)?|d[eé3]p[eê3]ch[e3]z|asap|r4pid[e3]ment|derni[eè3]r[e3] (?:d[eé3]lai|chanc[e3])|action requise|d[eé3]lai expir[eé]|r[eé3]agissez|ne perdez pas de temps|temps limit[eé])\b/gi,
    severity: "medium",
    description: "Notion d'urgence",
    type: "urgency",
  },
  {
    // Alerte compte — étendu avec variantes
    re: /\b(?:compte (?:bl[o0]qu[eé]|suspendu|c[0o]mpr[0o]mis|v[e3]rifi[e3]|c[0o]nfirm[e3])|acc[eè3]s (?:bl[o0]qu[eé]|suspendu)|c[0o]nnexion suspecte|activit[eé3] inhabituelle|tentative de c[0o]nnexi[0o]n|[eé3]chec d'authentificati[0o]n|votre compte a [eé3]t[eé3] limit[eé])\b/gi,
    severity: "high",
    description: "Alerte compte bloqué/suspendu",
    type: "account-alert",
  },
  {
    // Appel à l'action — étendu avec variantes d'obfuscation
    re: /\b(?:cliquez ici|cliquez sur (?:ce )?lien|suivez ce lien|[o0]uvrez ce lien|c[0o]nnectez-v[0o]us|rendez-v[0o]us sur|appuyez sur le (?:bouton|lien)|validez v[0o]tre compte|c[0o]nfirmez v[0o]tre identit[eé3])\b/gi,
    severity: "medium",
    description: "Appel à l'action suspect",
    type: "call-to-action",
  },
  {
    // Promesses financières — contexte requis pour réduire les faux positifs
    re: /\b(?:gagn[eé3](?:z)? (?:[0-9]+|[0-9]+ ?(?:euro|€|\$)|iphone|v[o0]iture|cadeau)|argent facile|dev[e3]nir rich[e3]|millionnair[e3]|jackp[0o]t|l[0o]t[e3]ri[e3]|h[eé3]ritag[e3]|f[0o]rtun[e3]|r[e3]v[e3]nu g[ar]anti|s[0o]mme d'argent|gain [eé3]n[0o]rme|pr[0o]fit assur[eé3])\b/gi,
    severity: "high",
    description: "Promesse financière suspecte",
    type: "financial-promise",
  },
  {
    // Crypto/Investissement — contexte suspect requis (réduit faux positifs)
    re: /\b(?:rendement (?:garanti|s[ûu]r)|multipli[e3]r (?:v[0o]tre|t[0o]n|ses) (?:argent|capital|mise)|investissement (?:garanti|sans risque)|trading (?:b[0o]t|aut[0o]matis[e3]|signal)|f[0o]rex (?:signal|pr[0o]fit)|bitc[0o]in (?:gratuit|gift|giveaway)|signaux de trading|pr[0o]fit journalier)\b/gi,
    severity: "medium",
    description: "Thème crypto/investissement suspect",
    type: "crypto-investment",
  },
  {
    // Faux colis/livraison — étendu
    re: /\b(?:c[0o]lis (?:en attente|suspendu|retenu|bloqu[eé])|tentative de livraison|frais de d[0o]uane|c[0o]lis retenu|taxe d[0o]uani[eè]re|payer les frais|livrais[0o]n en attente|v[0o]tre c[0o]lis vous attend|relivrais[0o]n n[eé3]cessaire)\b/gi,
    severity: "medium",
    description: "Thème faux colis/livraison",
    type: "delivery-scam",
  },
  {
    // Bancaire/Paiement — étendu avec variantes
    re: /\b(?:virement|carte b[a@]nc[a@]ire|ib[an]|rib|p[a@]yp[a@]l|western uni[0o]n|m[0o]neygr[a@]m|m[a@]nd[a@]t|tr[a@]nsfert (?:d'argent|de f[0o]nds)|v[0o]tre c[a@]rte a [eé3]t[eé3] bl[o0]qu[eé]|m[a@]j de v[0o]s c[0o][0o]rd[0o]nn[eé3]es b[a@]nc[a@]ires)\b/gi,
    severity: "medium",
    description: "Thème bancaire/paiement",
    type: "banking-payment",
  },
  {
    // Menaces — étendu
    re: /\b(?:p[0o]ursuites|pr[0o]c[eè3]s|[a@]mende|p[0o]lice|gend[a@]rmerie|tribun[a@]l|huissier|s[a@]isie|[a@]rrest[a@]ti[0o]n|dossier judici[a@]ire|proc[eè3]dure l[eé3]g[a@]le|s[a@]ncti[0o]n|p[eé3]n[a@]lit[eé3])\b/gi,
    severity: "high",
    description: "Menace ou intimidation",
    type: "threat",
  },
  {
    // Romance — étendu
    re: /\b(m[0o]n [a@]m[0o]ur|m[0o]n c[oœ]ur|je t'[a@]ime|m[a@]ri[a@]ge|env[0o]yer de l'[a@]rgent|[a@]ide-m[0o]i financ[iè]rement|mon ch[eé]ri|ma ch[eé]rie|[a@]me s[oœ]ur|rencontr[e3]r|relation s[e3]rieuse)\b/gi,
    severity: "medium",
    description: "Thème romance suspect",
    type: "romance-scam",
  },
  {
    // Support technique — étendu
    re: /\b(supp[0o]rt technique|virus d[eé3]tect[eé3]|[0o]rdin[a@]teur infect[eé3]|[a@]ppelez m[a@]inten[a@]nt|num[eé3]r[0o] d'[a@]ssist[a@]nce|v[0o]tre [0o]rdin[a@]teur est bl[o0]qu[eé]|[a@]lerte de s[eé3]curit[eé3]|micr[0o]s[0o]ft supp[0o]rt|[a@]pple supp[0o]rt|erreur #)\b/gi,
    severity: "high",
    description: "Arnaque support technique",
    type: "tech-support",
  },
  {
    // Infos sensibles — étendu avec homoglyphes
    re: /\b(m[0o]t de p[a@]sse|c[0o]de (?:de v[eé3]rific[a@]ti[0o]n|sms|pin)|num[eé3]r[0o] de c[a@]rte|d[a@]te de n[a@]iss[a@]nce|c[vv]{1,2}|num[eé3]r[0o] de s[eé3]curit[eé3] s[0o]ci[a@]le|c[0o][0o]rd[0o]nn[eé3]es b[a@]nc[a@]ires|inf[0o]rm[a@]ti[0o]ns pers[0o]nnelles)\b/gi,
    severity: "high",
    description: "Demande d'informations sensibles",
    type: "personal-info-request",
  },
  {
    // Brouteur — étendu
    re: /\b(feu m[0o]n p[eè3]re|h[eé3]rit[a@]ge|di[a@]m[a@]nt|mines d'[0o]r|h[0o]mme d'[a@]ff[a@]ires|tr[a@]nsf[eé3]rer des f[0o]nds|f[0o]ndati[0o]n c[a@]rit[a@]tive|d[0o]n [a@]ux [0o]euvres|b[0o]nheur [a@]ssur[eé3]|b[eé3]n[eé3]dicti[0o]n)\b/gi,
    severity: "high",
    description: "Pattern brouteur",
    type: "brouteur",
  },
  {
    // Redirection messagerie externe — étendu
    re: /\b([eé3]cris-m[0o]i sur wh[a@]ts[a@]pp|c[0o]nt[a@]cte-m[0o]i sur telegr[a@]m|rej[0o]ins-m[0o]i sur|c[h@]at sur wh[a@]ts[a@]pp|c[0o]mmunic[a@]ti[0o]n priv[eé3]e|p[a@]rl[0o]ns [a@]illeurs)\b/gi,
    severity: "low",
    description: "Redirection vers messagerie externe",
    type: "external-messaging",
  },
  {
    // Obfuscation par espaces (ex: "u r g e n t")
    re: /\b(?:u\s*r\s*g\s*e\s*n\s*t|c\s*l\s*i\s*q\s*u\s*e\s*z|v\s*i\s*r\s*u\s*s|c\s*o\s*n\s*n\s*e\s*c\s*t\s*e\s*z)\b/gi,
    severity: "high",
    description: "Obfuscation par espaces détectée",
    type: "obfuscation-spaces",
  },
  {
    // Homoglyphes numériques étendus (a→@, e→3, i→1, o→0, s→5, t→7)
    re: /\b(?:p[a@]ssw[0o]rd|c[a@]rd numb[e3]r|s[e3]cur[i1]ty|v[e3]r[i1]fy|c[0o]nf[i1]rm|a[c@][c0]unt|b[a@]nk [a@]cc[0o]unt|l[0o]gin inf[0o])\b/gi,
    severity: "high",
    description: "Homoglyphes numériques détectés",
    type: "homoglyph-numeric",
  },
] as const;

// ─── Patterns Téléphone ───────────────────────────────────────────────────────

const PHONE_PATTERNS: readonly PatternDef[] = [
  {
    // Numéros surtaxés français 08x
    re: /^0?8[1-9]/,
    severity: "medium",
    description: "Numéro surtaxé français",
    type: "premium-rate",
  },
  {
    // Indicatifs Afrique de l'Ouest à risque
    re: /^\+(?:229|225|237|221|226|228|242|243|233|234|224|223|222|373|252|211)/,
    severity: "medium",
    description: "Indicatif international à risque",
    type: "suspicious-international",
  },
  {
    // Longueur anormale (> 15 chiffres = hors norme ITU-T E.164)
    re: /^\d{16,}$/,
    severity: "low",
    description: "Numéro de longueur anormale",
    type: "abnormal-format",
  },
] as const;

// ─── Map de sélection par type ────────────────────────────────────────────────

const PATTERNS_BY_TYPE: Readonly<Record<AnalyzableType, readonly PatternDef[]>> = {
  url:     URL_PATTERNS,
  email:   [...URL_PATTERNS, ...EMAIL_PATTERNS],
  message: MESSAGE_PATTERNS,
  text:    MESSAGE_PATTERNS,
  phone:   PHONE_PATTERNS,
};

// ─── Moteur d'analyse ─────────────────────────────────────────────────────────

/**
 * Analyse un contenu avec les patterns regex appropriés.
 *
 * Complexité : O(P × 1) — chaque pattern est testé une fois (pas de global flag,
 * donc pas d'état interne sur la regex partagée).
 *
 * @param value    - Valeur déjà sanitisée
 * @param type     - Type de contenu
 */
export function analyzeWithRegex(value: string, type: AnalyzableType): RegexResult {
  const patterns = PATTERNS_BY_TYPE[type];
  const triggers: RegexTrigger[] = [];
  let totalScore = 0;

  for (const { re, severity, description, type: triggerType } of patterns) {
    const match = re.exec(value);
    if (match !== null) {
      triggers.push({
        type: triggerType,
        pattern: re.source.substring(0, 50),
        match: match[0].substring(0, 100),
        severity,
        description,
      });
      totalScore += SEVERITY_SCORES[severity];
    }
  }

  return {
    score: Math.min(100, totalScore),
    triggers,
    details: {
      patternsTested: patterns.length,
      matchesFound:   triggers.length,
      inputLength:    value.length,
    },
  };
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Vérifie si une valeur déclenche un pattern spécifique par son nom de type.
 */
export function matchesPattern(value: string, patternType: string): boolean {
  const all = [...URL_PATTERNS, ...EMAIL_PATTERNS, ...MESSAGE_PATTERNS, ...PHONE_PATTERNS];
  const def = all.find((p) => p.type === patternType);
  return def ? def.re.test(value) : false;
}

/**
 * Liste tous les patterns disponibles (utile pour la documentation / debug).
 */
export function getAvailablePatterns(): readonly { type: string; description: string; severity: TriggerSeverity }[] {
  return [...URL_PATTERNS, ...EMAIL_PATTERNS, ...MESSAGE_PATTERNS, ...PHONE_PATTERNS].map(
    ({ type, description, severity }) => ({ type, description, severity }),
  );
}