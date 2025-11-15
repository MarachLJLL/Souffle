import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Initialize 3D preview for a product
export function initProductPreview(productId, glbPath) {
    const container = document.getElementById(`product-preview-${productId}`);
    if (!container) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    // Set container to have proper dimensions
    container.style.width = '100%';
    container.style.minHeight = '380px';
    container.style.position = 'relative';
    container.style.background = '#f5f5f5';
    
    // Get dimensions from parent or use defaults
    const getDimensions = () => {
        const parentWidth = container.parentElement?.clientWidth || container.offsetWidth || 300;
        const aspectRatio = 1; // Square aspect ratio
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
    
    // Make canvas responsive
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0, 5);
    
    // Load model
    const loader = new GLTFLoader();
    loader.load(glbPath, (gltf) => {
        const model = gltf.scene;
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
        
        // Store model reference for hover rotation
        let isHovering = false;
        let targetRotation = 0;
        let currentRotation = 0;
        
        // Find parent product item for hover detection
        const productItem = container.closest('.product-item');
        const hoverTarget = productItem || container;
        
        // Hover rotation effect
        hoverTarget.addEventListener('mouseenter', () => {
            isHovering = true;
        });
        
        hoverTarget.addEventListener('mouseleave', () => {
            isHovering = false;
        });
        
        // Animation loop - only rotate on hover
        function animate() {
            requestAnimationFrame(animate);
            
            if (isHovering) {
                targetRotation += 0.02;
            }
            
            // Smooth rotation interpolation
            currentRotation += (targetRotation - currentRotation) * 0.1;
            model.rotation.y = currentRotation;
            
            renderer.render(scene, camera);
        }
        animate();
        
        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            const newWidth = container.clientWidth || container.parentElement?.clientWidth || 300;
            if (newWidth > 0) {
                const newHeight = newWidth * aspectRatio;
                container.style.height = `${newHeight}px`;
                camera.aspect = aspectRatio;
                camera.updateProjectionMatrix();
                renderer.setSize(newWidth, newHeight);
            }
        });
        resizeObserver.observe(container);
    }, undefined, (error) => {
        console.warn('3D preview not available for product:', productId, error.message);
        // Show a placeholder or hide the container gracefully
        if (container) {
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 14px;">3D Preview Unavailable</div>';
        }
    });
}

