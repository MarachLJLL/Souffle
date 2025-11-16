import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ProductPreview3D = ({ productId, glbPath, measurements, imageFallback }) => {
  const containerRef = useRef(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !glbPath) return;

    const container = containerRef.current;
    
    // Clear any existing content
    container.innerHTML = '';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    container.style.width = '100%';
    // Height is now managed by CSS (400px) for consistent alignment
    container.style.position = 'relative';
    container.style.background = '#E4E2E2';

    // Will be updated after model loads to match item's aspect ratio
    let itemAspectRatio = 1; // Default to square
    let containerWidth = 0;

    const getDimensions = () => {
      const parentWidth =
        container.parentElement?.clientWidth || container.offsetWidth || 300;
      containerWidth = Math.max(parentWidth, 300);
      const width = containerWidth;
      
      // Use fixed height from CSS (400px) to ensure all products align on same line
      // Get height from computed style or use fixed 400px
      const computedHeight = window.getComputedStyle(container).height;
      const height = computedHeight ? parseInt(computedHeight, 10) : 400;
      
      // Don't override the height - let CSS handle it
      // container.style.height is now managed by CSS
      
      // Calculate aspect ratio from fixed dimensions
      const actualAspectRatio = width / height;
      return { width, height, aspectRatio: actualAspectRatio };
    };

    // Initial dimensions (will be updated after model loads)
    let { width, height, aspectRatio } = getDimensions();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xE4E2E2, 1);
    container.appendChild(renderer.domElement);

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // Maximum brightness - very high ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    // Main directional light - very high intensity
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Strong fill light from opposite side to reduce shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);
    
    // Bright rim light for edge definition
    const rimLight = new THREE.PointLight(0xffffff, 1.0);
    rimLight.position.set(0, 0, -5);
    scene.add(rimLight);

    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();

    let model = null;
    let isHovering = false;
    let targetRotation = 0;
    let currentRotation = 0;

    const loader = new GLTFLoader();
    
    // Use the path directly like Product.jsx does
    // glbPath should already be like "/database/glbs/1.glb" from ProductsContext
    // Add cache-busting query parameter to force browser to reload updated GLB files
    const basePath = glbPath || '/database/glbs/1.glb';
    const modelPath = `${basePath}?v=${Date.now()}`;
    
    console.log(`Loading 3D model for product ${productId}: ${modelPath}`);
    
    loader.load(
      modelPath,
      (gltf) => {
        model = gltf.scene;
        
        // First, center the model at origin for easier calculations
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Temporarily center the model
        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        // Normalize all models to the same vertical height for consistent sizing
        // This ensures all products appear the same size and align at top and bottom
        const targetHeight = 2.0; // Fixed target height for all models (same for all products)
        const modelHeight = size.y; // Get the vertical height of the model
        
        // Scale based on height to ensure all models fit within the same vertical space
        let scale = targetHeight / modelHeight;
        
        // Clamp scale to reasonable range to prevent extreme scaling
        scale = Math.max(0.5, Math.min(3.0, scale));
        
        // Calculate max dimension for camera positioning
        const maxDim = Math.max(size.x, size.y, size.z);
        const itemMaxDim = maxDim * scale;
        
        model.scale.multiplyScalar(scale);
        
        // Recalculate bounding box after scaling
        // At this point, model is centered at (-center.x, -center.y, -center.z) and scaled
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledSize = scaledBox.getSize(new THREE.Vector3());
        const scaledMaxDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
        
        // Get the bounding box min/max and center in world space
        const scaledMin = scaledBox.min; // World space minimum Y (bottom of model)
        const scaledMax = scaledBox.max; // World space maximum Y (top of model)
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        
        // Align all models at a uniform baseline Y position with consistent height
        // This ensures all products (chairs, vases, lamps, plants) are the same size
        // and align at both top and bottom
        const baselineY = -1.5; // Fixed baseline for all models (bottom edge)
        const topY = baselineY + targetHeight; // Fixed top edge (should be -1.5 + 2.0 = 0.5)
        
        // Calculate where the model currently is and where it needs to be
        // The scaledMin.y is the current world-space bottom of the model
        // We want it to be at baselineY, so adjust position accordingly
        const currentBottomY = scaledMin.y;
        const currentTopY = scaledMax.y;
        const yOffset = baselineY - currentBottomY;
        
        // Center X and Z horizontally, but position Y so bottom edge aligns at baseline
        model.position.x = -scaledCenter.x;
        model.position.y = model.position.y + yOffset; // Adjust from current position
        model.position.z = -scaledCenter.z;
        
        // Verify alignment by recalculating bounding box after final positioning
        const finalBox = new THREE.Box3().setFromObject(model);
        const finalMinY = finalBox.min.y;
        const finalMaxY = finalBox.max.y;
        
        // Double-check: ensure all models have exactly the same bottom Y coordinate
        // Fine-tune if needed to account for any floating point or calculation differences
        const tolerance = 0.001;
        if (Math.abs(finalMinY - baselineY) > tolerance) {
          const correction = baselineY - finalMinY;
          model.position.y += correction;
          
          // Recalculate after correction
          const correctedBox = new THREE.Box3().setFromObject(model);
          const correctedMinY = correctedBox.min.y;
          const correctedMaxY = correctedBox.max.y;
          
          // Verify both bottom and top alignment
          if (Math.abs(correctedMinY - baselineY) > tolerance) {
            console.warn(`Product ${productId}: Bottom alignment may be off. Expected ${baselineY}, got ${correctedMinY}`);
          }
          if (Math.abs(correctedMaxY - topY) > tolerance * 2) {
            console.warn(`Product ${productId}: Height may be inconsistent. Expected top at ${topY}, got ${correctedMaxY}`);
          }
        }
        
        // Calculate item's aspect ratio (width/height from top view)
        // Use X (width) and Y (height) for aspect ratio calculation
        const itemWidth = scaledSize.x;
        const itemHeight = scaledSize.y;
        const itemDepth = scaledSize.z;
        
        // For display, we want to show the item from a perspective view
        // Calculate aspect ratio based on the visible dimensions
        // Use the larger of width/depth for horizontal, height for vertical
        const visibleWidth = Math.max(itemWidth, itemDepth);
        const visibleHeight = itemHeight;
        
         // Update aspect ratio to match item's proportions
         // Clamp more tightly to prevent extreme aspect ratios that cause gaps
         // Keep aspect ratio closer to square to maintain consistent container heights
         itemAspectRatio = visibleWidth > 0 && visibleHeight > 0 
           ? Math.max(0.75, Math.min(1.25, visibleWidth / visibleHeight)) // Clamp between 0.75 and 1.25 (closer to square)
           : 1;
        
        // Use fixed container dimensions (don't adjust based on item aspect ratio)
        // This ensures all products have the same container height and align properly
        const newDimensions = getDimensions();
        width = newDimensions.width;
        height = newDimensions.height;
        aspectRatio = newDimensions.aspectRatio;
        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        
        // Don't override container height - let CSS manage it for consistent alignment
        
        // Calculate camera distance to ensure item fits within view frustum
        // Use the diagonal of the bounding box to ensure everything fits
        const diagonal = Math.sqrt(
          scaledSize.x * scaledSize.x + 
          scaledSize.y * scaledSize.y + 
          scaledSize.z * scaledSize.z
        );
        
        // Calculate required distance using camera's field of view
        // FOV is 45 degrees, so we need to fit the diagonal within the view
        const fovRad = (camera.fov * Math.PI) / 180;
        const padding = 1.3; // Extra padding to ensure nothing is cut off
        const requiredDistance = (diagonal / 2) / Math.tan(fovRad / 2) * padding;
        
        // Clamp distance to reasonable bounds
        const cameraDistance = Math.max(3, Math.min(requiredDistance, 15));
        
        // Set camera position: fixed height and angle for consistent view across all products
        // This ensures all products appear aligned on the same baseline in the viewport
        // Use a consistent look-at point that's the same for all models to ensure uniform alignment
        const cameraHeight = 0.3; // Slight elevation for better view angle
        const lookAtY = baselineY + 1.0; // Fixed look-at point above baseline (same for all models)
        camera.position.set(0, cameraHeight, cameraDistance);
        camera.lookAt(0, lookAtY, 0); // Look at fixed point to ensure all models align uniformly
        
        // Ensure the model is perfectly centered
        // (Already done above with model.position.set(-center.x, -center.y, -center.z))

        scene.add(model);

        const productItem = container.closest('.product-item') || container;

        const handleMouseEnter = () => {
          isHovering = true;
        };

        const handleMouseLeave = () => {
          isHovering = false;
        };

        productItem.addEventListener('mouseenter', handleMouseEnter);
        productItem.addEventListener('mouseleave', handleMouseLeave);

        function animate() {
          requestAnimationFrame(animate);

          if (isHovering) {
            targetRotation += 0.02;
          }

          currentRotation += (targetRotation - currentRotation) * 0.1;
          if (model) {
            model.rotation.y = currentRotation;
          }

          renderer.render(scene, camera);
        }
        animate();

        const resizeObserver = new ResizeObserver(() => {
          const newWidth =
            container.clientWidth ||
            container.parentElement?.clientWidth ||
            300;
          const newHeight = container.clientHeight || 400; // Use fixed height from CSS
          if (newWidth > 0) {
            // Use fixed aspect ratio from container, not item's aspect ratio
            const containerAspectRatio = newWidth / newHeight;
            camera.aspect = containerAspectRatio;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
          }
        });
        resizeObserver.observe(container);

        return () => {
          productItem.removeEventListener('mouseenter', handleMouseEnter);
          productItem.removeEventListener('mouseleave', handleMouseLeave);
          resizeObserver.disconnect();
        };
      },
      (progress) => {
        // Loading progress
        if (progress.lengthComputable) {
          const percentComplete = (progress.loaded / progress.total) * 100;
          // console.log(`Loading ${productId}: ${percentComplete.toFixed(0)}%`);
        }
      },
      (error) => {
        console.error(`3D preview error for product ${productId}:`, error);
        console.error(`Attempted path: ${modelPath}`);
        console.error(`Original glbPath: ${glbPath}`);
        
        // Fallback to image if available
        if (imageFallback) {
          setHasError(true);
        } else {
          // Only show error message if no image fallback
          if (container) {
            container.innerHTML =
              '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 14px;">3D Preview Unavailable</div>';
          }
        }
      }
    );

    return () => {
      if (container && renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [productId, glbPath, imageFallback]);

  // Show image fallback if 3D preview failed
  if (hasError && imageFallback) {
    return (
      <img
        src={imageFallback}
        alt={`Product ${productId}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  }

  return <div ref={containerRef} id={`product-preview-${productId}`} />;
};

export default ProductPreview3D;

