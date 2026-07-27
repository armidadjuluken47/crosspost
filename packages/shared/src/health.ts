import type { ProviderStatus } from "./providers";

export type HealthStatus = "ok" | "degraded" | "error";

export interface ComponentHealth {
  status: HealthStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface ProviderHealthEntry {
  id: string;
  displayName: string;
  stage: string;
  status: ProviderStatus;
  mode: "fixture" | "api";
  wavespeedModel: string | null;
  enabled: boolean;
}

export interface HealthReport {
  status: HealthStatus;
  checkedAt: string;
  components: {
    database: ComponentHealth;
    storage: ComponentHealth;
    ffmpeg: ComponentHealth;
    ingestion: ComponentHealth;
    imageGeneration: ComponentHealth;
    videoGeneration: ComponentHealth;
    delivery?: ComponentHealth;
    telegram?: ComponentHealth;
  };
  providers: ProviderHealthEntry[];
  missingLiveCredentials: string[];
}
