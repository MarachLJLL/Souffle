// app/api/realify-ar-snapshot/route.js

import OpenAI, { toFile } from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "OPENAI_API_KEY is not set. Add it to your .env.local and restart the dev server.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const imageDataUrl = body?.imageDataUrl;

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing imageDataUrl." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // data:image/png;base64,XXXX...
    const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.\-]+);base64,(.+)$/);
    if (!match) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid imageDataUrl (expected data URL like data:image/png;base64,...).",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const mimeType = match[1] || "image/png";
    const base64 = match[2];
    const imageBuffer = Buffer.from(base64, "base64");

    // Convert Buffer → File-like object for images.edit
    const imageFile = await toFile(imageBuffer, "ar-snapshot.png", {
      type: mimeType,
    });

    const prompt =
      "Take this AR-style product render and generate a photorealistic image " +
      "of the same product in a realistic environment that matches the perspective and lighting.";

    // === Images Edit call as per the docs you pasted ===
    const rsp = await client.images.edit({
      model: "gpt-image-1",   // only gpt-image-1 / dall-e-2 allowed
      image: imageFile,       // File or array of Files
      prompt,                 // required text description
      size: "1024x1024",      // allowed for gpt-image-1
      // Optional extras you *can* use for gpt-image-1:
      // output_format: "png",       // default is png
      // quality: "high",            // high / medium / low / auto
      // input_fidelity: "high",     // high / low
      // background: "auto",         // auto / transparent / opaque
      // n: 1,                       // default 1
      // DO NOT set response_format here -> only for dall-e-2
    });

    const imageBase64 = rsp?.data?.[0]?.b64_json;
    if (!imageBase64) {
      throw new Error("No image returned from OpenAI Images API.");
    }

    // gpt-image-1 always returns base64, so we wrap as data URL for the frontend
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    return new Response(JSON.stringify({ imageUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("realify-ar-snapshot error:", err);
    return new Response(
      JSON.stringify({
        error:
          err?.message ||
          "Failed to generate real-life image from snapshot.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
