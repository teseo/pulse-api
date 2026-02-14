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

## Testing locally

There are two types of testing: unit tests and manual API testing.

### Unit tests

```
bun test
```

### Manual API testing

Open two terminals.

Terminal 1 — start the server:
```
bun run dev
```

Terminal 2 — query the endpoints:
```bash
# All registered services with last check result
curl -s localhost:3000/services | jq

# Check history for a specific service
curl -s localhost:3000/services/payment-service/history | jq

# Active alerts (unresolved only)
curl -s localhost:3000/alerts | jq

# All alerts (active + resolved history)
curl -s localhost:3000/alerts/all | jq
```

The `payment-service` is configured to hit a URL that always returns 503. After ~90 seconds (3 failures × 30s interval) you should see a critical alert appear for it. The other two services (`api-gateway`, `auth-service`) hit URLs that return 200 and will stay healthy.

## Conventions

- TDD: tests first, implementation after
- Conventional commits: feat:, fix:, test:, docs:
- All business logic must have tests
- No any types — strict TypeScript
