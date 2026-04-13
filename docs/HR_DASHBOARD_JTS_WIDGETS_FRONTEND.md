# HR unified dashboard — JTS fields for the frontend

`GET /api/hr/dashboard` (unified dashboard) may include:

## `data.widgets.tasks` (all roles)

Populated from JTS **`GET /api/jts/tasks/summary/me`** when `JTS_SERVICE_URL` is set and the user token is forwarded.

```ts
widgets.tasks: {
  total: number;
  pending: number;    // in-progress / open task states from JTS
  completed: number;
  source?: 'jts';
  jtsLinked?: boolean; // false if no JTS Employee row for this user
}
```

**UI:** Show counts; if `jtsLinked === false`, link to onboarding or “Bind tasks profile” (call `bind-from-jwt` or contact admin).

## `data.widgets.jtsTenant` (hr, admin, superadmin, **manager**)

Populated from JTS **`GET /api/jts/analytics`**.

```ts
widgets.jtsTenant?: {
  pendingTasks: number;
  completedTasks: number;
  onTimeCompletion: number | null;
  openAlerts: number;
  source: 'jts_analytics';
}
```

**UI:** Optional card “Tasks (tenant)” / “Open JTS alerts” for leadership roles.

## `GET /api/attendance/today` (attendance-service)

When **`ATTENDANCE_JTS_ENRICHMENT` ≠ `false`** and the request is **self**-scoped:

- If there is an attendance row: same object as before, plus **`jtsTasks`** `{ total, pending, completed, linked }`.
- If there is **no** row: `data` may be **`{ attendance: null, jtsTasks }`** (when `ATTENDANCE_JTS_ENRICH_WHEN_EMPTY` ≠ `false`) instead of **`null`** — adjust clients if they assumed `data === null`.

Set **`ATTENDANCE_JTS_ENRICH_WHEN_EMPTY=false`** to keep `data: null` when there is no attendance (no JTS block).
