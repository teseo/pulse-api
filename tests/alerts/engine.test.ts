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

  it("should not crash when notifier rejects", () => {
    notifier.notify = async () => {
      throw new Error("notification failed");
    };
    engine = new AlertEngine(rules, notifier);

    // Should not throw
    expect(() => {
      engine.processResult(makeResult("auth-service", "unhealthy"));
      engine.processResult(makeResult("auth-service", "unhealthy"));
    }).not.toThrow();
  });

  it("should not crash when notifier throws synchronously", () => {
    notifier.notify = (() => {
      throw new Error("sync kaboom");
    }) as any;
    engine = new AlertEngine(rules, notifier);

    expect(() => {
      engine.processResult(makeResult("auth-service", "unhealthy"));
      engine.processResult(makeResult("auth-service", "unhealthy"));
    }).not.toThrow();
  });

  it("should support multiple rules for the same service with different thresholds", () => {
    const multiRules: AlertRule[] = [
      {
        id: "rule-api-warning",
        serviceId: "api-gateway",
        severity: "warning",
        consecutiveFailures: 2,
        description: "API Gateway degraded",
      },
      {
        id: "rule-api-critical",
        serviceId: "api-gateway",
        severity: "critical",
        consecutiveFailures: 4,
        description: "API Gateway is down",
      },
    ];
    engine = new AlertEngine(multiRules, notifier);

    // 2 failures: warning fires, critical does not
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    let alerts = engine.getActiveAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe("warning");

    // 4 failures: critical also fires
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    alerts = engine.getActiveAlerts();
    expect(alerts.length).toBe(2);
    const severities = alerts.map((a) => a.severity).sort();
    expect(severities).toEqual(["critical", "warning"]);

    // Recovery resolves both
    engine.processResult(makeResult("api-gateway", "healthy"));
    expect(engine.getActiveAlerts().length).toBe(0);

    // All 4 notifications: warning active, critical active, warning resolved, critical resolved
    expect(notifiedAlerts.length).toBe(4);
  });

  it("should emit alert snapshots, not shared references", () => {
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));
    engine.processResult(makeResult("api-gateway", "unhealthy"));

    // Capture the emitted "active" alert
    const emittedActive = notifiedAlerts[0];
    expect(emittedActive.status).toBe("active");

    // Resolve the alert
    engine.processResult(makeResult("api-gateway", "healthy"));

    // The previously emitted active alert should still be "active"
    expect(emittedActive.status).toBe("active");
  });
});
