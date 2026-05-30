# Schema specification — v4

This document is the canonical specification of the app's data model. It describes every table, every field, every constraint, and every relationship.

It serves two purposes:
1. **Reference for the current localStorage implementation** in `src/modules/Database.js`
2. **Migration source for Supabase** when Stage 3 begins — these table definitions translate directly to SQL `CREATE TABLE` statements

If you change the data model, change this document **first**, then update `Database.js` to match, then update consumers.

---

## Conventions

Every table follows the same baseline shape:

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | Primary key. Generated client-side via `crypto.randomUUID()` so records work offline. |
| `created_at` | timestamptz | `now()` | When the record was first created. |
| `updated_at` | timestamptz | `now()` | Last modification time. Set on every `update()`. |
| `deleted_at` | timestamptz \| null | `null` | Soft-delete marker. Active rows have `deleted_at = null`. |

**Why soft delete:** preserves history for sync, audit, undo, and recovery from accidental deletes.

**ID format:** UUID v4 (`crypto.randomUUID()`). Strings like `'b3a91e2e-67b1-4f3c-9c0c-2ed5f17b8b1d'`. Never autoincrement integers — they collide across devices.

**Timestamps:** ISO 8601 strings (`'2026-05-21T08:14:22.000Z'`). Always UTC. Always include milliseconds.

**Foreign keys:** stored as the referenced UUID string. Naming convention: `<table>_id` (e.g. `user_id`, `session_id`).

**JSON columns:** for nested data that doesn't need its own table (e.g. user `profile.goals` array). In Postgres these become `jsonb`. In localStorage they're regular JS objects.

---

## Tables

### `users`

The people who use the app. Currently one user per device (Stage 4 will introduce auth and multi-user).

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `name` | text | yes | Display name |
| `email` | text | yes | Email; will be required after Stage 4 (auth) |
| `profile` | jsonb | no | See `users.profile` substructure below |
| `settings` | jsonb | no | See `users.settings` substructure below |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |
| `deleted_at` | timestamptz | yes | |

**`profile` shape:**
```json
{
  "age": 28,
  "bodyweight_kg": 80,
  "height_cm": null,
  "sex": null,
  "injuries": [
    { "id": "...uuid...", "label": "Left patellar tendon — mild", "flagged_at": "..." }
  ],
  "goals": [
    { "id": "...", "rank": 1, "label": "1:40 half marathon", "target_date": "2026-12-31" }
  ]
}
```

**`settings` shape:**
```json
{
  "units": "metric",
  "default_pool_length_m": 20,
  "theme": "paper"
}
```

**Supabase RLS:** `auth.uid() = id` once auth is set up.

---

### `training_plans`

A user's long-term programme. One active plan per user; older plans archived.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `users.id`, on delete cascade |
| `name` | text | no | E.g. "Hybrid 12-Month Plan" |
| `description` | text | yes | |
| `start_date` | date | yes | When training began |
| `target_end_date` | date | yes | Target completion |
| `status` | text | no | `active` \| `paused` \| `completed` \| `archived` |
| `template_ref` | text | yes | Soft reference into the static `Plan` module (e.g. `hybrid_v1`) |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |
| `deleted_at` | timestamptz | yes | |

---

### `phases`

A phase within a training plan (Foundation, Build, Peak, etc).

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `plan_id` | uuid | no | FK → `training_plans.id` |
| `template_phase_id` | int | no | References the static phase id in `Plan.js` (1..5) |
| `order` | int | no | Sequential order within the plan |
| `week_range_start` | int | no | Absolute week number (e.g. 5) |
| `week_range_end` | int | no | Absolute week number (e.g. 12) |
| `status` | text | no | `upcoming` \| `active` \| `completed` \| `skipped` |
| `started_at` | timestamptz | yes | |
| `completed_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |
| `deleted_at` | timestamptz | yes | |

---

### `weeks`

A single week of training within a phase.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `phase_id` | uuid | no | FK → `phases.id` |
| `week_number` | int | no | Absolute week (e.g. 5..56) |
| `week_in_phase` | int | no | Position within the phase (1..N) |
| `deload` | bool | no | True if this is a planned deload week |
| `status` | text | no | `upcoming` \| `active` \| `completed` \| `skipped` |
| `started_at` | timestamptz | yes | |
| `completed_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |
| `deleted_at` | timestamptz | yes | |

---

### `sessions`

A single training session (one workout). Carries a `template_ref` linking back to the static plan content.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `week_id` | uuid | yes | FK → `weeks.id`. Currently null for legacy-migrated sessions; populated when weeks are materialised. |
| `order` | int | yes | Position within the week (0..N) |
| `day_label` | text | yes | E.g. "Monday", "Tuesday PM" |
| `template_ref` | text | no | Soft reference into static `Plan` (e.g. `p1_wk5_s2`) |
| `status` | text | no | `pending` \| `in_progress` \| `completed` \| `skipped` |
| `scheduled_for` | timestamptz | yes | Planned start time (optional) |
| `started_at` | timestamptz | yes | Actual start |
| `completed_at` | timestamptz | yes | Actual completion |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |
| `deleted_at` | timestamptz | yes | |

**Note on `template_ref`:** the format is `p{phaseId}_wk{weekNum}_s{sessionIdx}`. This is the bridge between user-specific session state and the hand-curated programme content in `Plan.js`. Don't store the workout details here — they live in `Plan.js`.

---

### `session_logs`

