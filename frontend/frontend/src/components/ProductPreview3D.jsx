import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ProductPreview3D = ({ productId, glbPath }) => {
  const containerRef = useRef(null);

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
    container.style.background = '#f5f5f5';

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
    renderer.setClearColor(0xf5f5f5, 1);
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
    
    // Ensure the path is correct for Vite public directory
    // glbPath should already be like "/database/glbs/1.glb" from ProductsContext
    // But if it's not, normalize it
    let modelPath = glbPath;
    if (!modelPath.startsWith('/')) {
      if (modelPath.startsWith('../')) {
        modelPath = modelPath.replace('../', '/');
      } else {
        modelPath = `/${modelPath}`;
      }
    }
    
    // Make sure it's a full URL for GLTFLoader (needs protocol and host for CORS)
    // In development, use window.location.origin
    const fullPath = modelPath.startsWith('http') 
      ? modelPath 
      : `${window.location.origin}${modelPath}`;
    
    console.log(`Loading 3D model for product ${productId}:`);
    console.log(`  Original path: ${glbPath}`);
    console.log(`  Normalized path: ${modelPath}`);
    console.log(`  Full URL: ${fullPath}`);
    
    loader.load(
      fullPath,
      (gltf) => {
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 2) {
          const scale = 2 / maxDim;
          model.scale.multiplyScalar(scale);
        }

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
        console.error(`Attempted full URL: ${fullPath}`);
        console.error(`Normalized path: ${modelPath}`);
        console.error(`Original glbPath: ${glbPath}`);
        
        // Try to get more details about the error
        if (error.message && error.message.includes('<!doctype')) {
          console.error('Got HTML response instead of GLB file - path is likely incorrect');
        }
        
        if (container) {
          container.innerHTML =
            '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 14px;">3D Preview Unavailable</div>';
        }
      }
    );

    return () => {
      if (container && renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [productId, glbPath]);

  return <div ref={containerRef} id={`product-preview-${productId}`} />;
};

export default ProductPreview3D;

