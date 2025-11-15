import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Product3DViewer {
    constructor() {
        this.container = document.getElementById('product3DViewer');
        if (!this.container) return;
        
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        
        // Get product ID to determine which model to load
        this.productId = this.getProductIdFromURL();
        this.modelPath = null;
        
        this.init();
    }
    
    getProductIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return parseInt(params.get('id')) || 2;
    }
    
    async getModelPath(productId) {
        // Try to load from database first
        try {
            const response = await fetch('../database/products.json');
            if (response.ok) {
                const products = await response.json();
                const product = products.find(p => p.id === productId);
                if (product && product.glb) {
                    return `../database/${product.glb}`;
                }
            }
        } catch (error) {
            console.error('Error loading product from database:', error);
        }
        
        // Fallback to default models
        const modelMap = {
            1: '../assets/models/Chair.glb',
            2: '../assets/models/Chair.glb',
            3: '../assets/models/chair_sagano.glb',
            4: '../assets/models/brown_leather_chair.glb',
            5: '../assets/models/gamingchair.glb'
        };
        
        return modelMap[productId] || '../assets/models/Chair.glb';
    }
    
    async init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
        this.setupControls();
        this.modelPath = await this.getModelPath(this.productId);
        this.loadModel();
        this.animate();
        
        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0xf5f5f5, 1);
        
        this.container.appendChild(this.renderer.domElement);
    }
    
    setupCamera() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(
            45,
            width / height,
            0.1,
            1000
        );
        this.camera.position.set(0, 0.3, 5);
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);
        
        // Rim light
        const rimLight = new THREE.PointLight(0xffffff, 0.5);
        rimLight.position.set(0, 0, -5);
        this.scene.add(rimLight);
    }
    
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 10;
        this.controls.autoRotate = false;
    }
    
    loadModel() {
        const loader = new GLTFLoader();
        
        loader.load(
            this.modelPath,
            (gltf) => {
                this.model = gltf.scene;
                
                // Calculate bounding box to center and scale the model
                const box = new THREE.Box3().setFromObject(this.model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                // Center the model
                this.model.position.x = -center.x;
                this.model.position.y = -center.y;
                this.model.position.z = -center.z;
                
                // Scale to fit if needed (make it bigger)
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 2) {
                    const scale = 2.4 / maxDim; // Increased from 2 to 2.4 for bigger size
                    this.model.scale.multiplyScalar(scale);
                } else {
                    // If model is already small, make it bigger
                    this.model.scale.multiplyScalar(1.2);
                }
                
                // Enable shadows
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                this.scene.add(this.model);
                
                // Adjust camera to view the model (raise it slightly)
                const distance = Math.max(size.x, size.y, size.z) * 2;
                this.camera.position.set(0, 0.3, distance);
                this.controls.target.set(0, 0.2, 0); // Raise the target point
                this.controls.update();
            },
            (progress) => {
                // Loading progress
                console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading model:', error);
                // Fallback: show a placeholder
                this.showPlaceholder();
            }
        );
    }
    
    showPlaceholder() {
        // Create a simple placeholder geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const placeholder = new THREE.Mesh(geometry, material);
        this.scene.add(placeholder);
    }
    
    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Product3DViewer();
});

