import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Carousel3D {
    constructor() {
        this.container = document.getElementById('carousel3D');
        
        // Check if container exists
        if (!this.container) {
            console.error('Carousel3D: Container element with id "carousel3D" not found!');
            return;
        }
        
        console.log('Carousel3D: Container found, initializing...');
        
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.models = [];
        this.isAnimating = false;
        this.autoRotateEnabled = true;
        this.autoRotateInterval = null;
        this.userHasInteracted = false;
        
        // Original model files
        this.originalModelFiles = [
            '../assets/models/Chair.glb',
            '../assets/models/chair_sagano.glb',
            '../assets/models/brown_leather_chair.glb',
            '../assets/models/2.glb'
        ];
        
        // Duplicate models 10 times for continuous rotation (ensures plenty of models on both sides)
        this.modelFiles = [];
        const duplicates = 10;
        for (let i = 0; i < duplicates; i++) {
            this.modelFiles.push(...this.originalModelFiles);
        }
        
        // Set initial index to middle of the duplicated array
        const totalModels = this.modelFiles.length;
        const middleIndex = Math.floor(totalModels / 2);
        this.currentIndex = middleIndex;
        this.targetIndex = middleIndex;
        
        console.log(`Carousel initialized: ${totalModels} models (${this.originalModelFiles.length} unique × ${duplicates} copies), starting at index ${middleIndex}`);
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('Carousel3D: Cannot initialize - container not found');
            return;
        }
        
        // Setup scene
        this.setupRenderer();
        if (!this.renderer) {
            console.error('Carousel3D: Renderer setup failed');
            return;
        }
        
        this.setupCamera();
        this.setupLights();
        this.setupControls(); // Setup centerGroup first
        this.loadModels();
        this.startAnimation();
        
        // Keyboard support
        this.setupKeyboardControls();
        
        // Touch/swipe support
        this.setupTouchControls();
        
        // Click detection for models
        this.setupModelClickDetection();
        
        // Auto-rotation will start after models are loaded
    }
    
    setupRenderer() {
        if (!this.container) {
            console.error('Carousel3D: Cannot setup renderer - container not found');
            return;
        }
        
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        
        const containerHeight = this.container.clientHeight || 400; // Fallback height
        this.renderer.setSize(window.innerWidth, containerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, this.container.clientHeight);
        });
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 8);
        // Store initial position for later use
        if (!this.initialCameraPosition) {
            this.initialCameraPosition = this.camera.position.clone();
        }
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
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
    
    loadModels() {
        const loader = new GLTFLoader();
        let loadedCount = 0;
        
        // Initialize models array with correct length
        this.models = new Array(this.modelFiles.length);
        
        // First, load all unique models
        const uniqueFiles = [...new Set(this.originalModelFiles)];
        const loadedModels = {};
        let uniqueLoadedCount = 0;
        
        uniqueFiles.forEach((file) => {
            console.log(`Carousel3D: Attempting to load model: ${file}`);
            loader.load(
                file,
                (gltf) => {
                    console.log(`Carousel3D: Successfully loaded model: ${file}`);
                    const originalModel = gltf.scene;
                    
                    // Enable shadows on original
                    originalModel.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Improve material rendering
                            if (child.material) {
                                child.material.needsUpdate = true;
                            }
                        }
                    });
                    
                    // Center and scale model - make all similarly sized
                    const box = new THREE.Box3().setFromObject(originalModel);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const baseScale = 3.0 / maxDim; // Bigger base scale for more prominent models
                    originalModel.scale.setScalar(baseScale);
                    
                    // Store the base scale and Y offset on original
                    originalModel.userData.baseScale = baseScale;
                    originalModel.userData.yOffset = -center.y * baseScale;
                    
                    // Cache the original model
                    loadedModels[file] = originalModel;
                    uniqueLoadedCount++;
                    
                    // Now create all instances of this model for the duplicated array
                    this.modelFiles.forEach((modelFile, index) => {
                        if (modelFile === file) {
                            // Clone the model for this instance
                            const clonedModel = originalModel.clone();
                            
                            // Deep clone materials to avoid sharing
                            clonedModel.traverse((child) => {
                                if (child.isMesh) {
                                    if (child.material) {
                                        if (Array.isArray(child.material)) {
                                            child.material = child.material.map(mat => mat.clone());
                                        } else {
                                            child.material = child.material.clone();
                                        }
                                    }
                                }
                            });
                            
                            clonedModel.userData.baseScale = baseScale;
                            clonedModel.userData.yOffset = -center.y * baseScale;
                            clonedModel.userData.index = index;
                            
                            this.models[index] = clonedModel;
                            loadedCount++;
                        }
                    });
                    
                    // Check if all unique models are loaded and all instances created
                    if (uniqueLoadedCount === uniqueFiles.length && loadedCount === this.modelFiles.length) {
                        // Ensure we're at the middle index
                        const middleIndex = Math.floor(this.modelFiles.length / 2);
                        this.currentIndex = middleIndex;
                        this.targetIndex = middleIndex;
                        
                        // Position all models after loading (using the middle index)
                        this.models.forEach((m, idx) => {
                            this.positionModel(m, idx);
                            if (m.parent !== this.centerGroup) {
                                this.scene.add(m);
                            }
                        });
                        this.createIndicators();
                        
                        console.log(`Models loaded and positioned. Starting at index ${this.currentIndex} (middle of ${this.modelFiles.length} models)`);
                        
                        // Start auto-rotation after models are loaded
                        this.startAutoRotate();
                    }
                },
                (progress) => {
                    // Loading progress
                    console.log(`Loading ${file}: ${(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    console.error(`Carousel3D: Error loading model "${file}":`, error);
                    console.error(`Carousel3D: Full error details:`, {
                        message: error.message,
                        url: file,
                        stack: error.stack
                    });
                    
                    // Check if it's a CORS issue
                    if (error.message && error.message.includes('CORS')) {
                        console.error('Carousel3D: CORS error detected! You need to serve the files via HTTP/HTTPS, not file:// protocol.');
                        console.error('Carousel3D: Try running: python3 -m http.server 8000 (from the frontend directory)');
                    }
                }
            );
        });
    }
    
    setupControls() {
        // Create center group for rotating only the center model
        this.centerGroup = new THREE.Group();
        this.scene.add(this.centerGroup);
        
        // Store initial camera position
        this.initialCameraPosition = this.camera.position.clone();
        
        // Auto-rotation settings
        this.autoRotationSpeed = 0.003; // Slow rotation speed (radians per frame)
        this.autoRotationEnabled = true;
        this.userInteractionTimeout = null;
        this.resumeAutoRotationDelay = 2000; // Resume auto-rotation after 2 seconds of no interaction
        
        // Track mouse for manual rotation
        let isDragging = false;
        let lastMouseX = 0;
        let rotationSpeed = 0;
        let mouseDownX = 0;
        let mouseDownY = 0;
        let hasUserInteracted = false; // Track if user has manually rotated
        
        const stopAutoRotation = () => {
            this.autoRotationEnabled = false;
            hasUserInteracted = true;
            
            // Clear any existing timeout
            if (this.userInteractionTimeout) {
                clearTimeout(this.userInteractionTimeout);
                this.userInteractionTimeout = null;
            }
        };
        
        const resumeAutoRotation = () => {
            // Clear any existing timeout
            if (this.userInteractionTimeout) {
                clearTimeout(this.userInteractionTimeout);
            }
            
            // Resume auto-rotation after delay
            this.userInteractionTimeout = setTimeout(() => {
                this.autoRotationEnabled = true;
                hasUserInteracted = false;
                rotationSpeed = 0; // Reset manual rotation speed
            }, this.resumeAutoRotationDelay);
        };
        
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            mouseDownX = e.clientX;
            mouseDownY = e.clientY;
            
            if (!this.isAnimating && this.centerGroup.children.length > 0) {
                isDragging = true;
                lastMouseX = e.clientX;
                this.renderer.domElement.style.cursor = 'grabbing';
                stopAutoRotation();
            }
        });
        
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (isDragging && !this.isAnimating && this.centerGroup.children.length > 0) {
                const deltaX = e.clientX - lastMouseX;
                rotationSpeed = deltaX * 0.01; // Rotation sensitivity
                this.centerGroup.rotation.y += rotationSpeed;
                lastMouseX = e.clientX;
                stopAutoRotation(); // Keep auto-rotation disabled while dragging
            }
        });
        
        this.renderer.domElement.addEventListener('mouseup', (e) => {
            // Check if this was a click (not a drag)
            const deltaX = Math.abs(e.clientX - mouseDownX);
            const deltaY = Math.abs(e.clientY - mouseDownY);
            const isClick = deltaX < 5 && deltaY < 5; // Small movement threshold
            
            if (isClick && !this.isAnimating) {
                // Handle model click
                this.handleModelClick(e);
            }
            
            isDragging = false;
            this.renderer.domElement.style.cursor = 'grab';
            
            // Resume auto-rotation after user stops interacting
            if (hasUserInteracted) {
                resumeAutoRotation();
            }
        });
        
        this.renderer.domElement.addEventListener('mouseleave', () => {
            isDragging = false;
            this.renderer.domElement.style.cursor = 'grab';
            
            // Resume auto-rotation when mouse leaves
            if (hasUserInteracted) {
                resumeAutoRotation();
            }
        });
        
        // Disable default drag behavior
        this.renderer.domElement.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
        
        // Auto-rotation and momentum/damping loop
        setInterval(() => {
            if (!this.isAnimating && this.centerGroup.children.length > 0) {
                if (this.autoRotationEnabled && !isDragging && !hasUserInteracted) {
                    // Auto-rotate when idle
                    this.centerGroup.rotation.y += this.autoRotationSpeed;
                } else if (hasUserInteracted && !isDragging && Math.abs(rotationSpeed) > 0.001) {
                    // Apply momentum/damping when user stops dragging
                    rotationSpeed *= 0.95; // Damping
                    this.centerGroup.rotation.y += rotationSpeed;
                }
            }
        }, 16);
    }
    
    setupModelClickDetection() {
        // Raycaster for detecting clicks on models
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }
    
    handleModelClick(event) {
        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update raycaster with camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Find all visible models (only check the 3 visible ones)
        const visibleModels = [];
        this.models.forEach((model, index) => {
            const relativeIndex = (index - this.currentIndex + this.models.length) % this.models.length;
            const isVisible = relativeIndex === 0 || relativeIndex === 1 || relativeIndex === this.models.length - 1;
            
            if (isVisible) {
                // Collect all meshes from this model
                model.traverse((child) => {
                    if (child.isMesh && child.visible) {
                        visibleModels.push({
                            mesh: child,
                            modelIndex: index,
                            relativeIndex: relativeIndex
                        });
                    }
                });
            }
        });
        
        // Intersect with visible models
        const intersects = this.raycaster.intersectObjects(
            visibleModels.map(item => item.mesh),
            true
        );
        
        if (intersects.length > 0) {
            // Find which model was clicked
            const clickedMesh = intersects[0].object;
            const clickedItem = visibleModels.find(item => {
                // Check if the clicked mesh belongs to this model
                let found = false;
                this.models[item.modelIndex].traverse((child) => {
                    if (child === clickedMesh) {
                        found = true;
                    }
                });
                return found;
            });
            
            if (clickedItem) {
                const relativeIndex = clickedItem.relativeIndex;
                
                // Navigate based on which model was clicked
                if (relativeIndex === 1) {
                    // Right model clicked - go to next
                    this.stopAutoRotate(); // Stop auto-rotation on click
                    this.next();
                } else if (relativeIndex === this.models.length - 1) {
                    // Left model clicked - go to previous
                    this.stopAutoRotate(); // Stop auto-rotation on click
                    this.prev();
                }
                // Center model (relativeIndex === 0) - do nothing, just rotate
            }
        }
    }
    
    positionModel(model, index) {
        const sideOffset = 5; // Distance from center for side models (increased for traditional carousel)
        const frontOffset = 0; // Keep side models at same depth as center
        const sideScale = 0.75; // Scale for side models (more visible difference)
        const centerScale = 1.2; // Center model slightly bigger
        const offScreenOffset = 15; // Off-screen position
        
        const isCenter = index === this.currentIndex;
        const relativeIndex = (index - this.currentIndex + this.models.length) % this.models.length;
        
        // Only show 3 items: center (0), right (1), left (models.length - 1)
        const isVisible = relativeIndex === 0 || relativeIndex === 1 || relativeIndex === this.models.length - 1;
        
        if (isCenter) {
            // Center model at origin, slightly bigger
            model.position.set(0, model.userData.yOffset, 0);
            model.scale.setScalar(model.userData.baseScale * centerScale);
            
            // Add to center group for rotation
            this.centerGroup.add(model);
        } else if (relativeIndex === 1) {
            // Right side - further to the right
            model.position.set(sideOffset, model.userData.yOffset, frontOffset);
            model.scale.setScalar(model.userData.baseScale * sideScale);
            
            // Ensure side models are NOT in center group (so they don't rotate)
            if (model.parent === this.centerGroup) {
                this.centerGroup.remove(model);
                this.scene.add(model);
            }
            
            // Reset rotation for side models (they shouldn't rotate)
            model.rotation.set(0, 0, 0);
        } else if (relativeIndex === this.models.length - 1) {
            // Left side - further to the left
            model.position.set(-sideOffset, model.userData.yOffset, frontOffset);
            model.scale.setScalar(model.userData.baseScale * sideScale);
            
            // Ensure side models are NOT in center group (so they don't rotate)
            if (model.parent === this.centerGroup) {
                this.centerGroup.remove(model);
                this.scene.add(model);
            }
            
            // Reset rotation for side models (they shouldn't rotate)
            model.rotation.set(0, 0, 0);
        } else {
            // Off-screen - position off-screen
            const offX = relativeIndex > 1 ? offScreenOffset : -offScreenOffset;
            model.position.set(offX, model.userData.yOffset, frontOffset);
            model.scale.setScalar(model.userData.baseScale * sideScale);
            
            // Ensure off-screen models are NOT in center group
            if (model.parent === this.centerGroup) {
                this.centerGroup.remove(model);
                this.scene.add(model);
            }
            
            model.rotation.set(0, 0, 0);
        }
        
        // Set visibility - only show the 3 visible items
        model.traverse((child) => {
            if (child.isMesh) {
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.transparent = true;
                            mat.opacity = isVisible ? 1 : 0;
                        });
                    } else {
                        child.material.transparent = true;
                        child.material.opacity = isVisible ? 1 : 0;
                    }
                }
                child.visible = isVisible;
            }
        });
    }
    
    setupTouchControls() {
        let touchStartX = 0;
        let touchEndX = 0;
        
        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            this.stopAutoRotate(); // Stop auto-rotation on touch
        });
        
        this.container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;
            if (Math.abs(swipeDistance) > 50) {
                this.stopAutoRotate(); // Stop auto-rotation on swipe
                if (swipeDistance > 0) {
                    this.prev();
                } else {
                    this.next();
                }
            }
        });
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                this.stopAutoRotate(); // Stop auto-rotation on keyboard interaction
                if (e.key === 'ArrowRight') {
                    this.next();
                } else {
                    this.prev();
                }
            }
        });
    }
    
    next() {
        if (this.isAnimating) return;
        this.stopAutoRotate(); // Stop auto-rotation on user interaction
        this.targetIndex = (this.currentIndex + 1) % this.models.length;
        this.updateCarousel();
    }
    
    prev() {
        if (this.isAnimating) return;
        this.stopAutoRotate(); // Stop auto-rotation on user interaction
        this.targetIndex = (this.currentIndex - 1 + this.models.length) % this.models.length;
        this.updateCarousel();
    }
    
    startAutoRotate() {
        if (!this.autoRotateEnabled || this.userHasInteracted) return;
        
        // Auto-rotate every 3 seconds
        this.autoRotateInterval = setInterval(() => {
            if (!this.isAnimating && this.autoRotateEnabled && !this.userHasInteracted) {
                this.targetIndex = (this.currentIndex + 1) % this.models.length;
                this.updateCarousel();
            }
        }, 3000);
    }
    
    stopAutoRotate() {
        if (this.autoRotateInterval) {
            clearInterval(this.autoRotateInterval);
            this.autoRotateInterval = null;
        }
        this.autoRotateEnabled = false;
        this.userHasInteracted = true;
    }
    
    goToIndex(index) {
        if (this.isAnimating || index === this.currentIndex) return;
        this.stopAutoRotate(); // Stop auto-rotation on indicator click
        this.targetIndex = index;
        this.updateCarousel();
    }
    
    updateCarousel() {
        if (this.isAnimating || this.models.length === 0) return;
        
        this.isAnimating = true;
        const startIndex = this.currentIndex;
        const endIndex = this.targetIndex;
        
        // Calculate direction
        let direction;
        if (endIndex > startIndex) {
            direction = 1; // Moving right (next)
        } else if (endIndex < startIndex) {
            direction = -1; // Moving left (prev)
        } else {
            return; // Same index, no animation needed
        }
        
        // Update indicators (based on original model index)
        const targetOriginalIndex = this.targetIndex % this.originalModelFiles.length;
        document.querySelectorAll('.carousel-indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === targetOriginalIndex);
        });
        
        const sideOffset = 5;
        const sideScale = 0.75;
        const centerScale = 1.2;
        const offScreenOffset = 20; // Far off-screen
        
        // Simple approach: Only animate the 3 visible items, others stay hidden
        const startPositions = [];
        const startScales = [];
        const endPositions = [];
        const endScales = [];
        const shouldShow = []; // Whether item should be visible during animation
        
        this.models.forEach((model, index) => {
            const baseScale = model.userData.baseScale;
            const yOffset = model.userData.yOffset;
            
            // Get relative positions
            const startRelIdx = (index - startIndex + this.models.length) % this.models.length;
            const endRelIdx = (index - endIndex + this.models.length) % this.models.length;
            
            // Determine start position
            let startX, startScaleVal;
            if (startRelIdx === 0) {
                startX = 0;
                startScaleVal = baseScale * centerScale;
            } else if (startRelIdx === 1) {
                startX = sideOffset;
                startScaleVal = baseScale * sideScale;
            } else if (startRelIdx === this.models.length - 1) {
                startX = -sideOffset;
                startScaleVal = baseScale * sideScale;
            } else {
                startX = startRelIdx > 1 ? offScreenOffset : -offScreenOffset;
                startScaleVal = baseScale * sideScale;
            }
            
            // Determine end position
            let endX, endScaleVal;
            if (endRelIdx === 0) {
                endX = 0;
                endScaleVal = baseScale * centerScale;
            } else if (endRelIdx === 1) {
                endX = sideOffset;
                endScaleVal = baseScale * sideScale;
            } else if (endRelIdx === this.models.length - 1) {
                endX = -sideOffset;
                endScaleVal = baseScale * sideScale;
            } else {
                endX = endRelIdx > 1 ? offScreenOffset : -offScreenOffset;
                endScaleVal = baseScale * sideScale;
            }
            
            // Simple visibility logic: only 3 items are visible at any time
            // center (0), right (1), left (models.length - 1)
            const isCurrentlyVisible = startRelIdx === 0 || startRelIdx === 1 || startRelIdx === this.models.length - 1;
            const willBeVisible = endRelIdx === 0 || endRelIdx === 1 || endRelIdx === this.models.length - 1;
            const isExiting = isCurrentlyVisible && !willBeVisible;
            const isEntering = !isCurrentlyVisible && willBeVisible;
            const isStayingVisible = isCurrentlyVisible && willBeVisible;
            
            // For exiting items: instantly position off-screen (invisible from start)
            if (isExiting) {
                if (direction === 1) {
                    // Exiting right - position off-screen right immediately (invisible)
                    startX = offScreenOffset;
                } else {
                    // Exiting left - position off-screen left immediately (invisible)
                    startX = -offScreenOffset;
                }
            }
            
            // For entering items: start them very close to final position (almost there)
            // This prevents glitching - they appear almost at final position
            if (isEntering) {
                // Start at 95% of the way to final position (very close)
                // If endX is -5 (left), start at -4.75
                // If endX is 5 (right), start at 4.75
                // If endX is 0 (center), start at 0 (already there)
                if (endX !== 0) {
                    startX = endX * 0.95; // 95% of the way there
                } else {
                    // If entering center, start slightly offset
                    startX = direction === 1 ? -0.25 : 0.25;
                }
            }
            
            startPositions.push(new THREE.Vector3(startX, yOffset, 0));
            startScales.push(startScaleVal);
            endPositions.push(new THREE.Vector3(endX, yOffset, 0));
            endScales.push(endScaleVal);
            shouldShow.push({ 
                show: isStayingVisible || isEntering, 
                isExiting, 
                isEntering, 
                wasVisible: isCurrentlyVisible, 
                willBeVisible 
            });
        });
        
        // Animate models
        const duration = 800; // milliseconds
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out-cubic)
            const ease = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            // Animate each model to its target position
            this.models.forEach((model, index) => {
                const startPos = startPositions[index];
                const endPos = endPositions[index];
                const startScale = startScales[index];
                const endScale = endScales[index];
                const visInfo = shouldShow[index];
                
                // Calculate opacity - simple logic
                let opacity = 0;
                
                if (visInfo.isExiting) {
                    // Exiting items: invisible immediately (don't show moving through back)
                    opacity = 0;
                } else if (visInfo.isEntering) {
                    // Entering items: fade in quickly from the start since they're already close
                    // They're positioned 90% there, so fade in over the whole animation
                    opacity = ease; // Smooth fade in
                } else if (visInfo.show && visInfo.wasVisible && visInfo.willBeVisible) {
                    // Staying visible: always visible
                    opacity = 1;
                } else {
                    // Off-screen: invisible
                    opacity = 0;
                }
                
                // Always animate position (items move invisibly if needed)
                model.position.lerpVectors(startPos, endPos, ease);
                
                // Interpolate scale
                const currentScale = startScale + (endScale - startScale) * ease;
                model.scale.setScalar(currentScale);
                
                // Set visibility/opacity
                model.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.transparent = true;
                                    mat.opacity = opacity;
                                });
                            } else {
                                child.material.transparent = true;
                                child.material.opacity = opacity;
                            }
                        }
                        child.visible = opacity > 0.01;
                    }
                });
                
                // Handle center group membership - only center model should rotate
                const willBeCenter = index === endIndex;
                const isCurrentlyCenter = model.parent === this.centerGroup;
                
                if (progress > 0.5) {
                    // After halfway, switch group membership
                    if (willBeCenter && !isCurrentlyCenter) {
                        this.scene.remove(model);
                        this.centerGroup.add(model);
                        // Reset rotation when moving to center
                        model.rotation.set(0, 0, 0);
                    } else if (!willBeCenter && isCurrentlyCenter) {
                        this.centerGroup.remove(model);
                        this.scene.add(model);
                        // Reset rotation when moving away from center
                        model.rotation.set(0, 0, 0);
                    }
                }
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.currentIndex = this.targetIndex;
                this.isAnimating = false;
                
                // Ensure final positions and group membership
                this.models.forEach((model, index) => {
                    const finalEndPos = endPositions[index];
                    const finalEndScale = endScales[index];
                    const visInfo = shouldShow[index];
                    const finalVisible = visInfo.willBeVisible;
                    
                    // Final position
                    model.position.copy(finalEndPos);
                    model.scale.setScalar(finalEndScale);
                    
                    // Set final visibility - only show the 3 visible items
                    const finalOpacity = finalVisible ? 1 : 0;
                    model.traverse((child) => {
                        if (child.isMesh) {
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => {
                                        mat.transparent = true;
                                        mat.opacity = finalOpacity;
                                    });
                                } else {
                                    child.material.transparent = true;
                                    child.material.opacity = finalOpacity;
                                }
                            }
                            child.visible = finalOpacity > 0.01;
                        }
                    });
                    
                    const isCenter = index === this.currentIndex;
                    if (isCenter && model.parent !== this.centerGroup) {
                        this.scene.remove(model);
                        this.centerGroup.add(model);
                        // Reset rotation for new center model
                        model.rotation.set(0, 0, 0);
                        // Reset center group rotation
                        this.centerGroup.rotation.set(0, 0, 0);
                    } else if (!isCenter && model.parent === this.centerGroup) {
                        this.centerGroup.remove(model);
                        this.scene.add(model);
                        // Reset rotation for side models
                        model.rotation.set(0, 0, 0);
                    }
                });
            }
        };
        
        animate();
    }
    
    updateIndexFromRotation() {
        // Update index based on camera rotation (for orbit controls)
        // This allows dragging to change the carousel
    }
    
    createIndicators() {
        const indicatorsContainer = document.getElementById('carouselIndicators');
        indicatorsContainer.innerHTML = '';
        
        // Only show indicators for original models, not duplicates
        this.originalModelFiles.forEach((_, index) => {
            const indicator = document.createElement('div');
            // Calculate which original model we're currently viewing
            const currentOriginalIndex = this.currentIndex % this.originalModelFiles.length;
            indicator.className = `carousel-indicator ${index === currentOriginalIndex ? 'active' : ''}`;
            // Calculate the target index in the duplicated array (go to first occurrence of this original model)
            indicator.addEventListener('click', () => {
                // Find the closest occurrence of this original model to current position
                const targetOriginalIndex = index;
                let targetIndex = this.currentIndex;
                
                // Find the nearest occurrence of this model
                const currentOriginal = this.currentIndex % this.originalModelFiles.length;
                let minDistance = Infinity;
                let bestIndex = this.currentIndex;
                
                for (let i = 0; i < this.modelFiles.length; i++) {
                    if (i % this.originalModelFiles.length === targetOriginalIndex) {
                        const distance = Math.min(
                            Math.abs(i - this.currentIndex),
                            Math.abs(i - this.currentIndex + this.modelFiles.length),
                            Math.abs(i - this.currentIndex - this.modelFiles.length)
                        );
                        if (distance < minDistance) {
                            minDistance = distance;
                            bestIndex = i;
                        }
                    }
                }
                
                this.goToIndex(bestIndex);
            });
            indicatorsContainer.appendChild(indicator);
        });
    }
    
    startAnimation() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            // Update controls - center model rotation is handled in setupControls
            if (this.controls) {
                // Keep camera position fixed
                if (this.initialCameraPosition) {
                    this.camera.position.copy(this.initialCameraPosition);
                }
            }
            
            // Render
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        
        animate();
    }
}

// Initialize carousel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Carousel3D();
    });
} else {
    new Carousel3D();
}

