import { loadEnv } from "@crosspost/shared";

export function getServerEnv() {
  return loadEnv(process.env);
}
