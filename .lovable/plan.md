## Layout & Visual QA Pass — Plan

Scope: pure CSS/className fixes against the existing Phase 1 build. No logic, data, routing, or design-token changes.

### 1. AppShell + Sidebar (`src/components/AppShell.tsx`, `AppSidebar.tsx`)
- Lock viewport scroll to the main column:
  - Outer wrapper: add `h-dvh overflow-hidden`.
  - Right column: add `min-h-0 overflow-hidden`.
  - `<main>`: add `overflow-y-auto`.
- Header: add left padding/margin to `SidebarTrigger` (`ml-1`) so it doesn't merge with sidebar edge. Verify nothing wraps 768–1280px (search is `hidden md:block`, kept).
- Sidebar logo: add `mx-auto` to `<img>` so it centers in collapsed icon rail; keep `bg-white p-0.5 rounded` for navy contrast.
- Verify shadcn sidebar overlay/z-index behavior is unchanged on mobile.

### 2. Logo
- Confirm `h-8 w-8 object-contain` + white tile. No src or asset changes.

### 3. Data tables — wrap each in `<div className="overflow-x-auto w-full">` inside its card; add `whitespace-nowrap` to `TableHead` cells site-wide
Files to touch:
- `_app.transactions.index.tsx` (TxList)
- `_app.requests.tsx` (Quotes table)
- `_app.payments.tsx` (Invoices + Settlements)
- `_app.documents.tsx` (All documents)
- `_app.containers.tsx`
- `_app.cargo.tsx`
- `_app.transport.tsx`
- `_app.admin.registrations.tsx`
- `_app.admin.compliance.tsx`
- `_app.admin.audit.tsx`

Warehouse kanban (`_app.warehouse.tsx`): add `min-w-0` to card and `truncate` to client name div.

Easiest reusable fix: also patch `src/components/ui/table.tsx` `Table` wrapper from `overflow-auto` → keep, but add `w-full` to ensure it doesn't collapse. (Already `relative w-full overflow-auto` — sufficient; per-page wrappers still added per spec.)

### 4. StatCard (`src/components/StatCard.tsx`)
- Add `line-clamp-1` to the `delta` div so long delta text can't push card height.
- Icon container: add `shrink-0` so it never bleeds outside.

### 5. Dashboard charts (`_app.dashboard.tsx`)
- Add `overflow-visible` to chart cards so Recharts tooltips aren't clipped.
- Verify PieChart legend `wrapperStyle` already set; no change.
- Verify stacked single-column at 768–1024px doesn't overflow (no code change unless visible issue).

### 6. PageHeader (`src/components/PageHeader.tsx`)
- Already `flex-wrap gap-4 mb-6` — keep. Confirm `gap-3` is fine; leave as-is (existing `gap-4` satisfies spec).

### 7. StatusBadge column sizing
- In each table, set the Status `TableHead` to `className="w-px whitespace-nowrap"` so badge column shrink-wraps and badge isn't clipped. Apply across the table files listed in §3.

### 8. Register wizard (`src/routes/register.tsx`)
- Verify left rail `md:sticky md:top-6 self-start` doesn't exceed viewport; if needed add `md:max-h-[calc(100dvh-3rem)] md:overflow-y-auto`.
- Confirm step indicator circles aren't clipped (add `pl-1` to step row if needed).
- Mobile stacking: already grid → 1 col; verify no overlap.

### 9. Spacing
- No token/spacing-value changes. Only confirm card header/body padding consistency in cards I'm already editing; do not introduce new padding rules.

### Out of scope
- No changes to `mockApi.ts`, `data/mock.ts`, `types/`, routes, auth, business logic.
- No changes to `styles.css` tokens, `routeTree.gen.ts`, shadcn `sidebar.tsx` internals.
- No new files, components, or features.

### Verification
- After edits, run Playwright at 1280×1800 and 390×844 against `/dashboard`, `/transactions`, `/documents`, `/admin/registrations`, `/register`; screenshot and eyeball each rule.
