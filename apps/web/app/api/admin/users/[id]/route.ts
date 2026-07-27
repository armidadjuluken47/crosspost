import { NextRequest, NextResponse } from "next/server";
import { adminDeleteCreatorUser } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getAdminDb, isFirebaseReady } from "@/lib/firebase-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = id.trim();
    if (!userId) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const db = getDb();
    const result = await adminDeleteCreatorUser(db, userId);

    let deletedFirestoreProfile = false;
    if (isFirebaseReady()) {
      await getAdminDb().collection("users").doc(userId).delete();
      deletedFirestoreProfile = true;
    }

    return NextResponse.json({ ...result, deletedFirestoreProfile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
