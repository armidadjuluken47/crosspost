import type { AppEnv } from "@crosspost/shared";

export type ProjectReadyEmailInput = {
  to: string;
  projectTitle: string;
  publicId: string;
  appBaseUrl: string;
};

export type WorkspaceInviteEmailInput = {
  to: string;
  workspaceName: string;
  inviteUrl: string;
  inviterLabel?: string | null;
};

export function hasEmailCredentials(env: AppEnv): boolean {
  return Boolean(env.RESEND_API_KEY?.trim());
}

async function sendResendEmail(
  env: AppEnv,
  input: { to: string; subject: string; text: string; html?: string },
): Promise<{ sent: boolean; skipped?: string; id?: string }> {
  const to = input.to.trim();
  if (!to || !to.includes("@")) {
    return { sent: false, skipped: "missing_email" };
  }

  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info(`[email] (stub) would send to ${to}: ${input.subject}\n${input.text}`);
    return { sent: false, skipped: "no_resend_key" };
  }

  const from = env.EMAIL_FROM?.trim() || "CrossPost <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${input.text.replace(/</g, "&lt;")}</pre>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(`[email] Resend failed: ${response.status} ${body.slice(0, 200)}`);
      return { sent: false, skipped: "resend_error" };
    }

    const data = (await response.json()) as { id?: string };
    console.info(`[email] sent to ${to} id=${data.id ?? "?"}`);
    return { sent: true, id: data.id };
  } catch (error) {
    console.warn("[email] Resend request error:", error);
    return { sent: false, skipped: "resend_error" };
  }
}

/** Notify creator that a project is ready. Soft-fails; logs when Resend is not configured. */
export async function notifyCreatorProjectReady(
  env: AppEnv,
  input: ProjectReadyEmailInput,
): Promise<{ sent: boolean; skipped?: string }> {
  const projectUrl = `${input.appBaseUrl.replace(/\/$/, "")}/projects/${input.publicId}`;
  const subject = `Your CrossPost remix is ready — ${input.projectTitle}`;
  const text = [
    `Your project "${input.projectTitle}" is ready.`,
    "",
    `Open it: ${projectUrl}`,
    "",
    "You can download the ZIP package (video, captions, SRT, and thumbnail) from the project page.",
    "",
    "— CrossPost",
  ].join("\n");

  return sendResendEmail(env, {
    to: input.to,
    subject,
    text,
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
        <p>Your project <strong>${escapeHtml(input.projectTitle)}</strong> is ready.</p>
        <p><a href="${escapeHtml(projectUrl)}">Open your remix →</a></p>
        <p style="color:#666;font-size:14px">Download the ZIP (video, captions, SRT, thumbnail) from the project page.</p>
        <p style="color:#999;font-size:12px">— CrossPost</p>
      </div>
    `,
  });
}

export type ProjectFailedEmailInput = {
  to: string;
  projectTitle: string;
  publicId: string;
  appBaseUrl: string;
  errorMessage?: string | null;
};

/** Notify creator that a project failed to render. Soft-fails; logs when Resend is not configured. */
export async function notifyCreatorProjectFailed(
  env: AppEnv,
  input: ProjectFailedEmailInput,
): Promise<{ sent: boolean; skipped?: string }> {
  const projectUrl = `${input.appBaseUrl.replace(/\/$/, "")}/projects/${input.publicId}`;
  const reason = input.errorMessage?.trim();
  const subject = `Your CrossPost remix didn't finish — ${input.projectTitle}`;
  const text = [
    `We hit a problem processing your project "${input.projectTitle}".`,
    reason ? `` : null,
    reason ? `Reason: ${reason}` : null,
    "",
    `You can retry it from the project page: ${projectUrl}`,
    "",
    "— CrossPost",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return sendResendEmail(env, {
    to: input.to,
    subject,
    text,
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
        <p>We hit a problem processing your project <strong>${escapeHtml(input.projectTitle)}</strong>.</p>
        ${reason ? `<p style="color:#b91c1c;font-size:14px">Reason: ${escapeHtml(reason)}</p>` : ""}
        <p><a href="${escapeHtml(projectUrl)}">Open the project to retry →</a></p>
        <p style="color:#999;font-size:12px">— CrossPost</p>
      </div>
    `,
  });
}

/** Invite someone to a team workspace. Soft-fails; stubs when Resend is not configured. */
export async function notifyWorkspaceInvite(
  env: AppEnv,
  input: WorkspaceInviteEmailInput,
): Promise<{ sent: boolean; skipped?: string }> {
  const inviter = input.inviterLabel?.trim();
  const subject = `You're invited to ${input.workspaceName} on CrossPost`;
  const text = [
    inviter
      ? `${inviter} invited you to join the "${input.workspaceName}" workspace on CrossPost.`
      : `You've been invited to join the "${input.workspaceName}" workspace on CrossPost.`,
    "",
    "Accept the invite:",
    input.inviteUrl,
    "",
    "This link expires in 7 days. Sign in with Google to join.",
    "",
    "— CrossPost",
  ].join("\n");

  return sendResendEmail(env, {
    to: input.to,
    subject,
    text,
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
        <p>${
          inviter
            ? `<strong>${escapeHtml(inviter)}</strong> invited you to join`
            : "You've been invited to join"
        }
        <strong>${escapeHtml(input.workspaceName)}</strong> on CrossPost.</p>
        <p><a href="${escapeHtml(input.inviteUrl)}">Accept invite →</a></p>
        <p style="color:#666;font-size:14px">This link expires in 7 days. Sign in with Google to join.</p>
        <p style="color:#999;font-size:12px">— CrossPost</p>
      </div>
    `,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
