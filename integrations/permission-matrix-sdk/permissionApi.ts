/**
 * Permission admin API — auth-service /api/permission (or /api/user, same router).
 * Set base URL to your API host (e.g. https://api.etelios.com).
 */

export type PermissionCatalogResponse = {
  success: boolean;
  data?: {
    catalogVersion: number;
    groups: Array<{
      id: string;
      label: string;
      items: Array<{ id: string; label: string }>;
    }>;
    flat: string[];
    count: number;
  };
  message?: string;
};

export type UserPermissionDetailResponse = {
  success: boolean;
  data?: {
    userId: string;
    tenantId: string;
    role: string;
    permissionsRevision: number;
    catalogVersion: number;
    customPermissions: string[];
    permissionDenials: string[];
    effectivePermissions: string[];
    rolePermissions: string[];
    legacyUserPermissions: string[];
    count: number;
  };
  message?: string;
};

export type EscalationPreviewResponse = {
  success: boolean;
  data?: {
    allowed: boolean;
    code: string;
    message?: string;
    blockingPermission?: string;
    effectiveBefore: string[];
    effectiveAfter: string[];
    added: string[];
    removed: string[];
    proposedCustomPermissions: string[];
    proposedPermissionDenials: string[];
  };
  message?: string;
};

function headers(
  token: string,
  tenantId: string,
  extra?: Record<string, string>
): HeadersInit {
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...extra
  };
  if (tenantId) h['X-Tenant-Id'] = tenantId;
  return h;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    throw new Error(text || res.statusText);
  }
  if (!res.ok) {
    const msg = (body as { message?: string }).message || res.statusText;
    throw new Error(msg);
  }
  return body;
}

export function createPermissionApi(apiBase: string) {
  const base = apiBase.replace(/\/$/, '');

  return {
    async getCatalog(token: string, tenantId: string) {
      const res = await fetch(`${base}/api/permission/catalog`, {
        headers: headers(token, tenantId)
      });
      return parseJson<PermissionCatalogResponse>(res);
    },

    async getUser(token: string, tenantId: string, userId: string) {
      const res = await fetch(`${base}/api/permission/user/${userId}`, {
        headers: headers(token, tenantId)
      });
      const etag = res.headers.get('ETag') || '';
      const json = await parseJson<UserPermissionDetailResponse>(res);
      return { ...json, etag };
    },

    async previewEscalation(
      token: string,
      tenantId: string,
      userId: string,
      body: { custom_permissions: string[]; permission_denials: string[] }
    ) {
      const res = await fetch(`${base}/api/permission/user/${userId}/escalation-preview`, {
        method: 'POST',
        headers: headers(token, tenantId, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body)
      });
      return parseJson<EscalationPreviewResponse>(res);
    },

    async patchOverrides(
      token: string,
      tenantId: string,
      userId: string,
      body: { custom_permissions: string[]; permission_denials: string[] },
      ifMatch?: string
    ) {
      const h = headers(token, tenantId, { 'Content-Type': 'application/json' });
      if (ifMatch) (h as Record<string, string>)['If-Match'] = ifMatch;
      const res = await fetch(`${base}/api/permission/user/${userId}/overrides`, {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify(body)
      });
      return parseJson(res);
    },

    async putIncremental(
      token: string,
      tenantId: string,
      userId: string,
      body: {
        permissions: string[];
        action: 'add' | 'remove' | 'replace';
        permission_denials?: string[];
      },
      ifMatch?: string
    ) {
      const h = headers(token, tenantId, { 'Content-Type': 'application/json' });
      if (ifMatch) (h as Record<string, string>)['If-Match'] = ifMatch;
      const res = await fetch(`${base}/api/permission/user/${userId}`, {
        method: 'PUT',
        headers: h,
        body: JSON.stringify(body)
      });
      return parseJson(res);
    },

    async resetOverrides(token: string, tenantId: string, userId: string, ifMatch?: string) {
      const h = headers(token, tenantId);
      if (ifMatch) (h as Record<string, string>)['If-Match'] = ifMatch;
      const res = await fetch(`${base}/api/permission/user/${userId}/reset`, {
        method: 'POST',
        headers: h
      });
      return parseJson(res);
    },

    async listUsers(token: string, tenantId: string, query?: Record<string, string>) {
      const q = new URLSearchParams(query || {}).toString();
      const url = `${base}/api/permission/users${q ? `?${q}` : ''}`;
      const res = await fetch(url, { headers: headers(token, tenantId) });
      return parseJson(res);
    }
  };
}
