import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Initialize 3D preview for a product card on the marketplace
export function initProductPreview(productId, glbPath) {
    const container = document.getElementById(`product-preview-${productId}`);
    if (!container) {
        console.warn(`Product preview container not found for product ${productId}`);
        return;
    }

    // Set container dimensions
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.minHeight = '300px';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);

    // Create camera
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.3, 5);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffffff, 0.5);
    rimLight.position.set(0, 0, -5);
    scene.add(rimLight);

    // Setup controls (limited interaction for preview)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // Disable zoom for preview
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 8;
    controls.autoRotate = true; // Auto-rotate for preview
    controls.autoRotateSpeed = 1.0;

    // Load model
    const loader = new GLTFLoader();
    
    loader.load(
        glbPath,
        (gltf) => {
            const model = gltf.scene;

            // Calculate bounding box to center and scale the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Center the model
            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;

            // Scale to fit
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.5 / maxDim;
            model.scale.multiplyScalar(scale);

            // Enable shadows
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(model);

            // Adjust camera
            const distance = Math.max(size.x, size.y, size.z) * 2;
            camera.position.set(0, 0.3, distance);
            controls.target.set(0, 0.2, 0);
            controls.update();
        },
        (progress) => {
            // Loading progress (optional)
            if (progress.lengthComputable) {
                const percentComplete = (progress.loaded / progress.total) * 100;
                // console.log(`Loading ${productId}: ${percentComplete.toFixed(0)}%`);
            }
        },
        (error) => {
            console.error(`Error loading 3D model for product ${productId}:`, error);
            // Show placeholder or hide container
            container.style.display = 'none';
        }
    );

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        
        if (newWidth > 0 && newHeight > 0) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        }
    });
    resizeObserver.observe(container);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        if (controls) {
            controls.update();
        }
        
        renderer.render(scene, camera);
    }
    
    animate();

    // Cleanup function (optional, for when product is removed)
    return () => {
        resizeObserver.disconnect();
        renderer.dispose();
        if (container && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
    };
}

