import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPermissionApi } from './permissionApi';

/**
 * Pass your public API origin, e.g. process.env.NEXT_PUBLIC_API_URL || 'https://api.etelios.com'
 */
export function usePermissionApi(apiBase: string) {
  return useMemo(() => createPermissionApi(apiBase), [apiBase]);
}

export function usePermissionCatalog(token: string | null, tenantId: string, apiBase: string) {
  const api = usePermissionApi(apiBase);
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof api.getCatalog>>['data']>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.getCatalog(token, tenantId);
      setCatalog(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [api, token, tenantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { catalog, loading, error, reload };
}

export function useUserPermissions(
  userId: string | null,
  token: string | null,
  tenantId: string,
  apiBase: string
) {
  const api = usePermissionApi(apiBase);
  const [data, setData] = useState<
    Awaited<ReturnType<typeof api.getUser>>['data'] | undefined
  >();
  const [etag, setEtag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.getUser(token, tenantId, userId);
      setData(r.data);
      setEtag(r.etag || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [api, token, tenantId, userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, etag, loading, error, reload };
}

export async function runPreviewThenSave(
  apiBase: string,
  opts: {
    token: string;
    tenantId: string;
    userId: string;
    custom_permissions: string[];
    permission_denials: string[];
    ifMatch?: string;
  }
) {
  const api = createPermissionApi(apiBase);
  const prev = await api.previewEscalation(opts.token, opts.tenantId, opts.userId, {
    custom_permissions: opts.custom_permissions,
    permission_denials: opts.permission_denials
  });
  if (!prev.success || !prev.data?.allowed) {
    const msg = prev.data?.message || prev.message || 'Escalation check failed';
    throw new Error(msg);
  }
  return api.patchOverrides(
    opts.token,
    opts.tenantId,
    opts.userId,
    {
      custom_permissions: opts.custom_permissions,
      permission_denials: opts.permission_denials
    },
    opts.ifMatch
  );
}
