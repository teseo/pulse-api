import { describe, it, expect, beforeEach } from "bun:test";
import { AlertEngine } from "../../src/alerts/engine";
import { ConsoleNotifier } from "../../src/alerts/notifiers/console";
import type { AlertRule, Alert } from "../../src/alerts/types";
import type { CheckResult } from "../../src/checks/types";

describe("AlertEngine", () => {
  let engine: AlertEngine;
  let notifier: ConsoleNotifier;
  let notifiedAlerts: Alert[];

  const rules: AlertRule[] = [
    {
      id: "rule-api",
      serviceId: "api-gateway",
      severity: "critical",
      consecutiveFailures: 3,
      description: "API Gateway is down",
    },
    {
      id: "rule-auth",
      serviceId: "auth-service",
      severity: "warning",
      consecutiveFailures: 2,
      description: "Auth Service is failing",
    },
  ];

  const makeResult = (
    serviceId: string,
    status: "healthy" | "unhealthy"
  ): CheckResult => ({
    serviceId,
    status,
    responseTimeMs: 100,
    timestamp: new Date(),
  });

  beforeEach(() => {
    notifiedAlerts = [];
    notifier = new ConsoleNotifier();
    // Spy on notify to track calls
    notifier.notify = async (alert: Alert) => {
      notifiedAlerts.push(alert);
    };
    engine = new AlertEngine(rules, notifier);
  });

  it("should start with no active alerts", () => {
    const alerts = engine.getActiveAlerts();
    expect(alerts).toEqual([]);
  });

  it("should not alert before threshold is reached", () => {
    // API Gateway rule requires 3 consecutive failures
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    const alerts = engine.getActiveAlerts();
    expect(alerts.length).toBe(0);
  });

  it("should alert when consecutive failures reach threshold", () => {
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    const alerts = engine.getActiveAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].serviceId).toBe("api-gateway");
    expect(alerts[0].severity).toBe("critical");
    expect(alerts[0].status).toBe("active");
    expect(alerts[0].consecutiveFailures).toBe(3);
  });

  it("should notify when alert is triggered", () => {
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    expect(notifiedAlerts.length).toBe(1);
    expect(notifiedAlerts[0].status).toBe("active");
  });

  it("should reset failure count on healthy check", () => {
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    // Healthy check resets the count
    engine.processResult(makeResult("api-gateway", "healthy"));
    // Start counting again — should not alert after 2 more failures
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    const alerts = engine.getActiveAlerts();
    expect(alerts.length).toBe(0);
  });

  it("should auto-resolve alert when service recovers", () => {
    // Trigger alert
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    expect(engine.getActiveAlerts().length).toBe(1);

    // Service recovers
    engine.processResult(makeResult("api-gateway", "healthy"));

    expect(engine.getActiveAlerts().length).toBe(0);

    // Should have been notified twice: once for alert, once for resolve
    expect(notifiedAlerts.length).toBe(2);
    expect(notifiedAlerts[1].status).toBe("resolved");
    expect(notifiedAlerts[1].resolvedAt).toBeDefined();
  });

  it("should handle multiple services independently", () => {
    // Fail auth-service (threshold: 2)
    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));

    // Fail api-gateway (threshold: 3) — only 2 failures, not enough
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    const alerts = engine.getActiveAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].serviceId).toBe("auth-service");
    expect(alerts[0].severity).toBe("warning");
  });

  it("should not create duplicate alerts for same service", () => {
    // Trigger alert
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    // Continue failing — should not create a second alert
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    const alerts = engine.getActiveAlerts();
    expect(alerts.length).toBe(1);
    // Only one notification
    expect(notifiedAlerts.length).toBe(1);
  });

  it("should ignore results for services without rules", () => {
    engine.processResult(makeResult("unknown-service", "unhealthy"));
    engine.processResult(makeResult("unknown-service", "unhealthy"));
    engine.processResult(makeResult("unknown-service", "unhealthy"));

    const alerts = engine.getActiveAlerts();
    expect(alerts.length).toBe(0);
  });

  it("should track all alerts including resolved", () => {
    // Trigger and resolve
    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "healthy"));

    // Trigger again
    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));

    const active = engine.getActiveAlerts();
    const all = engine.getAllAlerts();

    expect(active.length).toBe(1);
    expect(all.length).toBe(2); // one resolved + one active
  });

  it("should trigger multiple rules independently for the same service", () => {
    const escalatingRules: AlertRule[] = [
      { id: "rule-warn", serviceId: "db-service", severity: "warning", consecutiveFailures: 2, description: "DB degraded" },
      { id: "rule-crit", serviceId: "db-service", severity: "critical", consecutiveFailures: 4, description: "DB is down" },
    ];
    const escalationEngine = new AlertEngine(escalatingRules, notifier);

    // 2 failures — warning triggers, critical does not
    escalationEngine.processResult(makeResult("db-service", "unhealthy"));
    escalationEngine.processResult(makeResult("db-service", "unhealthy"));

    expect(escalationEngine.getActiveAlerts().length).toBe(1);
    expect(escalationEngine.getActiveAlerts()[0].severity).toBe("warning");

    // 4 failures — critical should also trigger
    escalationEngine.processResult(makeResult("db-service", "unhealthy"));
    escalationEngine.processResult(makeResult("db-service", "unhealthy"));

    const active = escalationEngine.getActiveAlerts();
    expect(active.length).toBe(2);
    expect(active.map((a) => a.severity).sort()).toEqual(["critical", "warning"]);
  });

  it("should resolve all active alerts for a service on recovery", () => {
    const escalatingRules: AlertRule[] = [
      { id: "rule-warn", serviceId: "db-service", severity: "warning", consecutiveFailures: 2 },
      { id: "rule-crit", serviceId: "db-service", severity: "critical", consecutiveFailures: 3 },
    ];
    const escalationEngine = new AlertEngine(escalatingRules, notifier);

    // Trigger both alerts
    escalationEngine.processResult(makeResult("db-service", "unhealthy"));
    escalationEngine.processResult(makeResult("db-service", "unhealthy"));
    escalationEngine.processResult(makeResult("db-service", "unhealthy"));

    expect(escalationEngine.getActiveAlerts().length).toBe(2);

    // Recovery should resolve both
    escalationEngine.processResult(makeResult("db-service", "healthy"));

    expect(escalationEngine.getActiveAlerts().length).toBe(0);
    expect(escalationEngine.getAllAlerts().length).toBe(2);
    expect(escalationEngine.getAllAlerts().every((a) => a.status === "resolved")).toBe(true);
  });

  it("should not double-count failures when multiple rules match the same service", () => {
    const multiRules: AlertRule[] = [
      { id: "rule-a", serviceId: "shared-svc", severity: "warning", consecutiveFailures: 3 },
      { id: "rule-b", serviceId: "shared-svc", severity: "critical", consecutiveFailures: 3 },
    ];
    const multiEngine = new AlertEngine(multiRules, notifier);

    // One unhealthy result should count as 1 failure, not 2
    multiEngine.processResult(makeResult("shared-svc", "unhealthy"));
    multiEngine.processResult(makeResult("shared-svc", "unhealthy"));

    // Only 2 failures — threshold is 3, should NOT alert yet
    expect(multiEngine.getActiveAlerts().length).toBe(0);
  });

  it("should notify with status active before resolving mutates the alert", async () => {
    // Simulate a slow async notifier that captures alert state after a delay
    const capturedStatuses: string[] = [];
    notifier.notify = async (alert: Alert) => {
      // Capture status at the time the notifier processes the alert
      await new Promise((r) => setTimeout(r, 10));
      capturedStatuses.push(alert.status);
    };
    engine = new AlertEngine(rules, notifier);

    // Trigger alert
    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));

    // Immediately resolve
    engine.processResult(makeResult("auth-service", "healthy"));

    // Wait for both async notifiers to complete
    await new Promise((r) => setTimeout(r, 50));

    // The active notification must have captured "active", not "resolved"
    expect(capturedStatuses).toEqual(["active", "resolved"]);
  });

  it("should generate unique alert ids for rapid trigger-resolve-trigger cycles", () => {
    // Trigger, resolve, re-trigger in same millisecond
    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "healthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));

    const all = engine.getAllAlerts();
    expect(all.length).toBe(2);

    const ids = all.map((a) => a.id);
    expect(new Set(ids).size).toBe(2); // IDs must be unique
  });

  it("should not crash when notifier rejects", async () => {
    notifier.notify = async () => {
      throw new Error("notify failed");
    };
    engine = new AlertEngine(rules, notifier);

    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));

    // Flush microtask queue — if .catch is missing, this would cause unhandled rejection
    await new Promise((r) => setTimeout(r, 0));

    expect(engine.getActiveAlerts().length).toBe(1);
  });

  it("should reject duplicate rule ids", () => {
    const dupeRules: AlertRule[] = [
      { id: "rule-1", serviceId: "svc-a", severity: "warning", consecutiveFailures: 2 },
      { id: "rule-1", serviceId: "svc-b", severity: "critical", consecutiveFailures: 3 },
    ];

    expect(() => new AlertEngine(dupeRules, notifier)).toThrow("Duplicate rule id: rule-1");
  });

  it("should call onAlert callback when alert triggers", () => {
    const triggered: Alert[] = [];
    engine = new AlertEngine(rules, notifier, {
      onAlert: (alert) => triggered.push(alert),
    });

    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));

    expect(triggered.length).toBe(1);
    expect(triggered[0].status).toBe("active");
  });

  it("should call onResolve callback when alert resolves", () => {
    const resolved: Alert[] = [];
    engine = new AlertEngine(rules, notifier, {
      onResolve: (alert) => resolved.push(alert),
    });

    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "unhealthy"));
    engine.processResult(makeResult("auth-service", "healthy"));

    expect(resolved.length).toBe(1);
    expect(resolved[0].status).toBe("resolved");
  });
});
