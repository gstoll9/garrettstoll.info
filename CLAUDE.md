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

`npm run lint` uses ESLint 9's flat config (`eslint.config.mjs`), which bridges `eslint-config-next`'s legacy `next/core-web-vitals`/`next/typescript` presets via `FlatCompat` (the old `.eslintrc.json` was removed as redundant). It also reuses `.gitignore` via `@eslint/compat`'s `includeIgnoreFile` so it doesn't lint `.next/` build output or `next-env.d.ts` — without that, plain `eslint .` (unlike the `next lint` CLI) has no built-in awareness of Next's build artifacts. The codebase is currently lint-clean; `npm run build`'s lint step is not suppressed, so new errors will fail the build.

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

Focusing one of the 8 major planets renders a true-to-scale 3D cutaway (core/mantle/crust/atmosphere) with a per-layer hover tooltip, plus a mirrored `.solar-menu-stack-right` card in the top-right holding `LayerVisibilityControls.tsx` (Show Atmosphere/Show Crust toggles) and two collapsible panels: `LayerCrossSection.tsx` (core→atmosphere) and `AtmosphereCrossSection.tsx` (troposphere→exosphere, shown only while atmosphere is toggled on). `data/planetStructure.ts` is the single source of real per-planet data — layer proportions (`radiusFraction`), sourced from each planet's saved Wikipedia page under `wikipedia/Planets/<Planet>/` (the same `data-mw` JSON-extraction technique used for `data/asteroids.ts`) rather than fabricated for visual clarity. Core/mantle sub-layers (`innerCore`/`lowerMantle`) and `atmosphere.layers` are added only where the source directly cites a sub-boundary, not for every planet — see that file's header comment for which planets have them and why. `getLayerSegments()` is the shared function both the 3D renderer and the 2D panels call so they can't drift out of sync; `Planet.tsx`'s `Shell` component is the reusable one-radial-layer mesh (2 outer-surface pieces + 3 cut-face rings) that both core/mantle and their sub-layers render through.

Math-heavy text pages (`structuralbioinformatics`, `hubbardmodel`) render LaTeX via `react-katex`'s `<BlockMath>`/`<InlineMath>` plus `katex/dist/katex.min.css`.

Per-page static assets live under `public/<pageName>Images/` (e.g. `public/solarsystemImages`, `public/hubbardmodelImages`, `public/methanogensImages`), matching the page's route name.
