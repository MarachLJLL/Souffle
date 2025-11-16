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
  const searchParams = useSearchParams();
  const [modelUrls, setModelUrls] = useState<string[]>([]);
  const [modelRealSizes, setModelRealSizes] = useState<Measurements[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResultUrl, setUploadResultUrl] = useState<string | null>(null);
  const [uploadAdvice, setUploadAdvice] = useState<string | null>(null);

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

        // Filter products that have GLB files
        let usable = products.filter((p) => p.glb);

        // Check for explicit selection passed via URL (?ids=1,2,3)
        let explicitIds: number[] | null = null;
        const idsParam = searchParams?.get("ids");
        if (idsParam) {
          explicitIds = idsParam
            .split(",")
            .map((id) => Number(id))
            .filter((id) => !Number.isNaN(id));
        }

        // If there is a selection from the URL, it takes precedence.
        // Otherwise, fall back to localStorage selection if available.
        let selectedIds: number[] | null = explicitIds && explicitIds.length > 0 ? explicitIds : null;

        if (!selectedIds && typeof window !== "undefined") {
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
  }, [searchParams]);

  const handleUploadFileChange: React.ChangeEventHandler<HTMLInputElement> = (
    event
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadResultUrl(null);
    setUploadAdvice(null);
    setUploadLoading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        setUploadError("Failed to read image file.");
        setUploadLoading(false);
        return;
      }

      // Downscale / normalize the uploaded screenshot into a PNG data URL
      // similar in spirit to the AR canvas snapshot (helps avoid huge payloads).
      const img = new Image();
      img.onload = () => {
        try {
          const maxSize = 1024; // keep reasonable for API
          const aspect = img.width / img.height;
          let targetW = img.width;
          let targetH = img.height;
          if (targetW > targetH && targetW > maxSize) {
            targetW = maxSize;
            targetH = Math.round(maxSize / aspect);
          } else if (targetH >= targetW && targetH > maxSize) {
            targetH = maxSize;
            targetW = Math.round(maxSize * aspect);
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setUploadError("Failed to process uploaded image.");
            setUploadLoading(false);
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);

          const resizedDataUrl = canvas.toDataURL("image/png");

          (async () => {
            try {
              const [imgRes, adviceRes] = await Promise.all([
                fetch("/api/realify-ar-snapshot", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ imageDataUrl: resizedDataUrl }),
                }),
                fetch("/api/realify-ar-advice", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ imageDataUrl: resizedDataUrl }),
                }),
              ]);

              let imgJson: any = null;
              let adviceJson: any = null;
              try {
                imgJson = await imgRes.json();
              } catch {
                imgJson = null;
              }
              try {
                adviceJson = await adviceRes.json();
              } catch {
                adviceJson = null;
              }

              if (!imgRes.ok || !imgJson?.imageUrl) {
                setUploadError(
                  (imgJson && imgJson.error) ||
                    "Failed to generate image from uploaded photo."
                );
              } else {
                setUploadResultUrl(imgJson.imageUrl);
              }

              if (adviceRes.ok && adviceJson?.advice) {
                setUploadAdvice(adviceJson.advice);
              }
            } catch (e: any) {
              setUploadError(e?.message || "Failed to process uploaded image.");
            } finally {
              setUploadLoading(false);
            }
          })();
        } catch (err: any) {
          setUploadError(err?.message || "Failed to process uploaded image.");
          setUploadLoading(false);
        }
      };
      img.onerror = () => {
        setUploadError("Failed to read image file.");
        setUploadLoading(false);
      };
      img.src = result;
    };

    reader.onerror = () => {
      setUploadError("Failed to read image file.");
      setUploadLoading(false);
    };

    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <main className="w-full h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm">Loading your 3D scene…</p>
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
    <main className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center py-6">
      <div className="max-w-md px-6 text-center mb-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold mb-2">View your 3D scene</h1>
          <p className="text-sm text-gray-300">
            Tap the <strong>START AR</strong> button to place your selected
            products in your space.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-gray-300">
            Or upload a screenshot from your AR scene and let the AI generate a
            styled image:
          </p>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadFileChange}
            />
            Choose screenshot
          </label>
          {uploadLoading && (
            <p className="text-[11px] text-gray-400">
              Processing uploaded image…
            </p>
          )}
          {uploadError && (
            <p className="text-[11px] text-red-400">{uploadError}</p>
          )}
        </div>
      </div>
      <div className="w-full max-w-xl h-[60vh] flex items-center justify-center">
        <MultiModalAR modelUrls={modelUrls} modelRealSizes={modelRealSizes} />
      </div>
      {uploadResultUrl && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4">
          <div className="max-h-[90vh] w-full max-w-md rounded-xl bg-black/90 p-4 text-white shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Generated image</h2>
              <button
                type="button"
                className="rounded bg-white/10 px-2 py-1 text-xs"
                onClick={() => {
                  setUploadResultUrl(null);
                  setUploadError(null);
                  setUploadAdvice(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={uploadResultUrl}
                alt="Generated from uploaded photo"
                className="max-h-[70vh] w-auto rounded-lg object-contain"
              />
            </div>
            {uploadAdvice && (
              <div className="mt-3 text-left text-xs text-gray-200 whitespace-pre-line">
                {uploadAdvice}
              </div>
            )}
            {uploadError && (
              <p className="mt-2 text-xs text-red-400">{uploadError}</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
