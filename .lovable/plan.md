
# Phase 1 Audit + Apple-Inspired Refinement

This pass is design polish + methodology completeness only. No new features, no Phase 2 work, no changes to `mockApi`, role context, or Supabase wiring. Existing stubs (SARS, e-sign, gateways, GPS, AI) remain stubs.

---

## §1 — Audit Report (current Phase 1 build)

| Area | Methodology requirement | Status | Notes |
|---|---|---|---|
| **A. Registration** | 1. Select category | Present | Step 1 of `/register` wizard |
| | 2. Registration forms | Present | Step 2 |
| | 3. Upload governance docs | Present | Step 3, 8 tiles |
| | 4. Automated verification UI | Present | Step 3.5 grid; all 8 items show |
| | 5. Compliance review by admin | Partial | Step 5 shows "Under Review" but no link back into the admin queue context |
| | 6. Approval / rejection notification | Partial | Step 6 only shows success; no rejection branch / reason |
| | 7. Account activation | Present | Step 7 credentials |
| | 8. Service profiling & onboarding | Present | Step 8 checkboxes |
| | **Final review before submit** | Missing | No summary/review screen between profiling and submit |
| | Save-and-continue (no data loss) | Partial | State is in-memory only, fine for demo, but no visual "saved" affordance |
| **B. Governance (8 checks)** | All 8 visible with status | Partial | Wizard step 4 renders them; no standalone Compliance Verification panel on the company profile / admin detail |
| | B-BBEE conditional copy | Missing | Shown as required, methodology says "where applicable" |
| **C. Role views** | Demand / Source / Admin distinct | Present | Role switcher + role-aware sidebar working |
| | Role switcher visibility | Partial | Lives in topbar, label is small; needs more elegance |
| **D. Shipment transaction (Phase 1)** | Demand creates request | Present | `/transactions/new` |
| | System matches providers + quotes | Present | Quotes panel on detail |
| | Accept / confirm flow | Partial | Quotes show status but no Accept / Confirm action buttons wired to UI state |
| | Service agreement generated | Missing | Methodology calls for an agreement artifact; not surfaced |
| | Documentation attached to txn | Partial | Documents page lists `transactionRef` but txn detail has no "Documents" tab |
| | Vertical status timeline | Present | `LifecycleStepper` |
| **E. Document management** | Template generation for all 9 types | Present | Template library grid |
| | Upload | Partial | "Use" button is decorative — no upload affordance / dropzone |
| | Version control | Partial | Version shown in table, no version-history view |
| | Audit trail per document | Missing | No per-doc audit drawer |
| | Secure archive | Partial | "Archived" status used; no archive view filter |
| | Access permissions | Missing | No permissions UI |
| | E-signature placeholder | Present | Signed column + card |
| **F. Admin console** | Compliance review queue | Present | `/admin/compliance` |
| | User approval/rejection | Partial | Approve/Reject buttons exist; no review drawer with the 8 governance checks + reason field |
| | Audit log | Present | `/admin/audit` |
| | User management | Missing | No users table route |
| **Global** | Loading skeletons | Present | |
| | Empty states | Partial | `EmptyState` exists; not used on every list |
| | Error states | Missing | No per-route error UI |
| | Dark mode parity | Partial | Tokens defined, no toggle, untested visually |
| | Keyboard focus rings / a11y | Partial | Relies on shadcn defaults; icon-only buttons missing aria-labels in places |
| | Numeric tabular-nums in tables | Missing | Not applied to currency/qty columns |

---

## §2 — What I will change

### 1. Design foundation (extend tokens, don't replace)
Update `src/styles.css`:
- Font stack: prepend `-apple-system, "SF Pro Display", "SF Pro Text"` before Inter / Plus Jakarta Sans.
- Add tokens: `--shadow-xs/sm/md/lg` (low-opacity layered), `--ease-apple: cubic-bezier(0.32,0.72,0,1)`, `--dur-fast/base/slow`, `--blur-glass`.
- Add utility classes: `.glass` (backdrop-blur + translucent bg), `.tabular`, `.hairline`.
- Tighten heading letter-spacing to `-0.02em`; enable `font-variant-numeric: tabular-nums` on `table, .tabular, [data-numeric]`.
- Verify dark-mode pairs for success/warning/info/neutral foregrounds (add the missing dark overrides).
- Add `@media (prefers-reduced-motion: reduce)` global override.

### 2. Shell + navigation
- `AppShell` header → frosted glass (`backdrop-blur`, `bg-card/70`, hairline bottom border, sticky).
- `AppSidebar` → tighter type, clearer active state (accent pill + 2px inset rail), section labels uppercase 11px tracked.
- `RoleSwitcher` → segmented control style (3 pills) on desktop, dropdown on mobile; clearer "Demo" label.
- Add a global theme toggle button (light/dark) — only UI; persists in `localStorage`.
- Add breadcrumbs component, used on transaction detail and admin sub-pages.

