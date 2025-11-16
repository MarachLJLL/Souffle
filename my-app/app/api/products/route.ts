// app/api/products/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    // products.json lives at repoRoot/database/products.json
    // process.cwd() in Next app points at my-app/, so go up one level
    const filePath = path.join(process.cwd(), "..", "database", "products.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch (err: any) {
    console.error("Failed to read products.json:", err);
    return NextResponse.json(
      { error: "Failed to load products.json" },
      { status: 500 },
    );
  }
}


