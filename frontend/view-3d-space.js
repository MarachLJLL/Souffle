import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// View 3D Space page functionality
document.addEventListener('DOMContentLoaded', () => {
    const productsSelection = document.getElementById('productsSelection');
    const view3DBtn = document.getElementById('view3DBtn');
    let selectedProducts = new Set();
    const loader = new GLTFLoader();
    
    // Load products - only show 4 example products with 3D models
    function loadProducts() {
        return [
            { id: 1, name: "Chair", modelPath: '../assets/models/Chair.glb' },
            { id: 2, name: "Chair Sagano", modelPath: '../assets/models/chair_sagano.glb' },
            { id: 3, name: "Brown Leather Chair", modelPath: '../assets/models/brown_leather_chair.glb' },
            { id: 4, name: "Model 2", modelPath: '../assets/models/2.glb' }
        ];
    }
    
    // Render products with 3D model previews
    function renderProducts() {
        const products = loadProducts();
        productsSelection.innerHTML = '';
        
        if (products.length === 0) {
            productsSelection.innerHTML = '<p class="no-products">No products available</p>';
            return;
        }
        
        const productsGrid = document.createElement('div');
        productsGrid.className = 'products-selection-grid';
        
        products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-selection-item';
            
            // Create 3D viewer container
            const modelViewer = document.createElement('div');
            modelViewer.className = 'product-3d-viewer';
            modelViewer.id = `model-viewer-${product.id}`;
            
            const label = document.createElement('label');
            label.htmlFor = `product-${product.id}`;
            label.className = 'product-selection-label';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'product-selection-name';
            nameSpan.textContent = product.name;
            
            label.appendChild(nameSpan);
            
            // Create checkbox container for bottom left positioning
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'checkbox-container-bottom';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `product-${product.id}`;
            checkbox.className = 'product-checkbox';
            checkbox.value = product.id;
            checkbox.addEventListener('change', handleProductToggle);
            checkboxContainer.appendChild(checkbox);
            
            productItem.appendChild(modelViewer);
            productItem.appendChild(label);
            productItem.appendChild(checkboxContainer);
            
            // Make entire item clickable - clicking anywhere toggles checkbox
            productItem.addEventListener('click', (e) => {
                // Stop event propagation if clicking directly on checkbox to avoid double toggle
                if (e.target === checkbox) {
                    return; // Let the checkbox handle its own change event
                }
                
                // Toggle checkbox when clicking anywhere else on the item
                e.preventDefault();
                e.stopPropagation();
                checkbox.checked = !checkbox.checked;
                handleProductToggle({ target: checkbox });
            });
            
            productsGrid.appendChild(productItem);
        });
        
        productsSelection.appendChild(productsGrid);
        
        // Load models after grid is added to DOM
        setTimeout(() => {
            products.forEach(product => {
                const containerId = `model-viewer-${product.id}`;
                loadModelPreview(product.modelPath, containerId);
            });
        }, 200);
    }
    
    // Load and render 3D model preview
    function loadModelPreview(modelPath, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }
        
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        
        // Force container to have dimensions
        const width = Math.max(container.offsetWidth, container.clientWidth, 200);
        const height = Math.max(container.offsetHeight, container.clientHeight, 200);
        
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Clear container and add renderer
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 5, 5);
        directionalLight1.castShadow = true;
        scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-5, 5, -5);
        scene.add(directionalLight2);
        
        // Point light for better illumination
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 5, 5);
        scene.add(pointLight);
        
        let model = null;
        
        // Load model
        loader.load(
            modelPath,
            (gltf) => {
                model = gltf.scene.clone();
                
                // Enable shadows
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            child.material.needsUpdate = true;
                        }
                    }
                });
                
                // Calculate bounding box and center model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                // Center the model at origin
                model.position.x = -center.x;
                model.position.y = -center.y;
                model.position.z = -center.z;
                
                // Scale to fit nicely in view
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2.5 / maxDim;
                model.scale.setScalar(scale);
                
                scene.add(model);
                
                // Position camera to view the centered model
                camera.position.set(0, 0, 5);
                camera.lookAt(0, 0, 0);
                camera.updateProjectionMatrix();
                
                // Ensure model is visible by adjusting camera if needed
                const newBox = new THREE.Box3().setFromObject(model);
                const newSize = newBox.getSize(new THREE.Vector3());
                const distance = Math.max(newSize.x, newSize.y, newSize.z) * 2;
                camera.position.set(0, 0, distance);
                camera.lookAt(0, 0, 0);
                camera.updateProjectionMatrix();
                
                // Initial render
                renderer.render(scene, camera);
            },
            (progress) => {
                // Loading progress
                if (progress.lengthComputable) {
                    console.log(`Loading ${modelPath}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
                }
            },
            (error) => {
                console.error('Error loading model:', error);
                container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Failed to load model</p>';
            }
        );
        
        // Auto-rotate animation
        let rotationSpeed = 0.005;
        function animate() {
            requestAnimationFrame(animate);
            if (model) {
                model.rotation.y += rotationSpeed;
            }
            renderer.render(scene, camera);
        }
        animate();
        
        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            const newWidth = Math.max(container.offsetWidth, container.clientWidth, 200);
            const newHeight = Math.max(container.offsetHeight, container.clientHeight, 200);
            if (newWidth > 0 && newHeight > 0) {
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(newWidth, newHeight);
            }
        });
        resizeObserver.observe(container);
    }
    
    // Handle product selection toggle
    function handleProductToggle(event) {
        const productId = parseInt(event.target.value);
        
        if (event.target.checked) {
            selectedProducts.add(productId);
        } else {
            selectedProducts.delete(productId);
        }
        
        updateViewButton();
    }
    
    // Update view button state
    function updateViewButton() {
        const hasSelection = selectedProducts.size > 0;
        view3DBtn.disabled = !hasSelection;
        
        if (hasSelection) {
            view3DBtn.classList.add('enabled');
        } else {
            view3DBtn.classList.remove('enabled');
        }
    }
    
    // Handle view 3D space button click
    view3DBtn.addEventListener('click', () => {
        if (selectedProducts.size > 0) {
            // Store selected products for the 3D viewer
            const selectedProductsArray = Array.from(selectedProducts);
            localStorage.setItem('souffle_selected_products', JSON.stringify(selectedProductsArray));
            
            // Navigate to 3D viewer (you can create this page later)
            alert(`Viewing ${selectedProducts.size} product(s) in 3D space!`);
            // window.location.href = '3d-viewer.html'; // Uncomment when you create the 3D viewer page
        }
    });
    
    // Initialize
    renderProducts();
    updateViewButton();
});
