# Claude implementation prompt — Naravich Sure CDN Manager

You are working inside the repository `NaravichPortalCDN`. Build a polished, production-quality frontend prototype for the self-hosted **Naravich Sure CDN Manager** inside the existing `dashboard/` Vite + React + TypeScript application.

Do not stop at a plan or static mockup. Inspect the repository, implement the UI, run the available checks, and leave the `dashboard/` app in a working state.

## Read these references first

Before writing code, inspect these files and assets:

- `../DESIGN.md` — the base design language. Follow its principles for typography, spacing, borders, radii, information density, restrained elevation, code surfaces, responsive behavior, and accessibility.
- `public/PNG/AW_Naravich Sure - logo (Draft1)_CR-01.png`
- `public/PNG/AW_Naravich Sure - logo (Draft1)_CR-02.png`
- `public/PNG/AW_Naravich Sure - logo (Draft1)_CR-03.png`
- The corresponding files under `public/JPEG/` as visual references for the intended light and dark backgrounds.
- Existing `package.json`, `src/App.tsx`, `src/index.css`, and `src/App.css` before replacing the Vite starter UI.

Do not modify `../DESIGN.md` or overwrite the original brand assets.

## Product context

This dashboard is used by internal staff to manage a central image-storage service running on an Ubuntu VPS.

Each website is represented as a Project. Staff can create and revoke API keys for a Project. Developers use those keys from their website backend to upload JPEG, PNG, or WebP images. The server validates and compresses each image to a maximum final size of 5 MB, stores it on the VPS filesystem, and returns a public CDN-style URL such as:

```text
https://cdn.example.com/website-a/2026/09/019c1234.webp
```

This task is frontend-only. Use realistic mock data and local interactions. Do not create a backend or make real network requests.

## Design direction

Use `DESIGN.md` as the structural foundation, but do **not** retain the Supabase emerald identity. Translate it into the Naravich Sure identity derived from the supplied logos.

The final product should feel:

- precise, calm, technical, trustworthy, and operational;
- light-first, clean, and data-dense without feeling crowded;
- appropriate for staff who spend hours reviewing projects, uploads, usage, API keys, and errors;
- like a real developer infrastructure console, not a generic admin template or marketing landing page.

Preserve these ideas from `DESIGN.md`:

- near-monochrome white/off-white surfaces;
- thin 1px hairline borders;
- restrained shadows used only for floating overlays;
- 6px buttons and inputs, 8–12px cards, 16px modals;
- medium-weight headings with tight letter spacing;
- monospace for keys, request IDs, URLs, paths, HTTP codes, and code samples;
- one visually dominant primary action per view;
- no atmospheric backgrounds, glassmorphism, oversized hero text, excessive pills, or decorative gradients.

## Naravich Sure brand translation

The supplied assets establish three useful logo treatments:

- `CR-01.png`: full-color black + cyan/teal logo for light surfaces. Use this as the primary brand mark.
- `CR-02.png`: black monochrome logo for light surfaces when a quieter treatment is needed.
- `CR-03.png`: white monochrome logo for dark surfaces.

The PNGs have transparency and should be preferred in the UI. The JPEGs are reference compositions for white and black backgrounds. The source images are extremely large; do not load multiple full-resolution copies throughout the UI. If necessary, create optimized derivatives for the app while preserving the originals.

Start from the following approximate tokens, then refine them by visually matching the supplied brand assets:

```css
--brand-cyan: #10a9c8;
--brand-teal: #5bc5be;
--brand-cyan-deep: #087f99;
--brand-cyan-soft: #e8f8fa;
--ink: #111719;
--ink-secondary: #354145;
--muted: #6d7a7e;
--muted-faint: #9da8ab;
--canvas: #ffffff;
--canvas-soft: #f7fafb;
--surface-subtle: #f1f6f7;
--hairline: #dde6e8;
--hairline-strong: #c6d2d5;
--code-surface: #111719;
--success: #238a64;
--warning: #b7791f;
--danger: #d64545;
```

Use a **solid cyan** for primary buttons rather than a gradient. The cyan-to-teal transition belongs primarily to the logo and may appear sparingly in charts or a thin storage-progress treatment. Do not turn the dashboard background or cards into gradients.

Use Inter for Latin UI text with a sensible Thai fallback such as `"Noto Sans Thai"`, `Tahoma`, and `sans-serif`. Use `ui-monospace` for technical values. Do not attempt to recreate the logo with text.

## Application shell

Build a responsive application shell with:

### Desktop

