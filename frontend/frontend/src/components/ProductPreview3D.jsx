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

    const getDimensions = () => {
      const parentWidth =
        container.parentElement?.clientWidth || container.offsetWidth || 300;
      const aspectRatio = 1;
      const width = Math.max(parentWidth, 300);
      const height = width * aspectRatio;
      container.style.height = `${height}px`;
      return { width, height, aspectRatio };
    };

    const { width, height, aspectRatio } = getDimensions();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xE4E2E2, 1);
    container.appendChild(renderer.domElement);

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0, 5);

    let model = null;
    let isHovering = false;
    let targetRotation = 0;
    let currentRotation = 0;

    const loader = new GLTFLoader();
    
    // Use the path directly like Product.jsx does
    // glbPath should already be like "/database/glbs/1.glb" from ProductsContext
    const modelPath = glbPath || '/assets/models/Chair.glb';
    
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

        // Scale based on real-world measurements to ensure proportional sizing
        // The goal: larger real-world items should appear larger, not smaller
        let scale = 1;
        if (measurements && measurements.height) {
          // Find the maximum dimension in measurements (height is usually largest for furniture)
          const maxMeasurement = Math.max(
            measurements.length || 0,
            measurements.width || 0,
            measurements.height || 0
          );
          
          if (maxMeasurement > 0) {
            // Use a smaller reference size (10cm) so chairs appear larger
            // This ensures all items, including smaller chairs, get good scale
            const referenceSize = 10; // cm (reduced from 20 to make chairs larger)
            
            // Calculate what the bounding box size should be for this measurement
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Normalize: larger measurements = larger visual size
            // But we need to account for the actual bounding box size
            const measurementRatio = maxMeasurement / referenceSize;
            const boundingRatio = maxDim; // Current bounding box size
            
            // Target: make all items fit within ~2 units, but proportionally
            // Larger real-world items should appear larger
            const targetSize = 2.0;
            const sizeBasedScale = targetSize / boundingRatio;
            
            // Adjust scale based on measurements to maintain proportions
            // Use a gentler power function so smaller items (chairs) don't get too small
            // Items with larger measurements get a boost, but not too aggressive
            const measurementBoost = Math.pow(measurementRatio, 0.3); // Gentler than 0.5 to favor smaller items
            scale = sizeBasedScale * measurementBoost;
            
            // Clamp to reasonable range, with higher minimum to ensure chairs are visible
            scale = Math.max(0.6, Math.min(3.0, scale));
          } else {
            // Fallback if measurements are invalid
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 2) {
              scale = 2 / maxDim;
            }
          }
        } else {
          // Fallback to bounding box scaling if no measurements
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 2) {
            scale = 2 / maxDim;
          }
        }
        
        model.scale.multiplyScalar(scale);

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
            const newHeight = newWidth * aspectRatio;
            container.style.height = `${newHeight}px`;
            camera.aspect = aspectRatio;
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

