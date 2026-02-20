# Mockket Architecture Design
**Date:** 2026-02-19
**Status:** Approved

## Decisions

- **Mobile:** Expo (managed/bare) + Expo Router (file-based navigation)
- **State:** TanStack Query (server/async) + Zustand (client/UI)
- **UI:** Custom design system — tokens → primitives → ui → domain
- **Monorepo:** Turborepo

## Structure

See root `ARCHITECTURE.md` for full system design.

## Key Patterns

- Feature-scoped vertical slices under `features/` — no cross-feature imports
- Query key factory in `lib/query/keys.ts`
- WebSocket price feed bridges into TanStack Query cache
- Token-only styling — no raw values in components

## Files Created

- `AGENTS.md` (root, mobile, api, agents packages)
- `ARCHITECTURE.md`
- `DESIGN_SYSTEM.md`
- `CONTRIBUTING.md`
- Full directory scaffold
