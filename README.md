# pulse-api

Health check & monitoring API for microservices.

## Features

- Service registry with pluggable health check strategies (HTTP, TCP)
- In-memory storage for check results with uptime calculation
- REST API for service status and history
- Alert engine with threshold-based rules *(in progress)*
- Pluggable notification system

## Quick Start

```bash
bun install
bun run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | System health check |
| GET | /services | List all registered services |
| GET | /services/:id/history | Check history for a service |
| GET | /alerts | Active alerts *(not yet wired up)* |

## Testing

```bash
bun test
```

## Architecture

```
src/
├── checks/          # Service registry and health check runner
│   └── strategies/  # HTTP, TCP check implementations
├── alerts/          # Alert engine and notification system
│   └── notifiers/   # Console, webhook notifiers
├── storage/         # Check result storage adapters
├── routes/          # Express REST API routes
└── utils/           # Logger, retry utilities
```
