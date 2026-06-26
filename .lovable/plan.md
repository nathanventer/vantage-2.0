## Phase 1 Visual & Layout QA Pass

Pure styling/layout audit — no features, no logic, no data/auth changes. Brand colors will be added as new tokens so existing semantic tokens keep working; only visual rules below get adjusted.

### 1. Brand color tokens (src/styles.css)
Map the spec'd brand palette onto existing semantic tokens so every screen inherits the fix in one place:
- `--primary` (sidebar/navy) → `#0F2147`
- `--accent` (royal active/CTA) → `#1E5BB8`
- `--background` → `#F5F7FA`
- `--border` → `#AEB8C4` (silver)
- success `#15803D`, warning `#B45309`, destructive `#B91C1C`, neutral silver
- card radius → 8px (`--radius: 0.5rem`)
- Add Inter via `<link>` in `src/routes/__root.tsx` head, set `--font-sans` and `--font-display` to Inter
- Tighten dark-mode pairs to stay consistent (no logic change)

### 2. Sidebar (`AppSidebar.tsx`)
- Navy `#0F2147` bg, white text, royal `#1E5BB8` active item with subtle highlight (already wired via tokens after step 1; verify `--sidebar`, `--sidebar-primary`, `--sidebar-accent`)
- Normalize nav item spacing: consistent icon size (16px), 12px gap, 8px vertical padding, label vertical-aligned with icon
- Collapsed state: icon-only logo (hide wordmark + tagline); expanded: full wordmark + small tagline line
- Fix logo tile: `bg-white p-1 rounded-md`, prevent stretch

### 3. Top bar (`AppShell.tsx`)
- White bg (replace `.glass`), 1px bottom border `#AEB8C4`
- Left: page title slot (use breadcrumbs/title), Right: search + role switcher + theme + bell + user — single row, `flex-nowrap`, no wrap
- Search collapses to icon on `<md`
- Sticky top, sidebar fixed left — verify no overlap at all viewport widths (use `var(--sidebar-width)` per Tailwind v4 fix)

### 4. Login / landing (`routes/index.tsx`)
- Tagline: "Insight · Intelligence · Opportunity · Growth" → re-render in sentence case `Insight · Intelligence · Opportunity · Growth` (already correct casing) but recolor to navy `#0F2147` and reposition: under wordmark on right panel and on mobile header
- Mobile header logo: white tile (not navy) so logo reads correctly
- Confirm logo sizing 40–48px, no distortion

### 5. Cards & page shell
- All `Card` components: white bg, 8px radius, 1px silver border, 16–24px padding (update `components/ui/card.tsx` defaults: `rounded-lg` → `rounded-[8px]`, `shadow` → `shadow-xs`, ensure border)
- StatCard: enforce uniform min-height (`min-h-[120px]`), aligned icon top-right, value 28px/600, label 11px uppercase — already close; tighten across all 3 dashboards
- Page wrapper: 24px padding (already `px-4 py-6 sm:px-6`), bump to `p-6 lg:p-8` consistently

### 6. Tables & lists (transactions, documents, users, registrations, audit, compliance)
- Header cells aligned with body cells (use `<Table>` consistently; remove ad-hoc grids where they drift)
- Long cells: add `truncate max-w-[Xch]` + `title=` tooltip
- Toolbar row: search + status filter on same flex row (`flex flex-wrap md:flex-nowrap items-center gap-2`)
- Empty state: centered inside the table container (`py-16 text-center`), not full-page

### 7. Forms & modals (register wizard, new transaction, drawers, dialogs)
- Labels above inputs, consistent `space-y-1.5`
- Footer actions right-aligned: `flex justify-end gap-2` in card/modal footers (Cancel ghost left of primary)
- Dialog: centered, semi-transparent overlay (shadcn default — verify), close `X` top-right (shadcn default — verify present, not hidden)

### 8. StatusBadge (`components/StatusBadge.tsx`)
- Re-map color tones to spec hexes via tokens (already done in step 1)
- `rounded-full`, `px-2.5 py-0.5`, `text-xs`, `whitespace-nowrap`, `inline-flex` — already set; audit usage sites for cells that constrain width and add `truncate` on the badge container if needed

### 9. Typography & spacing
- Body font Inter, headings 600, body 400 (set via tokens)
- Sentence-case sweep on page titles, section headings, button labels, sidebar group labels (currently UPPERCASE "WORKSPACE" / "OPERATIONS" / "GOVERNANCE" → sentence case)
- Card grid gap: `gap-4` (16px) standard; section gap `gap-6` (24px)
- Add `truncate` to long inline text spots that visibly clip

### 10. Verification
Run dev build, visit dashboard (each role), transactions list + detail, documents, register wizard, admin/registrations, admin/users, admin/audit, login. Take Playwright screenshots at 1280px and 390px; eyeball-check each rule above. Iterate on visible regressions only.

### Files touched (estimate)
- `src/styles.css` — tokens, radius, font vars
- `src/routes/__root.tsx` — Inter `<link>`
- `src/components/AppShell.tsx` — top bar styling
- `src/components/AppSidebar.tsx` — spacing, group label casing, logo
- `src/routes/index.tsx` — tagline color/position, mobile logo tile
- `src/components/ui/card.tsx` — radius/shadow defaults
- `src/components/StatCard.tsx` — min-height alignment
- `src/components/StatusBadge.tsx` — confirm tokens (no shape change)
- Table/toolbar tweaks in: `_app.transactions.index.tsx`, `_app.documents.tsx`, `_app.admin.registrations.tsx`, `_app.admin.users.tsx`, `_app.admin.audit.tsx`, `_app.admin.compliance.tsx`
- Sentence-case sweep across page headers & sidebar group labels

### Out of scope (will NOT change)
- `mockApi.ts`, `data/mock.ts`, `types/index.ts`, routes, auth, RLS, business logic
- New components/pages/features
- Design system identity (only fixing incorrect applications)
- Logo asset file