import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Carousel3D {
    constructor() {
        this.container = document.getElementById('carousel3D');
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.models = [];
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.isAnimating = false;
        
        // Model files
        this.modelFiles = [
            '../assets/models/Chair.glb',
            '../assets/models/chair_sagano.glb',
            '../assets/models/brown_leather_chair.glb',
            '../assets/models/gamingchair.glb'
        ];
        
        this.init();
    }
    
    init() {
        // Setup scene
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
        this.setupControls(); // Setup centerGroup first
        this.loadModels();
        this.startAnimation();
        
        // Event listeners
        document.getElementById('nextBtn').addEventListener('click', () => this.next());
        document.getElementById('prevBtn').addEventListener('click', () => this.prev());
        
        // Keyboard support
        this.setupKeyboardControls();
        
        // Touch/swipe support
        this.setupTouchControls();
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, this.container.clientHeight);
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
        
        this.modelFiles.forEach((file, index) => {
            loader.load(
                file,
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Enable shadows
                    model.traverse((child) => {
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
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const baseScale = 3.0 / maxDim; // Bigger base scale for more prominent models
                    model.scale.setScalar(baseScale);
                    
                    // Store the base scale and Y offset
                    model.userData.baseScale = baseScale;
                    model.userData.yOffset = -center.y * baseScale;
                    model.userData.index = index;
                    
                    this.models.push(model);
                    
                    loadedCount++;
                    if (loadedCount === this.modelFiles.length) {
                        // Position all models after loading
                        this.models.forEach((m, idx) => {
                            this.positionModel(m, idx);
                            if (m.parent !== this.centerGroup) {
                                this.scene.add(m);
                            }
                        });
                        this.createIndicators();
                    }
                },
                (progress) => {
                    // Loading progress
                    console.log(`Loading ${file}: ${(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    console.error('Error loading model:', error);
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
        
        // Track mouse for manual rotation
        let isDragging = false;
        let lastMouseX = 0;
        let rotationSpeed = 0;
        
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (!this.isAnimating && this.centerGroup.children.length > 0) {
                isDragging = true;
                lastMouseX = e.clientX;
                this.renderer.domElement.style.cursor = 'grabbing';
            }
        });
        
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (isDragging && !this.isAnimating && this.centerGroup.children.length > 0) {
                const deltaX = e.clientX - lastMouseX;
                rotationSpeed = deltaX * 0.01; // Rotation sensitivity
                this.centerGroup.rotation.y += rotationSpeed;
                lastMouseX = e.clientX;
            }
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
            this.renderer.domElement.style.cursor = 'grab';
        });
        
        this.renderer.domElement.addEventListener('mouseleave', () => {
            isDragging = false;
            this.renderer.domElement.style.cursor = 'grab';
        });
        
        // Disable default drag behavior
        this.renderer.domElement.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
        
        // Add momentum/damping
        setInterval(() => {
            if (!isDragging && !this.isAnimating && Math.abs(rotationSpeed) > 0.001) {
                rotationSpeed *= 0.95; // Damping
                if (this.centerGroup.children.length > 0) {
                    this.centerGroup.rotation.y += rotationSpeed;
                }
            }
        }, 16);
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
        });
        
        this.container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;
            if (Math.abs(swipeDistance) > 50) {
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
        this.targetIndex = (this.currentIndex + 1) % this.models.length;
        this.updateCarousel();
    }
    
    prev() {
        if (this.isAnimating) return;
        this.targetIndex = (this.currentIndex - 1 + this.models.length) % this.models.length;
        this.updateCarousel();
    }
    
    goToIndex(index) {
        if (this.isAnimating || index === this.currentIndex) return;
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
        
        // Update indicators
        document.querySelectorAll('.carousel-indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.targetIndex);
        });
        
        const sideOffset = 5; // Distance from center for side models
        const frontOffset = 0; // Keep at same depth
        const sideScale = 0.75; // Scale for side models
        const centerScale = 1.2; // Center model bigger
        const offScreenOffset = 15; // Off-screen position (hidden)
        
        // Calculate start and end positions based on array rotation logic
        const startPositions = [];
        const startScales = [];
        const endPositions = [];
        const endScales = [];
        const isWrapping = []; // Track which items are teleporting
        const startVisible = []; // Track visibility at start
        const endVisible = []; // Track visibility at end
        
        this.models.forEach((model, index) => {
            const baseScale = model.userData.baseScale;
            const yOffset = model.userData.yOffset;
            
            // Calculate relative position from start index
            const startRelativeIndex = (index - startIndex + this.models.length) % this.models.length;
            let startX, startScale;
            
            if (startRelativeIndex === 0) {
                // Center
                startX = 0;
                startScale = baseScale * centerScale;
            } else if (startRelativeIndex === 1) {
                // Right side
                startX = sideOffset;
                startScale = baseScale * sideScale;
            } else if (startRelativeIndex === this.models.length - 1) {
                // Left side
                startX = -sideOffset;
                startScale = baseScale * sideScale;
            } else {
                // Off-screen
                startX = startRelativeIndex > 1 ? offScreenOffset : -offScreenOffset;
                startScale = baseScale * sideScale;
            }
            
            startPositions.push(new THREE.Vector3(startX, yOffset, frontOffset));
            startScales.push(startScale);
            
            // Calculate relative position from end index
            const endRelativeIndex = (index - endIndex + this.models.length) % this.models.length;
            let endX, endScale, wrapping = false;
            
            if (endRelativeIndex === 0) {
                // Center
                endX = 0;
                endScale = baseScale * centerScale;
            } else if (endRelativeIndex === 1) {
                // Right side
                endX = sideOffset;
                endScale = baseScale * sideScale;
            } else if (endRelativeIndex === this.models.length - 1) {
                // Left side
                endX = -sideOffset;
                endScale = baseScale * sideScale;
            } else {
                // Off-screen
                endX = endRelativeIndex > 1 ? offScreenOffset : -offScreenOffset;
                endScale = baseScale * sideScale;
            }
            
            // Only show 3 items: center (0), right (1), left (models.length - 1)
            // All others should be hidden (off-screen and invisible)
            const wasVisible = startRelativeIndex === 0 || startRelativeIndex === 1 || startRelativeIndex === this.models.length - 1;
            const willBeVisible = endRelativeIndex === 0 || endRelativeIndex === 1 || endRelativeIndex === this.models.length - 1;
            
            // Check if this item is wrapping (teleporting from one side to the other)
            // For smooth simultaneous movement, items should start from their current visible position
            // and exit/enter smoothly without teleporting
            if (wasVisible && !willBeVisible) {
                // Item is exiting - keep it at its current visible position, it will animate off
                // Don't teleport it, let it animate smoothly off-screen
                wrapping = false; // Not wrapping, just exiting smoothly
            } else if (!wasVisible && willBeVisible) {
                // Item is entering - start it off-screen on the entry side
                if (direction === 1) {
                    // Entering from left - start off-screen left
                    startPositions[index].x = -offScreenOffset;
                } else {
                    // Entering from right - start off-screen right
                    startPositions[index].x = offScreenOffset;
                }
                wrapping = false; // It's entering, not wrapping
            }
            
            // Store visibility state - items that are visible should start visible
            // Items entering should start invisible and fade in
            // Items exiting should start visible and fade out
            const startVis = wasVisible; // If it was visible, it starts visible
            const endVis = willBeVisible;
            
            endPositions.push(new THREE.Vector3(endX, yOffset, frontOffset));
            endScales.push(endScale);
            isWrapping.push(wrapping);
            startVisible.push(startVis);
            endVisible.push(endVis);
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
                const wrapping = isWrapping[index];
                const startVis = startVisible[index];
                const endVis = endVisible[index];
                
                // Calculate current visibility - all items animate smoothly
                let opacity = 0;
                if (startVis && endVis) {
                    // Item stays visible - always visible
                    opacity = 1;
                } else if (startVis && !endVis) {
                    // Item is exiting - fade out smoothly
                    opacity = 1 - ease;
                } else if (!startVis && endVis) {
                    // Item is entering - fade in smoothly
                    opacity = ease;
                } else {
                    // Item stays hidden
                    opacity = 0;
                }
                
                // All items animate smoothly - no teleporting
                // This ensures simultaneous movement: exiting items move out while entering items move in
                model.position.lerpVectors(startPos, endPos, ease);
                
                // Interpolate scale
                const currentScale = startScale + (endScale - startScale) * ease;
                model.scale.setScalar(currentScale);
                
                // Set visibility/opacity for all meshes
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
                        // Also set visible property
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
                    const finalVisible = endVisible[index];
                    
                    // Final position - all items should be at their target positions
                    model.position.copy(finalEndPos);
                    model.scale.setScalar(finalEndScale);
                    
                    // Set final visibility - only show the 3 visible items
                    model.traverse((child) => {
                        if (child.isMesh) {
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => {
                                        mat.transparent = true;
                                        mat.opacity = finalVisible ? 1 : 0;
                                    });
                                } else {
                                    child.material.transparent = true;
                                    child.material.opacity = finalVisible ? 1 : 0;
                                }
                            }
                            child.visible = finalVisible;
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
        
        this.modelFiles.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
            indicator.addEventListener('click', () => this.goToIndex(index));
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

