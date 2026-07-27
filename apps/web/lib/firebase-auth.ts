import type { NextRequest } from "next/server";
import { isFirebaseReady, verifyIdToken } from "./firebase-admin";

export async function authenticateFirebase(request: NextRequest) {
  if (!isFirebaseReady()) {
    return {
      error: Response.json(
        {
          error: "Firebase not configured",
          hint: "Set GOOGLE_APPLICATION_CREDENTIALS in .env to your Firebase service account JSON.",
        },
        { status: 503 },
      ),
    } as const;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  try {
    const user = await verifyIdToken(authHeader.slice(7));
    return { user } as const;
  } catch {
    return { error: Response.json({ error: "Invalid token" }, { status: 401 }) } as const;
  }
}
