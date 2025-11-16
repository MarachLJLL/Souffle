import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const Carousel3D = () => {
  const containerRef = useRef(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const carousel = {
      scene: new THREE.Scene(),
      camera: null,
      renderer: null,
      models: [],
      isAnimating: false,
      autoSwipeInterval: null,
      autoSwipeCount: 0,
      initialAutoSwipes: 3,
      userHasInteracted: false,
      centerGroup: null,
      currentIndex: 0,
      targetIndex: 0,
      rotationSpeed: { x: 0, y: 0 },
      autoSpinSpeed: 0.002, // Reduced from 0.005 for slower auto-spin
      originalModelFiles: [
        '/database/glbs/1.glb',
        '/database/glbs/2.glb',
        '/database/glbs/3.glb',
        '/database/glbs/4.glb',
      ],
      modelFiles: [],
      mouseDown: false,
      mouseDownX: undefined,
      mouseDownY: undefined,
      radius: 12,
      visibleCount: 3,
    };

    carouselRef.current = carousel;

    // Duplicate models many times for seamless circular carousel
    const duplicates = 20;
    for (let i = 0; i < duplicates; i++) {
      carousel.modelFiles.push(...carousel.originalModelFiles);
    }

    const totalModels = carousel.modelFiles.length;
    const middleIndex = Math.floor(totalModels / 2);
    carousel.currentIndex = middleIndex;
    carousel.targetIndex = middleIndex;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const containerHeight = container.clientHeight || 400;
    renderer.setSize(window.innerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    carousel.renderer = renderer;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / containerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 15);
    carousel.camera = camera;

    // Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    carousel.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    carousel.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 3, -5);
    carousel.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffffff, 0.5);
    rimLight.position.set(0, 0, -5);
    carousel.scene.add(rimLight);

    // Setup center group
    // The centerGroup is positioned at the origin and only rotates
    // Items in the centerGroup should have position (0, y, 0) relative to the group
    carousel.centerGroup = new THREE.Group();
    carousel.centerGroup.position.set(0, 0, 0); // Center group at origin
    carousel.scene.add(carousel.centerGroup);

    // Load models
    const loader = new GLTFLoader();
    const uniqueFiles = [...new Set(carousel.originalModelFiles)];
    const loadedModels = {};
    let uniqueLoadedCount = 0;
    let loadedCount = 0;

    uniqueFiles.forEach((file) => {
      loader.load(
        file,
        (gltf) => {
          const originalModel = gltf.scene;
          originalModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.needsUpdate = true;
              }
            }
          });

          const box = new THREE.Box3().setFromObject(originalModel);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const baseScale = 4.5 / maxDim;
          originalModel.scale.setScalar(baseScale);
          originalModel.userData.baseScale = baseScale;
          originalModel.userData.yOffset = -center.y * baseScale;

          loadedModels[file] = originalModel;
          uniqueLoadedCount++;

          carousel.modelFiles.forEach((modelFile, index) => {
            if (modelFile === file) {
              const clonedModel = originalModel.clone();
              clonedModel.traverse((child) => {
                if (child.isMesh) {
                  if (child.material) {
                    if (Array.isArray(child.material)) {
                      child.material = child.material.map((mat) => mat.clone());
                    } else {
                      child.material = child.material.clone();
                    }
                  }
                }
              });
              clonedModel.userData.baseScale = baseScale;
              clonedModel.userData.yOffset = -center.y * baseScale;
              clonedModel.userData.index = index;
              carousel.models[index] = clonedModel;
              loadedCount++;
            }
          });

          if (
            uniqueLoadedCount === uniqueFiles.length &&
            loadedCount === carousel.modelFiles.length
          ) {
            carousel.models.forEach((m, idx) => {
              positionModel(carousel, m, idx);
              if (m.parent !== carousel.centerGroup) {
                carousel.scene.add(m);
              }
            });
            createIndicators(carousel);
            startInitialAutoSwipes(carousel);
          }
        },
        undefined,
        (error) => {
          console.error('Error loading model:', error);
          console.error('Failed to load:', file);
          // If all models fail to load, the carousel won't appear
          // This helps debug path issues
        }
      );
    });

    // Calculate relative index with proper wrapping
    function getRelativeIndex(index, centerIndex, totalLength) {
      let relative = index - centerIndex;
      // Normalize to [-totalLength/2, totalLength/2)
      if (relative > totalLength / 2) {
        relative -= totalLength;
      } else if (relative < -totalLength / 2) {
        relative += totalLength;
      }
      return relative;
    }

    function positionModel(carousel, model, index, interpolatedCenter = null) {
      const centerScale = 1.4;
      const sideScale = 0.85;
      const radius = carousel.radius;
      const visibleCount = carousel.visibleCount;
      const totalLength = carousel.modelFiles.length;
      
      // Use interpolated center if provided (during animation), otherwise use currentIndex
      const centerIndex = interpolatedCenter !== null ? interpolatedCenter : carousel.currentIndex;
      const relativeIndex = getRelativeIndex(index, centerIndex, totalLength);
      
      // Calculate angle for circular positioning
      const angleStep = Math.PI / 4; // 45 degrees between items
      const angle = relativeIndex * angleStep;
      
      // Calculate position on circle
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius - radius; // Offset so center is at front
      const y = model.userData.yOffset || 0;
      
      // Determine scale based on position
      const distanceFromCenter = Math.abs(relativeIndex);
      let scale;
      if (distanceFromCenter === 0) {
        scale = centerScale;
      } else if (distanceFromCenter <= visibleCount / 2) {
        const scaleFactor = 1 - (distanceFromCenter / (visibleCount / 2)) * 0.3;
        scale = centerScale * scaleFactor;
      } else {
        scale = sideScale * 0.5;
      }
      
      // Center group membership - check BEFORE setting position
      // This ensures the position is set in the correct coordinate space
      const isCenter = Math.abs(relativeIndex) < 0.5;
      
      // If moving to center, add to centerGroup first
      // If moving from center, remove from centerGroup first
      if (isCenter) {
        if (model.parent !== carousel.centerGroup) {
          carousel.scene.remove(model);
          carousel.centerGroup.add(model);
          // Reset position relative to centerGroup (which is at origin)
          model.position.set(0, y, 0);
        } else {
          // Already in centerGroup, just update y position
          model.position.set(0, y, 0);
        }
      } else {
        if (model.parent === carousel.centerGroup) {
          // Moving from center to side - remove from group first
          carousel.centerGroup.remove(model);
          carousel.scene.add(model);
        }
        // Set position in scene coordinates
        model.position.set(x, y, z);
      }
      
      // Set scale
      model.scale.setScalar((model.userData.baseScale || 1) * scale);
      
      // Visibility
      const isVisible = Math.abs(relativeIndex) <= visibleCount / 2;
      model.visible = isVisible;
      
      // Set opacity
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.transparent = true;
          if (isVisible) {
            child.material.opacity = 1;
            child.visible = true;
          } else {
            child.material.opacity = 0;
            child.visible = false;
          }
        }
      });
    }

    function createIndicators(carousel) {
      const indicatorsContainer = document.getElementById('carouselIndicators');
      if (!indicatorsContainer) return;

      indicatorsContainer.innerHTML = '';
      carousel.originalModelFiles.forEach((_, index) => {
        const indicator = document.createElement('div');
        indicator.className = 'carousel-indicator';
        const currentOriginalIndex = carousel.currentIndex % carousel.originalModelFiles.length;
        if (index === currentOriginalIndex) {
          indicator.classList.add('active');
        }
        indicator.addEventListener('click', () => {
          goToOriginalIndex(carousel, index);
        });
        indicatorsContainer.appendChild(indicator);
      });
    }

    function goToOriginalIndex(carousel, targetOriginalIndex) {
      if (carousel.isAnimating) return;
      stopInitialAutoSwipes(carousel);
      carousel.userHasInteracted = true;
      
      const totalLength = carousel.modelFiles.length;
      const currentOriginalIndex = carousel.currentIndex % carousel.originalModelFiles.length;
      
      // Find the closest instance of the target model
      let bestIndex = carousel.currentIndex;
      let minDistance = Infinity;
      
      for (let i = 0; i < totalLength; i++) {
        if (i % carousel.originalModelFiles.length === targetOriginalIndex) {
          const distance = Math.min(
            Math.abs(i - carousel.currentIndex),
            totalLength - Math.abs(i - carousel.currentIndex)
          );
          if (distance < minDistance) {
            minDistance = distance;
            bestIndex = i;
          }
        }
      }
      
      // Determine direction (prefer forward if equal distance)
      let delta = bestIndex - carousel.currentIndex;
      if (delta > totalLength / 2) {
        delta -= totalLength;
      } else if (delta < -totalLength / 2) {
        delta += totalLength;
      }
      
      carousel.targetIndex = bestIndex;
      carousel.isAnimating = true;
      updateCarousel(carousel, delta);
    }

    function next(carousel) {
      if (carousel.isAnimating) return;
      stopInitialAutoSwipes(carousel);
      const totalLength = carousel.modelFiles.length;
      carousel.targetIndex = (carousel.currentIndex + 1) % totalLength;
      carousel.isAnimating = true;
      updateCarousel(carousel, 1); // Always move forward by 1
    }

    function prev(carousel) {
      if (carousel.isAnimating) return;
      stopInitialAutoSwipes(carousel);
      const totalLength = carousel.modelFiles.length;
      carousel.targetIndex = (carousel.currentIndex - 1 + totalLength) % totalLength;
      carousel.isAnimating = true;
      updateCarousel(carousel, -1); // Always move backward by 1
    }

    function updateCarousel(carousel, delta) {
      if (!carousel.isAnimating && carousel.currentIndex === carousel.targetIndex) {
        return;
      }

      const startIndex = carousel.currentIndex;
      const endIndex = carousel.targetIndex;
      const startTime = Date.now();
      const duration = 1200; // Increased from 800 to 1200 for slower transition

      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeInOutCubic = (t) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const easedProgress = easeInOutCubic(progress);
        
        // Interpolate center index using the delta direction
        // This ensures we always move in the correct visual direction
        const interpolatedCenter = startIndex + delta * easedProgress;
        
        // Update all models based on interpolated center
        carousel.models.forEach((model, index) => {
          positionModel(carousel, model, index, interpolatedCenter);
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animation complete
          carousel.currentIndex = endIndex;
          carousel.isAnimating = false;

          // Final positioning
          carousel.models.forEach((m, idx) => {
            positionModel(carousel, m, idx);
          });
          createIndicators(carousel);
        }
      }

      animate();
    }

    function startInitialAutoSwipes(carousel) {
      if (carousel.userHasInteracted || carousel.autoSwipeInterval) return;
      
      carousel.autoSwipeCount = 0;
      const swipeDelay = 4000; // Increased from 2500 to 4000 for longer delay between auto swipes
      
      const performSwipe = () => {
        if (carousel.userHasInteracted) {
          stopInitialAutoSwipes(carousel);
          return;
        }
        
        if (carousel.autoSwipeCount < carousel.initialAutoSwipes && !carousel.isAnimating) {
          next(carousel);
          carousel.autoSwipeCount++;
          
          if (carousel.autoSwipeCount < carousel.initialAutoSwipes) {
            carousel.autoSwipeInterval = setTimeout(performSwipe, swipeDelay);
          } else {
            stopInitialAutoSwipes(carousel);
          }
        }
      };
      
      carousel.autoSwipeInterval = setTimeout(performSwipe, 1000);
    }

    function stopInitialAutoSwipes(carousel) {
      if (carousel.autoSwipeInterval) {
        clearTimeout(carousel.autoSwipeInterval);
        carousel.autoSwipeInterval = null;
      }
    }

    // Mouse controls for center model rotation
    function setupControls(carousel) {
      const onMouseDown = (e) => {
        carousel.mouseDown = true;
        carousel.mouseDownX = e.clientX;
        carousel.mouseDownY = e.clientY;
        stopInitialAutoSwipes(carousel);
        carousel.userHasInteracted = true;
      };

      const onMouseMove = (e) => {
        if (!carousel.mouseDown) return;
        const deltaX = e.clientX - carousel.mouseDownX;
        carousel.rotationSpeed.y = deltaX * 0.001; // Reduced from 0.003 to 0.001 for less sensitivity
      };

      const onMouseUp = () => {
        carousel.mouseDown = false;
      };

      renderer.domElement.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mouseleave', onMouseUp);

      // Keyboard controls
      const onKeyDown = (e) => {
        if (e.key === 'ArrowRight') {
          stopInitialAutoSwipes(carousel);
          next(carousel);
        } else if (e.key === 'ArrowLeft') {
          stopInitialAutoSwipes(carousel);
          prev(carousel);
        }
      };
      window.addEventListener('keydown', onKeyDown);

      // Touch controls
      let touchStartX = 0;
      const onTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
        stopInitialAutoSwipes(carousel);
        carousel.userHasInteracted = true;
      };

      const onTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;
        if (Math.abs(deltaX) > 50) {
          if (deltaX > 0) {
            prev(carousel);
          } else {
            next(carousel);
          }
        }
      };

      renderer.domElement.addEventListener('touchstart', onTouchStart);
      renderer.domElement.addEventListener('touchend', onTouchEnd);

      // Click detection for side models
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onCanvasClick = (e) => {
        if (carousel.mouseDownX !== undefined && carousel.mouseDownY !== undefined) {
          const deltaX = Math.abs(e.clientX - carousel.mouseDownX);
          const deltaY = Math.abs(e.clientY - carousel.mouseDownY);
          if (deltaX > 5 || deltaY > 5) {
            return;
          }
        }
        
        stopInitialAutoSwipes(carousel);
        carousel.userHasInteracted = true;
        
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(carousel.scene.children, true);

        if (intersects.length > 0) {
          const clickedObject = intersects[0].object;
          let clickedModel = clickedObject;
          while (clickedModel.parent && clickedModel.parent !== carousel.scene) {
            clickedModel = clickedModel.parent;
          }

          const modelIndex = carousel.models.findIndex((m) => m === clickedModel);
          if (modelIndex !== -1) {
            const relativeIndex = getRelativeIndex(modelIndex, carousel.currentIndex, carousel.modelFiles.length);
            if (relativeIndex < 0) {
              prev(carousel);
            } else if (relativeIndex > 0) {
              next(carousel);
            }
          }
        }
      };

      renderer.domElement.addEventListener('click', onCanvasClick);

      return () => {
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mouseleave', onMouseUp);
        window.removeEventListener('keydown', onKeyDown);
        renderer.domElement.removeEventListener('touchstart', onTouchStart);
        renderer.domElement.removeEventListener('touchend', onTouchEnd);
        renderer.domElement.removeEventListener('click', onCanvasClick);
      };
    }

    setupControls(carousel);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Rotate center group
      if (carousel.centerGroup && carousel.rotationSpeed && carousel.rotationSpeed.y !== 0) {
        carousel.centerGroup.rotation.y += carousel.rotationSpeed.y;
        carousel.rotationSpeed.y *= 0.92;
        if (Math.abs(carousel.rotationSpeed.y) < 0.0005) {
          carousel.rotationSpeed.y = 0;
        }
      }
      
      // Auto-spin center item slowly if user isn't rotating it
      if (carousel.centerGroup && !carousel.mouseDown && carousel.rotationSpeed.y === 0) {
        carousel.centerGroup.rotation.y += carousel.autoSpinSpeed || 0.002;
      }

      renderer.render(carousel.scene, camera);
    }

    animate();

    // Handle resize
    const handleResize = () => {
      const newHeight = container.clientHeight || 400;
      camera.aspect = window.innerWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      stopInitialAutoSwipes(carousel);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <section className="carousel-section">
      <div className="carousel-container" ref={containerRef} id="carousel3D" />
      <div className="carousel-controls">
        <div className="carousel-indicators" id="carouselIndicators" />
      </div>
    </section>
  );
};

export default Carousel3D;