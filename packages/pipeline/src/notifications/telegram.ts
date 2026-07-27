import type { AppEnv } from "@crosspost/shared";
import { hasTelegramCredentials } from "@crosspost/shared";

export interface TelegramSendResult {
  ok: boolean;
  chatId: string;
  migratedToChatId?: string;
  error?: string;
}

async function postTelegramMessage(token: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await response.json()) as {
    ok?: boolean;
    description?: string;
    parameters?: { migrate_to_chat_id?: number };
  };

  if (!response.ok || !body.ok) {
    const migrated = body.parameters?.migrate_to_chat_id;
    if (migrated) {
      return {
        ok: false,
        chatId,
        migratedToChatId: String(migrated),
        error: body.description ?? "Chat migrated to supergroup",
      } satisfies TelegramSendResult;
    }

    return {
      ok: false,
      chatId,
      error: body.description ?? `Telegram HTTP ${response.status}`,
    } satisfies TelegramSendResult;
  }

  return { ok: true, chatId };
}

export async function sendTelegramAlert(env: AppEnv, message: string): Promise<TelegramSendResult | null> {
  if (!hasTelegramCredentials(env)) {
    return null;
  }

  const token = env.TELEGRAM_BOT_TOKEN!.trim();
  const chatId = env.TELEGRAM_CHAT_ID!.trim();
  const trimmed = message.slice(0, 4000);

  const first = await postTelegramMessage(token, chatId, trimmed);
  if (first.ok) return first;

  if (first.migratedToChatId) {
    return postTelegramMessage(token, first.migratedToChatId, trimmed);
  }

  return first;
}

export async function notifyRunDelivered(
  env: AppEnv,
  input: { runId: number; modelSlug: string; shortcode: string; drivePath?: string | null },
) {
  return sendTelegramAlert(
    env,
    [
      "AMVE run delivered",
      `Run #${input.runId}`,
      `Model: ${input.modelSlug}`,
      `Reel: ${input.shortcode}`,
      input.drivePath ? `Drive: ${input.drivePath}` : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export async function notifyRunException(
  env: AppEnv,
  input: { runId?: number | null; stage: string; reason: string },
) {
  return sendTelegramAlert(
    env,
    [
      "AMVE exception",
      input.runId ? `Run #${input.runId}` : "Source-level",
      `Stage: ${input.stage}`,
      input.reason,
    ].join("\n"),
  );
}