The user's actual subjective experience of completing a session. One row per completed session.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `session_id` | uuid | no | FK → `sessions.id` |
| `user_id` | uuid | no | FK → `users.id` (denormalised for query convenience) |
| `started_at` | timestamptz | yes | Mirrored from `sessions` for query convenience |
| `completed_at` | timestamptz | yes | Mirrored from `sessions` |
| `duration_sec` | int | yes | Computed at completion |
| `quality` | int (1..5) | yes | Session quality |
| `energy` | int (1..5) | yes | Energy level coming into the session |
| `recovery` | int (1..5) | yes | Recovery level coming into the session |
| `notes` | text | no | Free-text, defaults to `""` |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |
| `deleted_at` | timestamptz | yes | |

---

### `weekly_checkins`

Subjective weekly metrics logged by the user.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `users.id` |
| `week_ending` | date | yes | Sunday of the week being logged |
| `bodyweight_kg` | numeric | yes | |
| `resting_hr` | numeric | yes | bpm |
| `avg_rpe` | numeric | yes | 1..10 |
| `sleep_score` | numeric | yes | 1..10 self-rated |
| `knee_rating` | numeric | yes | 0..10 (lower = better) |
| `notes` | text | no | Default `""` |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |
| `deleted_at` | timestamptz | yes | |

---

### `reassessments`

Quarterly reassessment questionnaire responses.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `users.id` |
| `quarter_number` | int | no | 1..4 (or higher as time goes on) |
| `period_end` | date | yes | End-date of the quarter being reflected on |
| `answers` | jsonb | no | `{ q1: "...", q2: "...", ... }` |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |
| `deleted_at` | timestamptz | yes | |

---

### `wearable_readings`  *(placeholder — Stage 5–6)*

Time-series physiological data from wearables and connected services.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `users.id` |
| `source` | text | no | `apple_watch` \| `garmin` \| `whoop` \| `strava` \| `fitbit` \| `google_health` \| `manual` |
| `recorded_at` | timestamptz | no | When the reading was actually taken (not when synced) |
| `metric` | text | no | See "Metrics catalogue" below |
| `value` | numeric | no | The value in canonical unit |
| `unit` | text | no | Canonical unit (`bpm`, `ms`, `min`, `m`, etc.) |
| `raw` | jsonb | yes | Source payload (debugging/audit) |
| `created_at` | timestamptz | no | When ingested |

**Metrics catalogue:**

| Metric | Unit | Notes |
|---|---|---|
| `hrv_rmssd` | ms | Best single recovery marker |
| `resting_hr` | bpm | |
| `sleep_duration` | min | |
| `sleep_efficiency` | percent | 0..100 |
| `sleep_deep` | min | |
| `sleep_rem` | min | |
| `spo2` | percent | |
| `steps` | count | |
| `active_minutes` | min | |
| `distance` | m | From Strava activities |
| `duration` | sec | From Strava activities |
| `avg_heart_rate` | bpm | |
| `perceived_effort` | score | 1..10 |

Index for efficient queries: `(user_id, metric, recorded_at desc)`.

---

### `ai_recommendations`  *(placeholder — Stage 8)*

LLM-generated coaching suggestions.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `users.id` |
| `context` | text | no | `session` \| `week` \| `phase` \| `recovery` |
| `ref_id` | uuid | yes | Polymorphic FK — the id of the entity the recommendation is about |
| `model` | text | yes | E.g. `claude-opus-4.7` |
| `prompt_summary` | text | yes | Short human-readable summary of what was asked |
| `recommendation` | text | no | The actual recommendation |
| `confidence` | numeric (0..1) | yes | Model-reported confidence |
| `accepted` | bool | yes | User's response (null = no decision yet) |
| `user_response` | text | yes | Free-text feedback |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |

---

## Indexes

When migrating to Postgres, create these:

```sql
create index on training_plans (user_id);
create index on phases (plan_id);
create index on weeks (phase_id);
create index on sessions (week_id);
create index on sessions (template_ref);
create index on session_logs (session_id);
create index on session_logs (user_id, completed_at desc);
create index on weekly_checkins (user_id, week_ending desc);
create index on wearable_readings (user_id, metric, recorded_at desc);
create index on ai_recommendations (user_id, created_at desc);
```

## Row Level Security (Supabase, Stage 3+)

Every table needs:

```sql
alter table <table> enable row level security;

create policy "Users can only access their own rows"
  on <table> for all
  using (auth.uid() = user_id);
```

For tables that don't have `user_id` directly (e.g. `sessions` has `week_id` not `user_id`), join through the parent table:

```sql
create policy "Users can only access their own sessions"
  on sessions for all
  using (
    week_id in (
      select w.id from weeks w
        join phases p on p.id = w.phase_id
        join training_plans pl on pl.id = p.plan_id
        where pl.user_id = auth.uid()
    )
  );
```

Alternative: denormalise `user_id` onto every table. Faster RLS, more storage. Reasonable trade-off.

---

## Migration history

- **v3 → v4** (current): flattened from `{ logs, sessions, reassess }` blob to ten typed tables. Handled automatically by `Database.migrateFromV3()` in `src/modules/Database.js`. Legacy keys retained for one release for safety.

Any future schema change must:
1. Update this document
2. Update `Database.SCHEMA` in `src/modules/Database.js`
3. Add a migration function (`migrateFromV4` etc.)
4. Bump the `version` in `appMeta`
5. Update `tests/data-layer.js` to assert the new shape
