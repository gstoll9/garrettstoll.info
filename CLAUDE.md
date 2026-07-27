# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm install       # install deps
npm run dev       # dev server at localhost:3000
npm run build     # production build (next build); statically prerenders every route
npm run start     # serve the production build
```

There is no test suite in this repo (no Jest/Vitest/Playwright config, no `*.test.*`/`*.spec.*` files).

`npm run lint` uses ESLint 9's flat config (`eslint.config.mjs`), which bridges `eslint-config-next`'s legacy `next/core-web-vitals`/`next/typescript` presets via `FlatCompat` (the old `.eslintrc.json` was removed as redundant). It surfaces a large number of pre-existing errors/warnings across the codebase that haven't been triaged yet — `next.config.ts` sets `eslint.ignoreDuringBuilds: true` so those don't block `npm run build`; run `npm run lint` directly when you want to see them.

There is also a `flask-app/` directory — it's the unmodified Flask quickstart boilerplate (`"Welcome to the Flask App!"`), not wired into the Next.js app or any page. Don't assume it backs any feature.

## Architecture

Next.js App Router, TypeScript, one folder per route under `src/app/*/page.tsx`. Path alias `@/*` → `src/*`.

**Every page** starts with `'use client'`, wraps its content in `src/layouts/standardLayout.tsx` via `StandardLayout({ title, main, headerMode })`, and imports its own page-scoped CSS file directly (no CSS modules). `headerMode` is `'full' | 'tyro-only' | 'none'` — `'tyro-only'` is used by the heavier interactive/3D pages that want just the small home-link avatar instead of the full title header.

**`/resume` is the de facto homepage** — `src/app/page.tsx` just renders `<Resume />`. The resume page's Research/Projects/Games lists (`src/app/resume/page.tsx`) are the map of "live" pages; new pages should be added there. Some existing pages are experimental/exploratory and deliberately commented out of that list (currently: Numerical Methods, Structural Bioinformatics, Three-Body Problem under "Class Notes"; Solitaire, Free Play under "Games") and are only reachable by direct URL — lower priority than linked pages, no need for the same polish, but check the resume page before assuming a page under `src/app` is unlinked/dead.

**Per-page structure**: pages that need it have their own scoped `components/`, `data/`, `utils/`, and/or `styles/` subfolders (e.g. `src/app/solarsystem/`). Nothing is shared across pages except `src/layouts/*` and `src/app/util.tsx`.

**Heavy WebGL/three.js pages** (`solarsystem`, `brain`) load their canvas component via `next/dynamic(() => import(...), { ssr: false })` with a loading fallback, since `three`/`@react-three/fiber` can't run during SSR. `knowledgegraph` and `threeBody` import their canvas components directly without this guard instead — that's inconsistent, not intentional; follow the `dynamic(..., { ssr: false })` pattern for any new heavy visualization page.

**Data-driven simulation pages** follow the layering seen in `src/app/solarsystem/`: a `data/` file holding per-body physical/orbital constants and display config → a `utils.tsx` with the actual math (e.g. solving Kepler's equation, or wrapping the `astronomy-engine` package for real-world positions) → `components/` that just render based on that math. Keep that data/math/render separation for new simulation-style pages rather than inlining physics into components.

Two perf/correctness patterns worth following if you touch simulation code: don't call `require(...)` or rebuild lookup tables inside a `useFrame` callback (it runs every frame, for every animated object) — hoist heavy imports and static lookup tables to module scope; and prefer `THREE.InstancedMesh` over mapping many individual `<mesh>` elements when rendering repeated identical geometry (e.g. asteroid belts, particle fields).

The `solarsystem` page's on-canvas UI controls are two collapsible panels (`components/ObjectVisibilityMenu.tsx` for per-body show/hide, `components/OrbitControls.tsx` for display settings) stacked inside one shared `.solar-menu-stack` card in the top-left corner, each toggled by a `.menu-toggle-button` labeled with its own title rather than an icon. `data/regions.ts` holds the single source of truth for solar-system body groupings (inner/outer planets, asteroid belt, orbit-line colors) — both `SolarSystem.tsx` (orbit coloring) and `ObjectVisibilityMenu.tsx` (menu grouping) import from it rather than each keeping their own copy of the lists.

Math-heavy text pages (`structuralbioinformatics`, `hubbardmodel`) render LaTeX via `react-katex`'s `<BlockMath>`/`<InlineMath>` plus `katex/dist/katex.min.css`.

Per-page static assets live under `public/<pageName>Images/` (e.g. `public/solarsystemImages`, `public/hubbardmodelImages`, `public/methanogensImages`), matching the page's route name.
