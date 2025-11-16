// app/ar/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MultiModalAR from "./MultiModalAR";

type Measurements = {
  length?: number;
  width?: number;
  height?: number;
};

type ProductRecord = {
  id: number;
  glb?: string;
  measurements?: Measurements;
};

export default function ARPage() {
  const [modelUrls, setModelUrls] = useState<string[]>([]);
  const [modelRealSizes, setModelRealSizes] = useState<Measurements[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch products from the shared JSON "database" via Next API
        const res = await fetch("/api/products");
        if (!res.ok) {
          throw new Error(`Failed to load products: ${res.status} ${res.statusText}`);
        }
        const products: ProductRecord[] = await res.json();

        // Read selected product IDs either from URL (?ids=1,2,3) or from localStorage
        let selectedIds: number[] | null = null;
        // 1) Prefer explicit ids passed via the query string (cross-device via QR)
        const idsParam = searchParams?.get("ids");
        if (idsParam) {
          selectedIds = idsParam
            .split(",")
            .map((id) => Number(id))
            .filter((id) => !Number.isNaN(id));
        } else if (typeof window !== "undefined") {
          // 2) Fallback: same-device localStorage selection from View3DSpace
          try {
            const raw = window.localStorage.getItem("selected_3d_products");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                selectedIds = parsed
                  .map((id) => Number(id))
                  .filter((id) => !Number.isNaN(id));
              }
            }
          } catch {
            selectedIds = null;
          }
        }

        // Filter products that have GLB files
        let usable = products.filter((p) => p.glb);

        // If there is a selection from View3DSpace, restrict to that set
        if (selectedIds && selectedIds.length > 0) {
          usable = usable.filter((p) => selectedIds!.includes(p.id));
        }

        // Map to model URLs and real-world sizes (convert cm -> meters)
        const urls: string[] = [];
        const sizes: Measurements[] = [];

        usable.forEach((p) => {
          if (!p.glb) return;
          // Serve GLBs via Next API so they are accessible in the AR app
          urls.push(`/api/glb/${p.glb}`);

          const m = p.measurements;
          if (m) {
            sizes.push({
              length: m.length != null ? m.length / 100 : undefined,
              height: m.height != null ? m.height / 100 : undefined,
              width: m.width != null ? m.width / 100 : undefined,
            });
          } else {
            sizes.push({});
          }
        });

        setModelUrls(urls);
        setModelRealSizes(sizes);
      } catch (e: any) {
        console.error("Failed to load models for AR:", e);
        setError(e?.message || "Failed to load models for AR.");
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  if (loading) {
    return (
      <main className="w-full h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm">Loading AR models…</p>
      </main>
    );
  }

  if (error || modelUrls.length === 0) {
    return (
      <main className="w-full h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm">
          {error || "No 3D models selected or available for AR."}
        </p>
      </main>
    );
  }

  return (
    <main className="w-full h-screen">
      <MultiModalAR modelUrls={modelUrls} modelRealSizes={modelRealSizes} />
    </main>
  );
}
