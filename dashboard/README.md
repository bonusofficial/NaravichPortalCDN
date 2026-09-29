# Naravich Sure · CDN Manager

Internal console for the self-hosted Naravich Sure image storage server: projects, assets,
API keys, upload logs, usage, staff users, audit logs, and server settings.

The console is connected to the NestJS API in `../backend`. Authentication,
projects, assets, API keys, upload logs, users, audit logs, runtime settings,
health, image upload, and asset deletion use the real MySQL/local-storage backend.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

Copy `.env.example` to `.env.local` only when the API/file URLs differ from the
local defaults. Start the backend before signing in. Local development credentials
are documented in `../backend/README.md`.

## Structure

```text
src/
├── App.tsx / App.css        routes (hash router, lazy-loaded views) + shell layout styles
├── index.css                design tokens (light + dark), reset, base type
├── assets/brand/            optimised logo derivatives (see Brand below)
├── components/
│   ├── layout/              AppShell, Sidebar + mobile drawer, TopBar, ProjectSelector,
│   │                        GlobalSearch (⌘K or /), Notifications, AccountMenu, PageHeader
│   ├── ui/                  Button, Badge/StatusBadge, Card, StatCard, ProgressBar, Field
│   │                        controls, Segmented, Tabs, Dialog, Drawer, ConfirmDialog, Menu,
│   │                        Popover, Toasts, CopyField, CodeBlock, AssetThumb, states
│   ├── data-table/          DataTable (sorting, sticky column, row activation), Pagination
│   └── charts/              LineChart, BarChart (stacked), Sparkline, HBarList, ChartCard
├── views/                   one folder per page (overview, projects, assets, api-keys,
│                            logs, usage, users, audit, settings)
├── state/                   API-backed store, authentication, theme, toasts
├── data/                    legacy fixtures retained by a few unfinished settings/backup views
├── lib/                     API client, formatting, router, shared helpers
├── hooks/                   modal layering/focus trap, floating position, clipboard…
└── types/                   domain types
```

## Design

- Structure follows `../DESIGN.md` (hairlines, restrained elevation, 6/8/12/16px radii,
  weight-500 headings, mono for technical values); the Supabase emerald is replaced by
  the Naravich Sure cyan sampled from the logo (`#10a9c8`, teal `#58c0b8`).
- Primary buttons are solid cyan with near-black text (6.8:1), following DESIGN.md's
  "lit surface" convention. Body/muted text and focus rings were tuned for WCAG AA.
- Light-first; a dark theme (Account menu → Theme) is included and swaps the logo variant.
- Chart colours were validated for contrast/CVD: single series `#0b9ab8`; p50/p95 use an
  ordinal cyan pair; failures use the reserved status colours. Every chart has a table view.

## Brand assets

The originals in `public/PNG` and `public/JPEG` are untouched. `src/assets/brand/` holds
480 × 188 WebP crops of the artwork bounds (≈10–19 kB each):

| File | Source | Used on |
| --- | --- | --- |
| `logo-color.webp` | CR-01 | Sidebar / drawer on light surfaces |
| `logo-white.webp` | CR-03 | Sidebar in the dark theme |
| `logo-black.webp` | CR-02 | Quiet treatment: branded 404 preview (Settings → General) |
| `mark.png`, `public/favicon.png` | CR-01 check-mark glyph | Collapsed rail, favicon |

The check-mark glyph is a crop of the supplied artwork, not a redrawn mark; confirm with
the brand owner before using it outside this console.

## Current integration notes

- JWT login/session and sign-out are enabled; the token is stored in `localStorage`.
- Dashboard uploads call `POST /api/v1/dashboard/images` with the staff JWT. Website
  servers use `POST /api/v1/images` with their one-time API key.
- Real files are compressed by Sharp in the backend, stored locally, and displayed from
  the returned `/files/...` URL.
- Overview/Usage storage, upload, processing, project totals, health, and disk state use
  live `/usage`, `/dashboard/summary`, and `/health` data. Delivery bandwidth is not
  guessed; add Nginx access-log metrics before displaying it.
- Asset delete, Undo restore, trash totals, and permanent purge use the real API/filesystem.
- Settings shows live runtime values, persists the supported compression/storage/key
  defaults in MySQL, manages the signed-in user's password/TOTP MFA, and exposes real
  trash maintenance. Backup scheduling stays at the Ubuntu systemd layer in `../deploy`.
- Lists fetch every server page in 100-row batches instead of silently truncating at 100.
