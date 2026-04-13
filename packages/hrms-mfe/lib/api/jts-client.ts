/**
 * JTS HTTP client aligned to **jts-service** routes (Option B — frontend follows backend).
 * Browser base is typically `/api` with Next proxy → `/api/jts/...`.
 *
 * Path roots:
 * - Task stack: `{apiBase}/jts/tasks`
 * - Timer list (active): `{apiBase}/jts` (not under `/tasks`)
 * - HRMS compat: `{apiBase}/jts` (analytics, approvals, reviews, self-tasks)
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface JtsClientConfig {
  /**
   * Prefix before `/jts`. Default `/api` (same-origin proxy).
   * For direct service origin that already serves `/api/jts`, use `''` and set paths accordingly, or full origin URL.
   */
  apiBase?: string;
  getAccessToken: () => string | null | Promise<string | null>;
  getTenantId?: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
}

/** Map UI “decision” strings to JTS task review API body. */
export type TaskReviewDecision = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export function mapReviewDecisionToApiBody(input: {
  decision: TaskReviewDecision;
  notes?: string;
  rating?: number;
}): { status: 'APPROVED' | 'REWORK_REQUIRED'; remarks?: string; rating?: number } {
  return {
    status: input.decision === 'APPROVE' ? 'APPROVED' : 'REWORK_REQUIRED',
    remarks: input.notes,
    rating: input.rating
  };
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

export function createJtsPathBuilder(apiBase = '/api') {
  const root = joinUrl(apiBase, '/jts');
  const tasks = joinUrl(root, '/tasks');
  return {
    root,
    tasks,
    task: (id: string) => joinUrl(tasks, `/${id}`),
    taskSub: (id: string, sub: string) => joinUrl(tasks, `/${id}${sub.startsWith('/') ? sub : `/${sub}`}`),
    /** Active timer rows for JWT user (`employeeId` query is ignored by service today). */
    timerActiveFirst: () => joinUrl(root, '/active'),
    timerActiveSecond: () => joinUrl(root, '/timers/active')
  };
}

export class JtsClient {
  private readonly apiBase: string;

  private readonly paths: ReturnType<typeof createJtsPathBuilder>;

  constructor(private readonly config: JtsClientConfig) {
    this.apiBase = config.apiBase ?? '/api';
    this.paths = createJtsPathBuilder(this.apiBase);
  }

  private async headers(): Promise<HeadersInit> {
    const token = await this.config.getAccessToken();
    const tenantId = this.config.getTenantId ? await this.config.getTenantId() : null;
    const h: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    if (token) {
      h.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    if (tenantId) {
      h['X-Tenant-Id'] = String(tenantId);
    }
    return h;
  }

  async request<T = unknown>(
    url: string,
    init: RequestInit & { method?: HttpMethod } = {}
  ): Promise<T> {
    const fetchFn = this.config.fetchImpl ?? fetch;
    const res = await fetchFn(url, {
      ...init,
      headers: { ...(await this.headers()), ...init.headers },
      cache: 'no-store'
    });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      const err = new Error(`JTS ${init.method || 'GET'} ${url} → ${res.status}`) as Error & {
        status: number;
        body: unknown;
      };
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body as T;
  }

  // --- Tasks CRUD & list ---
  listTasks(query?: Record<string, string | number | boolean | undefined>) {
    const q = query ? `?${new URLSearchParams(stringifyQuery(query))}` : '';
    return this.request(`${this.paths.tasks}${q}`);
  }

  createTask(body: unknown) {
    return this.request(this.paths.tasks, { method: 'POST', body: JSON.stringify(body) });
  }

  /**
   * Employee self-task (pending manager approval when policy requires it).
   * Prefer this over `createTask` for non-manager users — `createTask` hits POST /tasks which is manager-only.
   */
  createSelfTask(body: unknown) {
    return this.request(`${this.paths.root}/self-tasks`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  getTask(id: string, query?: Record<string, string | undefined>) {
    const q = query ? `?${new URLSearchParams(query as Record<string, string>)}` : '';
    return this.request(`${this.paths.task(id)}${q}`);
  }

  updateTask(id: string, body: unknown) {
    return this.request(this.paths.task(id), { method: 'PUT', body: JSON.stringify(body) });
  }

  deleteTask(id: string) {
    return this.request(this.paths.task(id), { method: 'DELETE' });
  }

  /**
   * Summary: use `/summary/me` or `/summary/:employeeId` (no `GET .../summary?employeeId=` on service).
   */
  getTaskSummaryMe(date?: string) {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request(`${this.paths.tasks}/summary/me${q}`);
  }

  getTaskSummaryForEmployee(employeeId: string, date?: string) {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request(`${this.paths.tasks}/summary/${employeeId}${q}`);
  }

  /** Try me first, then explicit employee id (optional convenience; not a single backend route). */
  async getTaskSummaryPreferred(opts: { employeeId?: string; date?: string }) {
    if (opts.employeeId) {
      return this.getTaskSummaryForEmployee(opts.employeeId, opts.date);
    }
    return this.getTaskSummaryMe(opts.date);
  }

  // --- Lifecycle ---
  acceptTask(id: string) {
    return this.request(this.paths.taskSub(id, '/accept'), { method: 'POST', body: '{}' });
  }

  rejectTask(id: string, body: { reason?: string }) {
    return this.request(this.paths.taskSub(id, '/reject'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  startTask(id: string, body: { reason?: string } = {}) {
    return this.request(this.paths.taskSub(id, '/start'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  completeTask(id: string, body: { notes?: string } = {}) {
    return this.request(this.paths.taskSub(id, '/complete'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /** Manager+ override: skips checklist/timer blocks and review queue (POST .../force-complete). */
  forceCompleteTask(id: string, body: { notes?: string } = {}) {
    return this.request(this.paths.taskSub(id, '/force-complete'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  patchTaskStatus(id: string, body: { status: string; reason?: string }) {
    return this.request(this.paths.taskSub(id, '/status'), {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  reopenTask(id: string, body: { reason?: string } = {}) {
    return this.request(this.paths.taskSub(id, '/reopen'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  cancelTask(id: string, body: { reason?: string } = {}) {
    return this.request(this.paths.taskSub(id, '/cancel'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  submitTaskForReview(id: string, body: { reason?: string } = {}) {
    return this.request(this.paths.taskSub(id, '/submit-review'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  blockTask(id: string, body: { reason?: string; blockedReason?: string }) {
    return this.request(this.paths.taskSub(id, '/block'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  unblockTask(id: string, body: { reason?: string } = {}) {
    return this.request(this.paths.taskSub(id, '/unblock'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Preferred: POST .../extension-requests (resolves approver from task if omitted).
   * Same underlying row as {@link createExtensionApproval}.
   */
  createExtensionRequest(
    taskId: string,
    body: {
      approverEmployeeId?: string;
      approver_employee_id?: string;
      newDueAt?: string;
      due_at?: string;
      extensionMinutes?: number;
      reason?: string;
    }
  ) {
    return this.request(this.paths.taskSub(taskId, '/extension-requests'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Extension: create task approval via collaboration route (legacy).
   * Prefer {@link createExtensionRequest} when approver can default from the task.
   */
  createExtensionApproval(
    taskId: string,
    body: {
      approver_employee_id: string;
      payload?: Record<string, unknown>;
    }
  ) {
    return this.request(this.paths.taskSub(taskId, '/approvals'), {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        approval_type: 'EXTENSION_APPROVAL'
      })
    });
  }

  // --- Task review (quality) — POST body uses `status`, not `decision` ---
  submitTaskReview(
    taskId: string,
    body: { status: 'APPROVED' | 'REWORK_REQUIRED'; notes?: string; rating?: number; remarks?: string; checklist_score?: number }
  ) {
    const payload = {
      status: body.status,
      rating: body.rating,
      remarks: body.remarks ?? body.notes,
      checklist_score: body.checklist_score
    };
    return this.request(this.paths.taskSub(taskId, '/reviews'), {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  submitTaskReviewFromDecision(
    taskId: string,
    input: { decision: TaskReviewDecision; notes?: string; rating?: number }
  ) {
    return this.submitTaskReview(taskId, mapReviewDecisionToApiBody(input));
  }

  // --- Timer ---
  getTaskTimer(taskId: string) {
    return this.request(this.paths.taskSub(taskId, '/timer'));
  }

  startTaskTimer(taskId: string) {
    return this.request(this.paths.taskSub(taskId, '/timer/start'), { method: 'POST', body: '{}' });
  }

  pauseTaskTimer(taskId: string) {
    return this.request(this.paths.taskSub(taskId, '/timer/pause'), { method: 'POST', body: '{}' });
  }

  stopTaskTimer(taskId: string) {
    return this.request(this.paths.taskSub(taskId, '/timer/stop'), { method: 'POST', body: '{}' });
  }

  getTaskTimerSessions(taskId: string, limit?: number) {
    const q = limit != null ? `?limit=${encodeURIComponent(String(limit))}` : '';
    return this.request(`${this.paths.taskSub(taskId, '/timer/sessions')}${q}`);
  }

  /** Tries `/jts/active` then `/jts/timers/active`. */
  async getActiveTimers(): Promise<unknown> {
    try {
      return await this.request(this.paths.timerActiveFirst());
    } catch (e) {
      const err = e as { status?: number };
      if (err.status === 404) {
        return this.request(this.paths.timerActiveSecond());
      }
      throw e;
    }
  }

  // --- Subtasks, comments, attachments ---
  listSubtasks(taskId: string) {
    return this.request(this.paths.taskSub(taskId, '/subtasks'));
  }

  listComments(taskId: string) {
    return this.request(this.paths.taskSub(taskId, '/comments'));
  }

  addComment(taskId: string, body: { message?: string; body?: string }) {
    return this.request(this.paths.taskSub(taskId, '/comments'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  listAttachments(taskId: string) {
    return this.request(this.paths.taskSub(taskId, '/attachments'));
  }

  presignAttachmentUpload(taskId: string, body: { file_name: string; mime_type: string }) {
    return this.request(this.paths.taskSub(taskId, '/attachments/presign-upload'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // --- SLA ---
  getTaskSla(taskId: string) {
    return this.request(this.paths.taskSub(taskId, '/sla'));
  }

  listSlaAlerts(query?: { employeeId?: string; employee_id?: string; teamId?: string; limit?: number }) {
    const q = query ? `?${new URLSearchParams(stringifyQuery(query))}` : '';
    return this.request(`${this.paths.tasks}/sla/alerts${q}`);
  }

  // --- Approvals (HRMS compat under /jts) ---
  listPendingApprovals(query?: { approverId?: string; approvalType?: string }) {
    const q = query ? `?${new URLSearchParams(stringifyQuery(query))}` : '';
    return this.request(`${this.paths.root}/approvals/pending${q}`);
  }

  approveApproval(approvalId: string, body: { notes?: string } = {}) {
    return this.request(`${this.paths.root}/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  rejectApproval(approvalId: string, body: { reason: string }) {
    return this.request(`${this.paths.root}/approvals/${approvalId}/reject`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // --- Analytics & performance reviews ---
  /**
   * Full bundle (`meta.view: full`). Query: `timeRange`, `department`, `teamId`.
   */
  getAnalytics(query?: Record<string, string | undefined>) {
    const q = query ? `?${new URLSearchParams(query as Record<string, string>)}` : '';
    return this.request(`${this.paths.root}/analytics${q}`);
  }

  /** Slice: overall + byStatus + openAlerts (`meta.view: overview`). */
  getAnalyticsOverview(query?: Record<string, string | undefined>) {
    const q = query ? `?${new URLSearchParams(query as Record<string, string>)}` : '';
    return this.request(`${this.paths.root}/analytics/overview${q}`);
  }

  /** Per-assignee task counts (`meta.view: by-employee`). */
  getAnalyticsByEmployee(query?: Record<string, string | undefined>) {
    const q = query ? `?${new URLSearchParams(query as Record<string, string>)}` : '';
    return this.request(`${this.paths.root}/analytics/by-employee${q}`);
  }

  /** Org-node / department rollup (`meta.view: by-team`). */
  getAnalyticsByTeam(query?: Record<string, string | undefined>) {
    const q = query ? `?${new URLSearchParams(query as Record<string, string>)}` : '';
    return this.request(`${this.paths.root}/analytics/by-team${q}`);
  }

  /** Counts by task type (`meta.view: by-task-type`). */
  getAnalyticsByTaskType(query?: Record<string, string | undefined>) {
    const q = query ? `?${new URLSearchParams(query as Record<string, string>)}` : '';
    return this.request(`${this.paths.root}/analytics/by-task-type${q}`);
  }

  listPerformanceReviews(query?: Record<string, string | undefined>) {
    const q = query ? `?${new URLSearchParams(query as Record<string, string>)}` : '';
    return this.request(`${this.paths.root}/reviews${q}`);
  }

  // --- Timeline & workday ---
  /** Service exposes `activities`, not `timeline`. */
  getTaskTimeline(taskId: string, limit?: number) {
    const q = limit != null ? `?limit=${encodeURIComponent(String(limit))}` : '';
    return this.request(`${this.paths.taskSub(taskId, '/activities')}${q}`);
  }

  listWorkdayTasks(workdayId: string, query?: Record<string, string | number | boolean | undefined>) {
    const q = query ? `?${new URLSearchParams(stringifyQuery(query))}` : '';
    return this.request(`${this.paths.tasks}/workday/${encodeURIComponent(workdayId)}${q}`);
  }

  // --- Bulk (jts-service POST /tasks/bulk) ---
  bulkTasks(body: {
    action: 'complete' | 'force_complete' | 'accept' | 'reject' | 'start' | 'cancel';
    taskIds: string[];
    payload?: { notes?: string; reason?: string };
  }) {
    return this.request(`${this.paths.tasks}/bulk`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
}

function stringifyQuery(q: Record<string, string | number | boolean | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return out;
}
