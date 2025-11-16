"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

export default function MultiModelAR({ modelUrls, modelRealSizes }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const arButtonRef = useRef(null);

  const [supportStatus, setSupportStatus] = useState("checking");
  const [supportMessage, setSupportMessage] = useState(
    "Checking device for immersive AR support…"
  );

  // UI state: which model is selected in the catalogue
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Ref so WebXR controller handlers always see the latest selected index
  const selectedIndexRef = useRef(0);
  selectedIndexRef.current = selectedIndex;
  // One placed instance per model (for move/rotate)
  const placedInstancesRef = useRef([]);
  // Ref to suppress AR placement when the tap came from the UI (catalog buttons)
  const lastUiInteractionRef = useRef(0);
  // Optional visual bounding boxes + dimensions
  const [showBounds, setShowBounds] = useState(false);
  const [modelDimensions, setModelDimensions] = useState([]);
  const boundingHelpersRef = useRef([]);
  const boundingInfosRef = useRef([]);
  // Realify/snapshot state
  const [isRealifyLoading, setIsRealifyLoading] = useState(false);
  const [realImageUrl, setRealImageUrl] = useState(null);
  const [realifyError, setRealifyError] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isARSessionActive, setIsARSessionActive] = useState(false);

  const rotateSelected = (deltaDegrees) => {
    const idx = selectedIndexRef.current;
    const instances = placedInstancesRef.current;
    const instance = instances[idx];
    if (!instance) return;
    instance.rotateY(THREE.MathUtils.degToRad(deltaDegrees));
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    let renderer = null;
    let scene;
    let camera;
    let reticle;
    let controller = null;
    let hitTestSource = null;
    let hitTestSourceRequested = false;
    let canceled = false;

    const clock = new THREE.Clock();

    // All loaded base models (not yet placed)
    const loadedModels = [];
    // Group containing all placed instances
    const placedGroup = new THREE.Group();
    // Reset placed instances and bounding helpers per effect run
    placedInstancesRef.current = new Array(modelUrls.length).fill(null);
    boundingHelpersRef.current = new Array(modelUrls.length).fill(null);
    boundingInfosRef.current = new Array(modelUrls.length).fill(null);

    const setUnsupported = (message) => {
      if (canceled) return;
      setSupportStatus("unsupported");
      setSupportMessage(message);
    };

    const checkSupport = async () => {
      const nav = navigator;
      if (!("xr" in navigator) || !nav.xr || typeof nav.xr.isSessionSupported !== "function") {
        setUnsupported(
          "WebXR is unavailable here. Use Chrome on an ARCore-capable Android device over HTTPS."
        );
        return false;
      }
      try {
        const supported = await nav.xr.isSessionSupported("immersive-ar");
        if (canceled) return false;
        if (!supported) {
          setUnsupported(
            "Immersive AR sessions are not supported. Try Chrome on Android 8+ with Google Play Services for AR."
          );
        }
        return supported;
      } catch {
        if (!canceled) {
          setUnsupported(
            "Unable to check AR support. Ensure Chrome, HTTPS, and Google Play Services for AR are available."
          );
        }
        return false;
      }
    };

    const onSessionStart = () => {
      hitTestSourceRequested = false;
      renderer && renderer.setAnimationLoop(renderLoop);
      setIsARSessionActive(true);
    };

    const onSessionEnd = () => {
      hitTestSourceRequested = false;
      hitTestSource = null;
      if (renderer) {
        renderer.setAnimationLoop(null);
      }
      if (reticle) reticle.visible = false;
      setIsARSessionActive(false);
    };

    const onResize = () => {
      if (!renderer) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const setupHitTestSource = async (frame) => {
      const session = renderer && renderer.xr.getSession();
      if (!session) return;

      const referenceSpace = renderer.xr.getReferenceSpace();
      const viewerSpace = await session.requestReferenceSpace("viewer");

      // Some browsers expose requestHitTestSource on session, some on frame – cast via any in TS; here we just call it
      const source = await session.requestHitTestSource({
        space: viewerSpace,
      });

      hitTestSource = source;
      hitTestSourceRequested = true;

      session.addEventListener("end", () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
    };

    const renderLoop = (time, frame) => {
      clock.getDelta();

      if (frame && renderer) {
        if (!hitTestSourceRequested) {
          setupHitTestSource(frame);
        }

        if (hitTestSource) {
          const referenceSpace = renderer.xr.getReferenceSpace();
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);
            if (pose && reticle) {
              const matrix = new THREE.Matrix4().fromArray(
                pose.transform.matrix
              );
              reticle.visible = true;
              reticle.matrix.copy(matrix);
            }
          } else if (reticle) {
            reticle.visible = false;
          }
        }
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    const start = async () => {
      const supported = await checkSupport();
      if (!supported || canceled) return;

      setSupportStatus("supported");
      setSupportMessage("");

      if (!containerRef.current) return;

      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
      );

      const canvas = document.createElement("canvas");
      const contextAttributes = {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      };
      const context =
        canvas.getContext("webgl2", contextAttributes) ||
        canvas.getContext("webgl", contextAttributes) ||
        canvas.getContext("experimental-webgl", contextAttributes);
      if (!context) {
        setUnsupported("WebGL is blocked in this environment. Enable WebGL or switch devices.");
        return;
      }

      renderer = new THREE.WebGLRenderer({
        canvas,
        context,
        antialias: true,
        alpha: true,
      });
      rendererRef.current = renderer;
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      // Transparent clear so camera feed is visible
      renderer.setClearColor(0x000000, 0);

      containerRef.current.appendChild(renderer.domElement);

      const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.0);
      scene.add(ambient);

      const directional = new THREE.DirectionalLight(0xffffff, 0.6);
      directional.position.set(1, 3, 2);
      scene.add(directional);

      const ringGeo = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ opacity: 0.9, transparent: true });
      reticle = new THREE.Mesh(ringGeo, ringMat);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      // Group that will hold all placed instances
      scene.add(placedGroup);

      // Load all models once, applying real-world dimensions if provided
      const loader = new GLTFLoader();
      const modelPromises = modelUrls.map(
        (url, idx) =>
          new Promise((resolve, reject) => {
            loader.load(
              url,
              (gltf) => {
                const model = gltf.scene;

                const dims = modelRealSizes && modelRealSizes[idx];

                if (dims && (dims.length || dims.width || dims.height)) {
                  // Compute uniform scale so the bounding box roughly matches catalog dimensions
                  const box = new THREE.Box3().setFromObject(model);
                  const size = new THREE.Vector3();
                  box.getSize(size);
                  const center = new THREE.Vector3();
                  box.getCenter(center);
                  model.worldToLocal(center);

                  const factors = [];
                  if (size.x > 0 && dims.length) factors.push(dims.length / size.x);
                  if (size.y > 0 && dims.height) factors.push(dims.height / size.y);
                  if (size.z > 0 && dims.width) factors.push(dims.width / size.z);

                  const uniformScale =
                    factors.length > 0
                      ? factors.reduce((a, b) => a + b, 0) / factors.length
                      : 1;

                  model.scale.setScalar(uniformScale);

                  // Store the intended real-world dimensions for UI (L×H×D)
                  const finalSize = {
                    x: dims.length ?? size.x * uniformScale,
                    y: dims.height ?? size.y * uniformScale,
                    z: dims.width ?? size.z * uniformScale,
                  };
                  boundingInfosRef.current[idx] = {
                    size: new THREE.Vector3(finalSize.x, finalSize.y, finalSize.z),
                    center: center.clone().multiplyScalar(uniformScale),
                  };
                  setModelDimensions((prev) => {
                    const next = [...prev];
                    next[idx] = finalSize;
                    return next;
                  });
                } else {
                  // Fallback: normalize to a default size and compute approximate dimensions
                  normalizeModelScale(model, 0.3);
                  const box = new THREE.Box3().setFromObject(model);
                  const size = new THREE.Vector3();
                  const center = new THREE.Vector3();
                  box.getSize(size);
                  box.getCenter(center);
                  model.worldToLocal(center);
                  boundingInfosRef.current[idx] = {
                    size: size.clone(),
                    center: center.clone(),
                  };
                  setModelDimensions((prev) => {
                    const next = [...prev];
                    next[idx] = { x: size.x, y: size.y, z: size.z };
                    return next;
                  });
                }

                resolve(model);
              },
              undefined,
              (err) => reject(err)
            );
          })
      );

      try {
        const models = await Promise.all(modelPromises);
        models.forEach((m, idx) => {
          loadedModels[idx] = m;
        });
      } catch (err) {
        console.error("Error loading models:", err);
      }

      // DOM overlay root
      const overlayRoot = document.getElementById("xr-overlay");

      // AR Button with DOM overlay
      const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: overlayRoot ? { root: overlayRoot } : undefined,
      });
      // Keep the real ARButton in the DOM for WebXR logic, but hide it visually.
      // We'll drive it via a custom centered "START AR" button in our React UI.
      arButton.style.position = "fixed";
      arButton.style.bottom = "0";
      arButton.style.left = "0";
      arButton.style.width = "1px";
      arButton.style.height = "1px";
      arButton.style.opacity = "0";
      arButton.style.pointerEvents = "none";
      arButton.style.margin = "0";
      arButtonRef.current = arButton;
      containerRef.current.appendChild(arButton);

      controller = renderer.xr.getController(0);
      controller.addEventListener("select", () => {
        // If the select was triggered by a recent UI tap, ignore it
        const now = performance.now();
        if (now - lastUiInteractionRef.current < 400) {
          return;
        }
        if (!reticle.visible) return;
        const index = selectedIndexRef.current;
        const base = loadedModels[index];
        if (!base) return;

        const instances = placedInstancesRef.current;
        const helpers = boundingHelpersRef.current;
        let instance = instances[index];

        // First time: create and remember a single instance for this model
        if (!instance) {
          instance = base.clone(true);
          placedGroup.add(instance);
          instances[index] = instance;
        }

        // Move the instance to the current reticle pose
        instance.position.setFromMatrixPosition(reticle.matrix);
        instance.quaternion.setFromRotationMatrix(reticle.matrix);

        // Remove any existing helper for this model BEFORE computing bounds,
        // so the bounding box only measures the actual mesh, not the helper itself.
        let helperGroup = helpers[index];
        if (helperGroup && helperGroup.parent) {
          helperGroup.parent.remove(helperGroup);
          helpers[index] = null;
        }

        // Measure a tighter oriented bounding box in the model's local space,
        // then parent the helper to the instance so it follows rotation.
        instance.updateWorldMatrix(true, true);

        // Build a tight world-space box by unioning per-mesh geometry bounds
        const worldBox = new THREE.Box3();
        instance.traverse((obj) => {
          if (obj.isMesh && obj.geometry) {
            if (!obj.geometry.boundingBox) {
              obj.geometry.computeBoundingBox();
            }
            if (obj.geometry.boundingBox) {
              const geomBox = obj.geometry.boundingBox.clone();
              geomBox.applyMatrix4(obj.matrixWorld);
              worldBox.union(geomBox);
            }
          }
        });

        // Fallback: if traversal produced an empty box, use the classic setFromObject
        if (worldBox.isEmpty()) {
          worldBox.setFromObject(instance);
        }

        // Transform world-aligned box into the instance's local space
        const invWorld = new THREE.Matrix4().copy(instance.matrixWorld).invert();
        worldBox.applyMatrix4(invWorld);

        const size = new THREE.Vector3();
        const centerLocal = new THREE.Vector3();
        worldBox.getSize(size);
        worldBox.getCenter(centerLocal);

        // Create a fresh helper group (local-space helper, parented to the instance)

        const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const fill = new THREE.Mesh(
          boxGeo,
          new THREE.MeshBasicMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.08,
            depthWrite: false,
          })
        );
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(boxGeo),
          new THREE.LineBasicMaterial({ color: 0x22c55e })
        );

        fill.position.set(0, 0, 0);
        edges.position.set(0, 0, 0);

        // Helper to create a small canvas-based label sprite with given text
        const makeLabelSprite = (text) => {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 64;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#22c55e";
            ctx.font = "14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
          }
          const tex = new THREE.CanvasTexture(canvas);
          tex.needsUpdate = true;
          const mat = new THREE.SpriteMaterial({
            map: tex,
            depthTest: false,
            depthWrite: false,
            transparent: true,
          });
          const sprite = new THREE.Sprite(mat);
          return sprite;
        };

        // Prefer input dimensions from modelRealSizes for label text (no fallback to approximations)
        const inputDims = modelRealSizes && modelRealSizes[index];
        // Length (X) label – centered along the front-top edge
        const lengthLabel = makeLabelSprite(`${Number(inputDims.length).toFixed(2)}m`);
        const lengthScale = Math.max(size.x, 0.15) * 0.5;
        lengthLabel.scale.set(lengthScale, lengthScale * 0.18, 1);
        lengthLabel.position.set(0, size.y / 2 + 0.05, size.z / 2);

        // Height (Y) label – along a vertical edge on the front-right corner
        const heightLabel = makeLabelSprite(`${Number(inputDims.height).toFixed(2)}m`);
        const heightScale = Math.max(size.y, 0.15) * 0.5;
        heightLabel.scale.set(heightScale, heightScale * 0.18, 1);
        heightLabel.position.set(size.x / 2 + 0.05, 0, size.z / 2);

        // Width/Depth (Z) label – centered along the right-top edge
        const widthLabel = makeLabelSprite(`${Number(inputDims.width).toFixed(2)}m`);
        const widthScale = Math.max(size.z, 0.15) * 0.5;
        widthLabel.scale.set(widthScale, widthScale * 0.18, 1);
        widthLabel.position.set(size.x / 2, size.y / 2 + 0.05, 0);

        helperGroup = new THREE.Group();
        helperGroup.add(fill);
        helperGroup.add(edges);
        helperGroup.add(lengthLabel);
        helperGroup.add(heightLabel);
        helperGroup.add(widthLabel);
        // Position helper at the model's center in local space so it rotates with the instance
        helperGroup.position.copy(centerLocal);
        helperGroup.visible = showBounds && index === selectedIndexRef.current;
        helpers[index] = helperGroup;

        // Parent helper to the instance so it rotates/moves with the model
        instance.add(helperGroup);
      });
      scene.add(controller);

      renderer.xr.addEventListener("sessionstart", onSessionStart);
      renderer.xr.addEventListener("sessionend", onSessionEnd);
      renderer.setAnimationLoop(renderLoop);
      window.addEventListener("resize", onResize);
    };

    start();

    return () => {
      canceled = true;
      window.removeEventListener("resize", onResize);
      if (renderer) {
        renderer.xr.removeEventListener("sessionstart", onSessionStart);
        renderer.xr.removeEventListener("sessionend", onSessionEnd);
        renderer.setAnimationLoop(null);
        renderer.dispose();
        rendererRef.current = null;
        const host = containerRef.current;
        if (host && renderer.domElement.parentElement === host) {
          host.removeChild(renderer.domElement);
        }
      }
    };
  }, [modelUrls, modelRealSizes]);

  // Keep helpers' visibility aligned with selection + toggle
  useEffect(() => {
    const helpers = boundingHelpersRef.current || [];
    helpers.forEach((helper, idx) => {
      if (!helper) return;
      helper.visible = showBounds && idx === selectedIndex;
    });
  }, [showBounds, selectedIndex]);

  const handleRealifySnapshot = async () => {
    lastUiInteractionRef.current = performance.now();
    setRealifyError(null);

    const renderer = rendererRef.current;
    if (!renderer || !renderer.domElement) {
      setRealifyError("AR view is not ready yet. Start AR and try again.");
      return;
    }

    try {
      // Wait one animation frame to ensure we capture the latest rendered view
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = renderer.domElement;
      const dataUrl = canvas.toDataURL("image/png");

      setIsRealifyLoading(true);

      const res = await fetch("/api/realify-ar-snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });

      let json = null;
      try {
        json = await res.json();
      } catch {
        // If parsing fails, surface raw text for debugging
        const text = await res.text().catch(() => "");
        throw new Error(
          text || "Failed to parse response from realify endpoint."
        );
      }

      console.log("realify-ar-snapshot response:", json);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to generate real-life image.");
      }

      if (!json?.imageUrl) {
        throw new Error(
          "No image URL returned from realify endpoint. Payload: " +
            JSON.stringify(json)
        );
      }

      setRealImageUrl(json.imageUrl);

      // Optional: automatically end the AR session once the real-life render is ready
      try {
        const session = renderer.xr && renderer.xr.getSession && renderer.xr.getSession();
        if (session) {
          await session.end();
        }
      } catch (sessionErr) {
        console.warn("Failed to end AR session after realify:", sessionErr);
      }
    } catch (err) {
      console.error("Realify snapshot error:", err);
      setRealifyError(
        err && err.message
          ? err.message
          : "Something went wrong generating the real-life image."
      );
    } finally {
      setIsRealifyLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Centered custom START AR button that triggers the hidden WebXR ARButton */}
      {supportStatus === "supported" && !isARSessionActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg"
            onClick={() => {
              lastUiInteractionRef.current = performance.now();
              if (arButtonRef.current) {
                arButtonRef.current.click();
              }
            }}
          >
            START AR
          </button>
        </div>
      )}

      {/* WebXR canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden bg-black"
      />

      {/* DOM overlay root – contains bottom sheet UI over AR */}
      <div
        id="xr-overlay"
        className="pointer-events-none fixed inset-0"
      >
        {isARSessionActive && (
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center p-2 md:p-4">
            <div className="w-full max-w-md rounded-t-2xl bg-black/80 text-white shadow-xl">
              {/* Drag / toggle handle */}
              <div className="flex items-center justify-center py-1">
                <button
                  type="button"
                  className="flex h-6 w-10 items-center justify-center rounded-full bg-white/15 text-xs"
                  onClick={() => {
                    lastUiInteractionRef.current = performance.now();
                    setIsPanelOpen((prev) => !prev);
                  }}
                >
                  {isPanelOpen ? "▼" : "▲"}
                </button>
              </div>

              {isPanelOpen && (
                <div className="border-t border-white/10 px-3 pb-3 pt-2">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-200">
                      Models & AR controls
                    </h2>
                  </div>

                  {/* Models list with thumbnails */}
                  <div className="mb-3 flex max-h-20 gap-2 overflow-x-auto pr-1">
                    {modelUrls.map((url, idx) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => {
                          lastUiInteractionRef.current = performance.now();
                          setSelectedIndex(idx);
                        }}
                        className={`flex items-center justify-center rounded-lg border px-1 py-1 ${
                          idx === selectedIndex
                            ? "border-white bg-white/10"
                            : "border-white/20 bg-white/5"
                        }`}
                      >
                        <ModelThumbnail url={url} />
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mb-2 grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      type="button"
                      className="rounded bg-white/10 px-2 py-1"
                      onClick={() => {
                        lastUiInteractionRef.current = performance.now();
                        rotateSelected(15);
                      }}
                    >
                      Rotate ⟲
                    </button>
                    <button
                      type="button"
                      className="rounded bg-white/10 px-2 py-1"
                      onClick={() => {
                        lastUiInteractionRef.current = performance.now();
                        rotateSelected(-15);
                      }}
                    >
                      Rotate ⟳
                    </button>
                    <button
                      type="button"
                      className={`rounded px-2 py-1 ${
                        showBounds ? "bg-white text-black" : "bg-white/10 text-white"
                      }`}
                      onClick={() => {
                        lastUiInteractionRef.current = performance.now();
                        setShowBounds((prev) => !prev);
                      }}
                    >
                      {showBounds ? "Hide bounds" : "Show bounds"}
                    </button>
                    <button
                      type="button"
                      className="rounded bg-white/10 px-2 py-1 disabled:opacity-50"
                      onClick={handleRealifySnapshot}
                      disabled={isRealifyLoading}
                    >
                      {isRealifyLoading ? "Generating…" : "Snapshot → Real photo"}
                    </button>
                  </div>

                  {/* Info / dimensions / errors */}
                  {modelRealSizes && modelRealSizes[selectedIndex] && (
                    <p className="text-[10px] text-gray-300">
                      {`Size: ${Number(modelRealSizes[selectedIndex].length).toFixed(
                        2
                      )}m × ${Number(modelRealSizes[selectedIndex].height).toFixed(
                        2
                      )}m × ${Number(modelRealSizes[selectedIndex].width).toFixed(2)}m (L×H×W)`}
                    </p>
                  )}
                  {realifyError && (
                    <p className="mt-1 text-[10px] text-red-400">
                      {realifyError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {supportStatus === "checking" && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 w-max -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs text-white">
          Checking AR support…
        </div>
      )}
      {supportStatus === "unsupported" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center text-white">
          <p className="mb-2 text-lg font-semibold">AR not supported</p>
          <p className="text-sm text-gray-200">{supportMessage}</p>
          <p className="mt-3 text-xs text-gray-400">
            Use Chrome on an ARCore-capable Android device, update Google Play Services for AR, and
            load this page over HTTPS.
          </p>
        </div>
      )}

      {isRealifyLoading && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          <div className="rounded-full bg-black/70 px-4 py-2 text-xs text-white">
            Generating real-life image…
          </div>
        </div>
      )}

      {realImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="max-h-[90vh] w-full max-w-md rounded-xl bg-black/90 p-4 text-white shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Real-life render</h2>
              <button
                type="button"
                className="rounded bg-white/10 px-2 py-1 text-xs"
                onClick={() => {
                  setRealImageUrl(null);
                  setRealifyError(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={realImageUrl}
                alt="Real-life AR snapshot"
                className="max-h-[70vh] w-auto rounded-lg object-contain"
              />
            </div>
            {realifyError && (
              <p className="mt-2 text-xs text-red-400">{realifyError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Normalize a model so its largest dimension = targetSize (in meters).
 */
function normalizeModelScale(object, targetSize) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;
  const scale = targetSize / maxDim;
  object.scale.setScalar(scale);
}

/**
 * Small rotating thumbnail for a GLB model.
 * Uses its own lightweight Three.js scene and canvas.
 */
function ModelThumbnail({ url }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let renderer = null;
    let scene = null;
    let camera = null;
    let model = null;
    let frameId = null;
    let disposed = false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 2, 2);
    scene.add(dir);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(96, 96, false);

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        normalizeModelScale(model, 0.6);

        // Center model at origin based on its bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        model.position.sub(center);
        scene.add(model);

        // Position camera so the whole model fits nicely in view and is centered
        const maxDim = Math.max(size.x, size.y, size.z);
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const dist = (maxDim / 2) / Math.tan(fovRad / 2) * 1.4; // small padding factor
        camera.position.set(0, 0, dist);
        camera.lookAt(0, 0, 0);
      },
      undefined,
      () => {
        // ignore errors in thumbnail
      }
    );

    const animate = () => {
      if (disposed || !renderer) return;
      frameId = requestAnimationFrame(animate);
      if (model) {
        model.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      className="h-16 w-16 rounded-md bg-black/30"
    />
  );
}