### 3. Reusable components (polish, no API changes)
- `DataTable` wrapper around shadcn `Table`: sticky header, 52px rows, hover row, sort indicator slot, right-align numeric helper, built-in skeleton + empty + error states.
- `StatusBadge` → add an icon dot (●) so status isn't color-only; keep label & semantics.
- `StatCard` → tighter hierarchy (label / metric / delta), tabular-nums, optional sparkline slot.
- `Section` and `Subheader` primitives for consistent spacing.
- `DetailDrawer` (right-side sheet) used for: registration review, document audit trail, user detail.
- `Dropzone` component (mock upload, drag-over state, per-file row with progress→verified).
- `ReviewSummary` for the registration final-review step.

### 4. Page refinements

**Landing `/`** — calm hero, role switcher front-and-centre with three large role cards (Demand / Source / Admin) that jump straight into the right dashboard; "Register your company" secondary CTA.

**Registration `/register`**
- Add **Step 4.5 Review** screen (between profiling and submit) with editable section summaries.
- Add an explicit **rejection** preview path (toggle in admin → reflected in the demo flow).
- B-BBEE marked "where applicable" with a skip toggle.
- Dropzone replaces the click-only tiles; live per-file verified pill.
- Persistent right-rail summary (company + completed steps).

**Compliance / Governance**
- New reusable `GovernancePanel` (8-cell grid with pending/verified/failed + next-action) used in: registration step 4, admin registration drawer, and a new tab on `/admin/compliance`.

**Dashboards** (per role)
- Quiet hero metric row (4 stat cards), then 2-col supporting grid.
- Recharts restyled: 1px muted gridlines, no chart border, accent series, tabular-nums tooltips.

**Transactions**
- List: refined `DataTable`, right-aligned ZAR with tabular-nums, status pills with dot.
- Detail: add **tabs** — Lifecycle · Quotes · Documents · Agreement · Activity. Wire Accept/Confirm buttons on quotes to local UI state (toast + status flip; no API change). Add a "Service Agreement" tab showing a generated agreement preview (template render from txn data, downloadable stub).

**Documents**
- Replace decorative "Use" with a Dropzone in a right-rail panel.
- Per-row actions: View, Versions, Audit trail (open `DetailDrawer`).
- Filter chips: All · Templates · Uploaded · Signed · Archived.
- Access-permissions read-only matrix card (roles × actions).

**Admin**
- Registrations: row click → `DetailDrawer` with `GovernancePanel`, document list, approve / reject (reason textarea required for reject), audit footer.
- Add **Users** route `/admin/users` — table of users with role, company, status, last login (mock).
- Audit log: timeline view with grouped days, readable timestamps, actor avatars.

### 5. States & accessibility (every screen)
- `EmptyState` wired on every list when data length is 0.
- `errorComponent` on every route file.
- aria-label on every icon-only button; visible focus ring (`ring-2 ring-ring`) via global CSS.
- Status badges get a leading dot so meaning isn't color-only.

### 6. Motion
- Centralize durations & easing on tokens; apply to: sheet/drawer, modal, tab switch, skeleton→content fade, hover lift on cards.
- Honor `prefers-reduced-motion`.

---

## §3 — Guardrails (will NOT do)

- No changes to `src/services/mockApi.ts`, `src/data/mock.ts`, `src/types/index.ts` shapes (additive only if essential).
- No new routes touching backend; Supabase wiring untouched.
- No real SARS / payment / GPS / AI / e-sign integration; stubs remain stubs.
- Existing color tokens preserved; new tokens are additive.
- Demo role switcher behavior preserved.

---

## §4 — Deliverables at end of build

1. Refined UI across landing, registration, dashboards, transactions (list + detail), documents, all admin pages.
2. Short changelog (added / refined / left-as-stub).
3. Confirmation checklist mapping every §1 audit row to **Present & reachable**.
4. The audit gaps marked *Missing/Partial* above will all be moved to **Present** except those explicitly noted as Phase 2 stubs.

---

## Build order (after approval)

1. Tokens + globals (`styles.css`) + new primitives (`DataTable`, `Dropzone`, `DetailDrawer`, `GovernancePanel`, `ReviewSummary`, `Breadcrumbs`, theme toggle).
2. Shell (header glass, sidebar, role switcher segmented).
3. Landing + Registration (incl. Review step + rejection path).
4. Transactions (tabs, agreement, accept/confirm UI).
5. Documents (dropzone, drawer, filters, permissions card).
6. Admin (review drawer, users route, audit timeline).
7. Dashboards polish + recharts restyle.
8. Pass on empty/error states + a11y sweep + dark-mode visual check.
9. Changelog + confirmation checklist.
