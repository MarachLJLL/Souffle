import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
      autoRotateEnabled: true,
      autoRotateInterval: null,
      userHasInteracted: false,
      centerGroup: null,
      currentIndex: 0,
      targetIndex: 0,
      originalModelFiles: [
        '/assets/models/Chair.glb',
        '/assets/models/chair_sagano.glb',
        '/assets/models/brown_leather_chair.glb',
        '/assets/models/2.glb',
      ],
      modelFiles: [],
      rotationSpeed: { x: 0, y: 0 },
      mouseDown: false,
      mouseDownX: 0,
      mouseDownY: 0,
    };

    carouselRef.current = carousel;

    // Duplicate models
    const duplicates = 10;
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
    carousel.centerGroup = new THREE.Group();
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
          const baseScale = 3.0 / maxDim;
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
            startAutoRotate(carousel);
          }
        },
        undefined,
        (error) => {
          console.error('Error loading model:', error);
        }
      );
    });

    function positionModel(carousel, model, index) {
      const centerScale = 1.2;
      const sideScale = 0.75;
      const sideOffset = 5;
      const offScreenOffset = 15;
      const centerIndex = carousel.currentIndex;

      if (index === centerIndex) {
        model.position.set(0, model.userData.yOffset || 0, 0);
        model.scale.setScalar(
          (model.userData.baseScale || 1) * centerScale
        );
        model.visible = true;
        if (model.parent !== carousel.centerGroup) {
          carousel.scene.remove(model);
          carousel.centerGroup.add(model);
        }
        model.traverse((child) => {
          if (child.isMesh) {
            child.material.transparent = true;
            child.material.opacity = 1;
            child.visible = true;
          }
        });
      } else if (index === centerIndex - 1) {
        model.position.set(-sideOffset, model.userData.yOffset || 0, 0);
        model.scale.setScalar(
          (model.userData.baseScale || 1) * sideScale
        );
        model.visible = true;
        if (model.parent === carousel.centerGroup) {
          carousel.centerGroup.remove(model);
          carousel.scene.add(model);
        }
        model.rotation.set(0, 0, 0);
        model.traverse((child) => {
          if (child.isMesh) {
            child.material.transparent = true;
            child.material.opacity = 1;
            child.visible = true;
          }
        });
      } else if (index === centerIndex + 1) {
        model.position.set(sideOffset, model.userData.yOffset || 0, 0);
        model.scale.setScalar(
          (model.userData.baseScale || 1) * sideScale
        );
        model.visible = true;
        if (model.parent === carousel.centerGroup) {
          carousel.centerGroup.remove(model);
          carousel.scene.add(model);
        }
        model.rotation.set(0, 0, 0);
        model.traverse((child) => {
          if (child.isMesh) {
            child.material.transparent = true;
            child.material.opacity = 1;
            child.visible = true;
          }
        });
      } else {
        model.position.set(
          index < centerIndex ? -offScreenOffset : offScreenOffset,
          model.userData.yOffset || 0,
          0
        );
        model.visible = false;
        model.traverse((child) => {
          if (child.isMesh) {
            child.material.transparent = true;
            child.material.opacity = 0;
            child.visible = false;
          }
        });
      }
    }

    function createIndicators(carousel) {
      const indicatorsContainer = document.getElementById('carouselIndicators');
      if (!indicatorsContainer) return;

      indicatorsContainer.innerHTML = '';
      carousel.originalModelFiles.forEach((_, index) => {
        const indicator = document.createElement('div');
        indicator.className = 'carousel-indicator';
        if (index === carousel.currentIndex % carousel.originalModelFiles.length) {
          indicator.classList.add('active');
        }
        indicator.addEventListener('click', () => {
          goToIndex(carousel, index);
        });
        indicatorsContainer.appendChild(indicator);
      });
    }

    function goToIndex(carousel, targetIndex) {
      if (carousel.isAnimating) return;
      stopAutoRotate(carousel);
      carousel.targetIndex = targetIndex;
      carousel.isAnimating = true;
      updateCarousel(carousel);
    }

    function next(carousel) {
      if (carousel.isAnimating) return;
      stopAutoRotate(carousel);
      carousel.targetIndex = (carousel.currentIndex + 1) % carousel.modelFiles.length;
      carousel.isAnimating = true;
      updateCarousel(carousel);
    }

    function prev(carousel) {
      if (carousel.isAnimating) return;
      stopAutoRotate(carousel);
      carousel.targetIndex =
        (carousel.currentIndex - 1 + carousel.modelFiles.length) %
        carousel.modelFiles.length;
      carousel.isAnimating = true;
      updateCarousel(carousel);
    }

    function updateCarousel(carousel) {
      if (!carousel.isAnimating && carousel.currentIndex === carousel.targetIndex)
        return;

      const startIndex = carousel.currentIndex;
      const endIndex = carousel.targetIndex;
      const startTime = Date.now();
      const duration = 800;

      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeInOutCubic = (t) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const easedProgress = easeInOutCubic(progress);

        carousel.models.forEach((model, index) => {
          const centerScale = 1.2;
          const sideScale = 0.75;
          const sideOffset = 5;
          const offScreenOffset = 15;

          let startX, endX, startScale, endScale;
          let isExiting = false;
          let isEntering = false;
          let isStayingVisible = false;

          if (index === startIndex) {
            startX = 0;
            endX = endIndex > startIndex ? -offScreenOffset : offScreenOffset;
            startScale = centerScale;
            endScale = sideScale;
            isExiting = true;
          } else if (index === startIndex - 1) {
            startX = -sideOffset;
            endX = startIndex === endIndex + 1 ? 0 : -offScreenOffset;
            startScale = sideScale;
            endScale = index === endIndex ? centerScale : sideScale;
            isExiting = index !== endIndex;
          } else if (index === startIndex + 1) {
            startX = sideOffset;
            endX = startIndex === endIndex - 1 ? 0 : offScreenOffset;
            startScale = sideScale;
            endScale = index === endIndex ? centerScale : sideScale;
            isExiting = index !== endIndex;
          } else if (index === endIndex) {
            startX = endIndex < startIndex ? -offScreenOffset : offScreenOffset;
            endX = 0;
            startScale = sideScale;
            endScale = centerScale;
            isEntering = true;
          } else if (index === endIndex - 1) {
            startX = index < startIndex ? -offScreenOffset : -sideOffset;
            endX = -sideOffset;
            startScale = sideScale;
            endScale = sideScale;
            isEntering = index === startIndex - 1;
          } else if (index === endIndex + 1) {
            startX = index > startIndex ? offScreenOffset : sideOffset;
            endX = sideOffset;
            startScale = sideScale;
            endScale = sideScale;
            isEntering = index === startIndex + 1;
          } else {
            const currentCenter = Math.floor(
              startIndex + (endIndex - startIndex) * easedProgress
            );
            if (
              index === currentCenter - 1 ||
              index === currentCenter ||
              index === currentCenter + 1
            ) {
              isStayingVisible = true;
            }
            startX = model.position.x;
            endX = index < endIndex ? -offScreenOffset : offScreenOffset;
            startScale = sideScale;
            endScale = sideScale;
          }

          if (isExiting) {
            model.position.x = endX;
            model.visible = false;
            model.traverse((child) => {
              if (child.isMesh) {
                child.material.opacity = 0;
                child.visible = false;
              }
            });
          } else if (isEntering) {
            const fadeStart = 0.8;
            const opacity = progress > fadeStart ? (progress - fadeStart) / (1 - fadeStart) : 0;
            model.position.x = startX + (endX - startX) * easedProgress;
            model.visible = opacity > 0;
            model.traverse((child) => {
              if (child.isMesh) {
                child.material.opacity = opacity;
                child.visible = opacity > 0;
              }
            });
          } else if (isStayingVisible) {
            model.position.x = startX + (endX - startX) * easedProgress;
            model.visible = true;
            model.traverse((child) => {
              if (child.isMesh) {
                child.material.opacity = 1;
                child.visible = true;
              }
            });
          } else {
            model.visible = false;
            model.traverse((child) => {
              if (child.isMesh) {
                child.material.opacity = 0;
                child.visible = false;
              }
            });
          }

          const scale = startScale + (endScale - startScale) * easedProgress;
          model.scale.setScalar((model.userData.baseScale || 1) * scale);

          if (index === endIndex && progress > 0.5) {
            if (model.parent !== carousel.centerGroup) {
              carousel.scene.remove(model);
              carousel.centerGroup.add(model);
              model.rotation.set(0, 0, 0);
            }
          } else if (index !== endIndex && model.parent === carousel.centerGroup) {
            carousel.centerGroup.remove(model);
            carousel.scene.add(model);
            model.rotation.set(0, 0, 0);
          }
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          carousel.currentIndex = carousel.targetIndex;
          carousel.isAnimating = false;

          carousel.models.forEach((m, idx) => {
            positionModel(carousel, m, idx);
          });
          createIndicators(carousel);

          if (!carousel.userHasInteracted && carousel.autoRotateEnabled) {
            resumeAutoRotate(carousel);
          }
        }
      }

      animate();
    }

    function startAutoRotate(carousel) {
      if (carousel.autoRotateInterval) return;
      carousel.autoRotateInterval = setInterval(() => {
        if (!carousel.isAnimating && !carousel.userHasInteracted) {
          next(carousel);
        }
      }, 3000);
    }

    function stopAutoRotate(carousel) {
      if (carousel.autoRotateInterval) {
        clearInterval(carousel.autoRotateInterval);
        carousel.autoRotateInterval = null;
      }
    }

    function resumeAutoRotate(carousel) {
      stopAutoRotate(carousel);
      setTimeout(() => {
        if (!carousel.userHasInteracted) {
          startAutoRotate(carousel);
        }
      }, 2000);
    }

    // Mouse controls for center model rotation
    function setupControls(carousel) {
      const onMouseDown = (e) => {
        carousel.mouseDown = true;
        carousel.mouseDownX = e.clientX;
        carousel.mouseDownY = e.clientY;
        stopAutoRotate(carousel);
        carousel.userHasInteracted = true;
      };

      const onMouseMove = (e) => {
        if (!carousel.mouseDown) return;
        const deltaX = e.clientX - carousel.mouseDownX;
        carousel.rotationSpeed.y = deltaX * 0.01;
      };

      const onMouseUp = () => {
        carousel.mouseDown = false;
        resumeAutoRotate(carousel);
      };

      renderer.domElement.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mouseleave', onMouseUp);

      // Keyboard controls
      const onKeyDown = (e) => {
        if (e.key === 'ArrowRight') {
          next(carousel);
        } else if (e.key === 'ArrowLeft') {
          prev(carousel);
        }
      };
      window.addEventListener('keydown', onKeyDown);

      // Touch controls
      let touchStartX = 0;
      const onTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
        stopAutoRotate(carousel);
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
        resumeAutoRotate(carousel);
      };

      renderer.domElement.addEventListener('touchstart', onTouchStart);
      renderer.domElement.addEventListener('touchend', onTouchEnd);

      // Click detection for side models
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onCanvasClick = (e) => {
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
            if (modelIndex === carousel.currentIndex - 1) {
              prev(carousel);
            } else if (modelIndex === carousel.currentIndex + 1) {
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
      if (carousel.centerGroup && carousel.rotationSpeed.y !== 0) {
        carousel.centerGroup.rotation.y += carousel.rotationSpeed.y;
        carousel.rotationSpeed.y *= 0.95;
        if (Math.abs(carousel.rotationSpeed.y) < 0.001) {
          carousel.rotationSpeed.y = 0;
        }
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
      stopAutoRotate(carousel);
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

