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
    container.style.minHeight = '380px';
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
      let height = width / itemAspectRatio; // Use item's aspect ratio
      
      // Constrain height to prevent extreme tall containers that cause gaps
      // Max height should be reasonable (e.g., 1.5x the width for tall items)
      const maxHeight = containerWidth * 1.5;
      const minHeight = containerWidth * 0.75;
      height = Math.max(minHeight, Math.min(height, maxHeight));
      
      container.style.height = `${height}px`;
      
      // Recalculate actual aspect ratio after constraints
      const actualAspectRatio = width / height;
      return { width, height, aspectRatio: actualAspectRatio };
    };

    // Initial dimensions (will be updated after model loads)
    let { width, height, aspectRatio } = getDimensions();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xE4E2E2, 1);
    // Increase color saturation in output
    renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    const modelPath = glbPath || '/database/glbs/1.glb';
    
    console.log(`Loading 3D model for product ${productId}: ${modelPath}`);
    
    loader.load(
      modelPath,
      (gltf) => {
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;
        
        // Increase saturation of all materials for more vibrant colors
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
              if (material.color) {
                // Convert RGB to HSL, increase saturation, convert back
                const color = material.color;
                const hsl = { h: 0, s: 0, l: 0 };
                color.getHSL(hsl);
                // Increase saturation by 40% (clamp to max 1.0)
                hsl.s = Math.min(1.0, hsl.s * 1.4);
                color.setHSL(hsl.h, hsl.s, hsl.l);
              }
            });
          }
        });

        // Scale based on real-world measurements to ensure proportional sizing
        // The goal: larger real-world items should appear larger, not smaller
        let scale = 1;
        let itemMaxDim = 0; // Track the maximum dimension after scaling
        
        if (measurements && measurements.height) {
          // Find the maximum dimension in measurements
          const maxMeasurement = Math.max(
            measurements.length || 0,
            measurements.width || 0,
            measurements.height || 0
          );
          
          if (maxMeasurement > 0) {
            // Use a smaller reference size (10cm) so chairs appear larger
            const referenceSize = 10; // cm
            
            // Calculate what the bounding box size should be for this measurement
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Normalize: larger measurements = larger visual size
            const measurementRatio = maxMeasurement / referenceSize;
            const boundingRatio = maxDim;
            
            // Target: make all items fit within ~2 units, but proportionally
            const targetSize = 2.0;
            const sizeBasedScale = targetSize / boundingRatio;
            
            // Adjust scale based on measurements to maintain proportions
            const measurementBoost = Math.pow(measurementRatio, 0.3);
            scale = sizeBasedScale * measurementBoost;
            
            // Clamp to reasonable range
            scale = Math.max(0.6, Math.min(3.0, scale));
            
            // Calculate the maximum dimension after scaling for camera positioning
            itemMaxDim = maxDim * scale;
          } else {
            // Fallback if measurements are invalid
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 2) {
              scale = 2 / maxDim;
            }
            itemMaxDim = maxDim * scale;
          }
        } else {
          // Fallback to bounding box scaling if no measurements
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 2) {
            scale = 2 / maxDim;
          }
          itemMaxDim = maxDim * scale;
        }
        
        model.scale.multiplyScalar(scale);
        
        // Recalculate bounding box after scaling to get accurate dimensions
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledSize = scaledBox.getSize(new THREE.Vector3());
        const scaledMaxDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
        
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
        
        // Update container dimensions to match item's aspect ratio
        const newDimensions = getDimensions();
        width = newDimensions.width;
        height = newDimensions.height;
        aspectRatio = newDimensions.aspectRatio;
        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        
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
        
        // Set camera position: higher up looking down at the model
        // Increase Y position significantly for a top-down angle view
        const cameraHeight = scaledSize.y * 0.8; // 80% of item height for a higher downward angle
        camera.position.set(0, cameraHeight, cameraDistance);
        camera.lookAt(0, -scaledSize.y * 0.2, 0); // Look slightly below center for better downward view
        
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
          if (newWidth > 0) {
            // Use the item's aspect ratio, not a fixed 1:1
            const newHeight = newWidth / itemAspectRatio;
            container.style.height = `${newHeight}px`;
            camera.aspect = itemAspectRatio;
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

