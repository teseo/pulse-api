# pulse-api

Health check & monitoring API for microservices.

## Architecture

- `src/checks/` — Service registry and health check runner with pluggable strategies (HTTP, TCP)
- `src/alerts/` — Alert engine (IN PROGRESS) with threshold-based rules and pluggable notifiers
- `src/storage/` — Storage adapters for check results (currently in-memory)
- `src/routes/` — REST API endpoints
- `src/utils/` — Shared utilities (logger, retry)

## Stack

- Runtime: Bun
- Language: TypeScript
- Framework: Express
- Testing: bun:test

## Commands

- `bun install` — install dependencies
- `bun test` — run all tests
- `bun run dev` — start dev server on port 3000

## Current State

- Service registry and check runner: DONE
- Storage layer: DONE
- REST API: DONE (except /alerts endpoint not wired up)
- Alert engine: STUB — interface defined, implementation pending
- Tests for alert engine: WRITTEN but FAILING

## Conventions

- TDD: tests first, implementation after
- Conventional commits: feat:, fix:, test:, docs:
- All business logic must have tests
- No any types — strict TypeScript
