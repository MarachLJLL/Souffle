// app/api/glb/[...path]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// In the Next 15 App Router, dynamic route params are provided as a Promise
// and must be awaited before use.
export async function GET(_req: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: pathSegments } = await context.params;
    const segments = Array.isArray(pathSegments) ? pathSegments : [];
    if (segments.length === 0) {
      return NextResponse.json({ error: "Missing GLB path" }, { status: 400 });
    }
    // GLB paths in products.json live under database/<glb>, e.g. glbs/2.glb
    const filePath = path.join(process.cwd(), "..", "database", ...segments);
    const data = await fs.readFile(filePath);

    // Basic content-type for binary GLB; loaders only need a successful fetch
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("Failed to read GLB file:", err);
    return NextResponse.json(
      { error: "Failed to load GLB asset" },
      { status: 404 }
    );
  }
}


