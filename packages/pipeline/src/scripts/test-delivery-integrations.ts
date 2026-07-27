import { resolve } from "node:path";
import { config } from "dotenv";
import { loadEnv } from "@crosspost/shared";
import { checkGoogleDriveAccess } from "../delivery/google-drive";
import { sendTelegramAlert } from "../notifications/telegram";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const env = loadEnv(process.env);

  console.log("Checking Google Drive access...");
  const drive = await checkGoogleDriveAccess(env);
  console.log(drive);

  console.log("Sending Telegram test alert...");
  const telegram = await sendTelegramAlert(
    env,
    "AMVE integration test — Drive + Telegram wiring verified from local dev.",
  );
  console.log(telegram ?? { skipped: true, reason: "Telegram not configured" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