- A fixed/collapsible left sidebar around 248px wide.
- A compact top bar around 64px high.
- A fluid content area optimized for 1280–1600px screens.
- The full-color logo at the top of the light sidebar, scaled and cropped correctly without distortion.
- A workspace label such as `Naravich Sure CDN` near the logo, but do not duplicate the large logo wordmark unnecessarily.
- A Project selector in the top bar with `All projects` as the default.
- Global search, notifications, and a staff account menu.
- A visible `Upload asset` action where appropriate.

### Navigation

Use Lucide-style outline icons and the following items:

1. Overview
2. Projects
3. Assets
4. API Keys
5. Upload Logs
6. Usage
7. Users
8. Audit Logs
9. Settings

At the bottom of the sidebar show a compact server-health block with `Storage server online`, current disk usage, and a small progress bar.

### Mobile/tablet

- Collapse the sidebar into an accessible drawer.
- Preserve search, project context, and the primary action.
- Tables may become horizontally scrollable or switch to stacked rows.
- Keep tap targets at least 40px high.
- Do not merely shrink the desktop layout.

## Required views

Implement client-side navigation for all views below. Use a small routing dependency only if it materially improves the implementation; otherwise a well-structured state-driven SPA is acceptable.

### 1. Overview

Create a useful operations overview, not a hero section.

Include:

- Page title, concise supporting text, time-range filter, and `Upload asset` primary button.
- Four KPI cards:
  - Storage used: `386.4 GB / 1 TB`
  - Total assets: `48,239`
  - Bandwidth this month: `1.82 TB`
  - Upload success: `99.92%`
- Storage usage over time chart.
- Upload requests/success/failure chart for the last 30 days.
- Recent uploads table.
- System health card showing API, filesystem, MySQL, processor, disk, and last backup states.
- A small warning banner when disk usage approaches the configured threshold.

Charts can be implemented with accessible SVG/CSS or a lightweight chart library. Avoid visually loud multi-color dashboards; cyan/teal should dominate with semantic colors used only when meaningful.

### 2. Projects

Include:

- Search, status filter, and `Create project` button.
- A compact table or list with project name, slug, status, assets, storage, requests, active keys, and last activity.
- Realistic projects such as `Naravich Main Website`, `Partner Portal`, `Internal CMS`, and `Campaign Landing Pages`.
- Project details drawer/page with quota, allowed formats, max input size, max output size, compression settings, storage path, and recent activity.
- Create/edit project modal with validation and clear helper text.

### 3. Assets

Include:

- Search, project filter, format filter, date filter, and table/grid view toggle.
- Data table columns: preview, file name, project, output format, dimensions, original size, optimized size, saved percentage, status, uploaded at, actions.
- Asset detail drawer with large preview, CDN URL, object path, checksum, request ID, original/output metadata, copy buttons, download, and delete action.
- An upload dialog with drag-and-drop, file validation, progress, and completed state.
- Empty, loading, processing, failed, and ready states.

### 4. API Keys

This is a high-priority workflow.

Include:

- Explanation that keys must be used only from trusted website backends and must never be committed to frontend code.
- Table columns: key name, project, prefix, scopes, status, created by, created at, last used, expiry, actions.
- Mask keys such as `ncdn_live_••••••••6W9A`.
- `Create API key` dialog with key name, project, scopes, expiration, rate limit, and optional IP allowlist.
- After creation, show the full key exactly once in a secure-looking dark code surface with Copy and Download `.env` actions.
- Add a clear warning that the key cannot be viewed again.
- Rotate and revoke confirmation dialogs.
- Provide a compact code example for upload usage.

### 5. Upload Logs

Include:

- Filters for project, status, HTTP status, date, and request ID.
- Dense but readable log table with timestamp, request ID, project, key prefix, source IP, original to optimized size, duration, HTTP status, and result.
- Status treatments for `201 Ready`, `202 Processing`, `401 Unauthorized`, `413 Too Large`, `422 Invalid Image`, `429 Rate Limited`, and `507 Insufficient Storage`.
- Expandable row or drawer showing validation steps, compression attempts, object path, response payload, and error details.

### 6. Usage

Include:

- Storage, bandwidth, upload requests, and processing time summaries.
- 30-day usage charts.
- Project breakdown table with quota progress.
- Top projects by storage and bandwidth.
- Storage growth projection shown as an operational estimate, not a sales-style card.

### 7. Users

Include staff user management with name, email, role, MFA state, status, last active, invite, edit role, disable, and remove actions.

Use roles:

