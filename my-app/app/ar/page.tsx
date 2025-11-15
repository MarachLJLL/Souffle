// app/ar/page.tsx
import MultiModalAR from "./MultiModalAR";

const MODEL_CATALOG = [
  {
    key: "leather-chair",
    name: "leather-chair",
    url: "/brown_leather_chair.glb",
    // Real-world dimensions in meters (length X, height Y, width/depth Z)
    dimensions: { length: 0.3, height: 0.5, width: 0.3 },
  },
  {
    key: "chair",
    name: "Chair",
    url: "/Chair.glb",
    // Example: ~60cm wide/deep, 90cm tall – tweak to your actual chair
    dimensions: { length: 0.4, height: 0.6, width: 0.4 },
  },
];

export default function ARPage() {
  return (
    <main className="w-full h-screen">
      <MultiModalAR
        modelUrls={MODEL_CATALOG.map((model) => model.url)}
        modelRealSizes={MODEL_CATALOG.map((model) => model.dimensions)}
      />
    </main>
  );
}
