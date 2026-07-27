import { NextRequest, NextResponse } from "next/server";
import {
  buildCreatorExportZip,
  getCreatorProject,
  transcriptToSrt,
} from "@crosspost/pipeline";
import { createAssetStorage } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { resolveCreatorUserId } from "@/lib/creator-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await resolveCreatorUserId(request);
    const db = getDb();
    const project = await getCreatorProject(db, userId, id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const type = new URL(request.url).searchParams.get("type") ?? "captions";
    const env = getServerEnv();
    const storage = createAssetStorage(env);

    if (type === "video") {
      if (!project.outputVideoKey) {
        return NextResponse.json({ error: "Video not ready yet" }, { status: 404 });
      }
      return NextResponse.redirect(new URL(`/api/assets/${project.outputVideoKey}`, request.url));
    }

    if (type === "burned") {
      if (!project.burnedVideoKey) {
        return NextResponse.json({ error: "Burned video not available" }, { status: 404 });
      }
      return NextResponse.redirect(new URL(`/api/assets/${project.burnedVideoKey}`, request.url));
    }

    if (type === "thumbnail") {
      if (!project.thumbnailKey) {
        return NextResponse.json({ error: "Thumbnail not available" }, { status: 404 });
      }
      return NextResponse.redirect(new URL(`/api/assets/${project.thumbnailKey}`, request.url));
    }

    if (type === "srt") {
      let srt: string | null = null;
      if (project.srtKey) {
        try {
          srt = (await storage.getObject(project.srtKey)).toString("utf8");
        } catch {
          srt = null;
        }
      }
      if (!srt) {
        srt = transcriptToSrt(project.transcript);
      }
      if (!srt) {
        return NextResponse.json({ error: "SRT not available" }, { status: 404 });
      }
      return new NextResponse(srt, {
        headers: {
          "Content-Type": "application/x-subrip; charset=utf-8",
          "Content-Disposition": `attachment; filename="${project.publicId}-captions.srt"`,
        },
      });
    }

    if (type === "zip") {
      const zip = await buildCreatorExportZip(env, project);
      return new NextResponse(new Uint8Array(zip), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${project.publicId}-export.zip"`,
        },
      });
    }

    if (type === "hashtags") {
      return new NextResponse(project.hashtags ?? "", {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${project.publicId}-hashtags.txt"`,
        },
      });
    }

    const body = [
      project.caption ?? "",
      "",
      project.hashtags ?? "",
      "",
      ...(Array.isArray(project.hookVariants) ? (project.hookVariants as string[]) : []).map(
        (hook) => `• ${hook}`,
      ),
    ].join("\n");

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${project.publicId}-captions.txt"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 },
    );
  }
}
