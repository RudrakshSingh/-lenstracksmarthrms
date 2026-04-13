/**
 * JTS / tasks API — user-visible copy (prod Hinglish) + optional dev hints.
 * Map `error` or `code` from JSON body (e.g. TASK_CODE_DUPLICATE).
 */

export type JtsErrorEntry = {
  prod: string;
  /** Shown only when NODE_ENV === 'development' or opts.dev === true */
  devHint?: string;
};

export const JTS_ERROR_MESSAGES: Record<string, JtsErrorEntry> = {
  TASK_CODE_DUPLICATE: {
    prod:
      'Is task ka number pehle se database mein hai — ek baar dubara save / create try karein. Masla backend counter / race se hota hai; dobara try karte hi naya number milna chahiye.',
    devHint:
      'E11000 on tasks index tenant_id+code. Fixed server-side with TaskCodeCounter + retry; if still see this, check legacy rows / counter sync.',
  },
  JTS_ACTOR_EMPLOYEE_NOT_RESOLVED: {
    prod:
      'System ko abhi aapka JTS employee link nahi mila. Pehle catalog bind (bind-from-jwt) complete karein ya admin se sync karwa lein.',
    devHint: 'POST /api/jts/catalog/employees/bind-from-jwt with Bearer + X-Tenant-Id.',
  },
  JTS_TENANT_HEADER_MISMATCH: {
    prod:
      'X-Tenant-Id galat hai — isko JWT wale tenant se match karein (Upcapto ke liye exactly upcapto, lowercase). Purana localStorage / cookie hata kar dubara login karein.',
    devHint:
      'Header must equal JWT tenantId slug or JTS ObjectId; lenstrack header + upcapto token → 403.',
  },
  EMPLOYEE_001_NOT_FOUND: {
    prod:
      'HR employee record nahi mila — pehle is user ke liye HR /employees mein row banao (same email + tenant), phir JTS bind dubara try karein.',
    devHint:
      'Upcapto admin: HR DB mein admin@upcapto.com missing → bind-from-jwt fails; see docs/UPCAPTO_ADMIN_LOGIN_PROD_ERRORS_APRIL_2026.md.',
  },
};

export function getJtsErrorMessage(
  code: string | undefined | null,
  opts?: { dev?: boolean }
): string {
  const c = String(code || '').trim();
  const entry = JTS_ERROR_MESSAGES[c];
  if (!entry) return '';
  const isDev = opts?.dev === true || process.env.NODE_ENV === 'development';
  const hint = isDev && entry.devHint ? ` (${entry.devHint})` : '';
  return entry.prod + hint;
}

/** Prefer server `message`, then mapped copy from `error` / `code`. */
export function resolveJtsErrorBody(body: unknown, opts?: { dev?: boolean }): string {
  if (!body || typeof body !== 'object') return '';
  const o = body as Record<string, unknown>;
  const serverMsg = typeof o.message === 'string' ? o.message.trim() : '';
  const errCode = (o.error || o.code) as string | undefined;
  const mapped = getJtsErrorMessage(errCode, opts);
  if (mapped) return mapped;
  return serverMsg;
}