- Admin
- Operator
- Viewer

### 8. Audit Logs

Show immutable-looking audit entries for project changes, API key creation/revocation, asset deletion, user changes, and settings updates. Include actor, action, resource, IP, date/time, and details drawer.

### 9. Settings

Use clear sections or tabs:

- General
- Storage
- Image processing
- Security
- Backup

Represent these realistic defaults:

- Storage path: `/srv/naravich-cdn/storage`
- Temporary path: `/srv/naravich-cdn/temp`
- Max input: `25 MB`
- Max output: `5 MB`
- Output format: `WebP`
- Starting quality: `82`
- Max dimensions: `4096 × 4096`
- Trash retention: `30 days`
- Disk warning: `70%`
- Stop uploads: `88%`

Danger-zone controls must be visually distinct but not oversized.

## Reusable components and states

Create reusable components rather than one monolithic `App.tsx`. At minimum, establish components for:

- app shell, sidebar, top bar, page header;
- KPI/stat card;
- status badge;
- progress bar;
- data table and pagination;
- chart card;
- dialog/modal and drawer;
- dropdown/menu;
- toast/notification;
- copy-to-clipboard field;
- confirmation dialog;
- skeleton, empty state, and inline error state.

Interactions must work with mock state:

- switching navigation views;
- opening and closing drawers/dialogs;
- copying API keys and CDN URLs;
- creating a mock key and showing it once;
- revoking/rotating a mock key;
- filtering/searching tables;
- toggling asset grid/table view;
- displaying upload progress and completion;
- showing success/error toasts;
- responsive sidebar drawer.

Do not leave buttons that appear actionable but do nothing unless they are explicitly marked as disabled or coming soon.

## Content and formatting

- Use concise English interface copy and structure it so localization can be added later.
- Use Asia/Bangkok-style dates and times in mock data.
- Format bytes consistently: KB, MB, GB, TB.
- Use tabular numerals for metrics and table values.
- Use realistic image dimensions, compression ratios, latency, request IDs, IP addresses, and key prefixes.
- Use the brand name `Naravich Sure` and product label `CDN Manager` consistently.
- Do not call the VPS a global edge CDN in descriptive copy; it is a central self-hosted storage and delivery server.

## Accessibility

- Meet WCAG AA contrast for text and controls.
- Provide visible keyboard focus states in brand cyan.
- Add useful labels and `aria-*` attributes to icon-only controls, dialogs, navigation, tables, and progress indicators.
- Support `prefers-reduced-motion`.
- Do not communicate status by color alone.
- Ensure dialogs trap/focus sensibly and close with Escape.

## Technical constraints

- Work only inside `dashboard/`, except for reading `../DESIGN.md`.
- Keep the existing Vite + React + TypeScript foundation.
- Replace the current Vite starter content completely.
- Prefer CSS variables for design tokens.
- Keep dependencies minimal. `lucide-react` is acceptable for icons. Add other libraries only when they clearly improve the result.
- Do not use remote images, remote APIs, or placeholder-image services.
- Do not embed the source logo as base64.
- Do not use emoji as application icons.
- Do not implement a real authentication system or backend.
- Avoid giant files; split data, types, components, and views into sensible modules.
- Preserve strict TypeScript and avoid `any`.

## Suggested source organization

You may adjust this structure if there is a stronger reason, but keep equivalent separation:

```text
src/
├── components/
│   ├── layout/
│   ├── ui/
│   ├── charts/
│   └── data-table/
├── views/
├── data/
├── hooks/
├── lib/
├── types/
├── App.tsx
├── App.css
└── index.css
```

## Definition of done

The work is complete only when:

1. The Vite starter screen is fully replaced.
2. All required views are reachable and visually coherent.
3. Core dialogs, drawers, filters, copy actions, navigation, and mock upload interactions work.
4. The design clearly inherits the clean technical system from `DESIGN.md` while visibly belonging to Naravich Sure.
5. Supabase emerald is no longer the primary color; cyan/teal from the supplied branding is used instead.
6. The correct logo variant is used for light and dark surfaces without distortion.
7. Desktop, tablet, and mobile layouts are usable.
8. `npm run build` succeeds.
9. `npm run lint` succeeds, or any remaining failure is explained and unrelated to the implemented UI.
10. You review the rendered result at desktop and mobile sizes and fix obvious overflow, alignment, contrast, spacing, and interaction issues before finishing.

When you finish, give a concise summary of what was implemented, which files were changed, what checks were run, and any deliberate limitations of the frontend-only prototype.
