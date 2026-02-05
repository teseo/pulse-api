import type { Alert } from "../types";

export interface Notifier {
  notify(alert: Alert): Promise<void>;
}
