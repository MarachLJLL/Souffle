import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductsContext';
import { useCart } from '../contexts/CartContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const Product = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getProductById } = useProducts();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedView, setSelectedView] = useState(0); // 0 = 3D model, 1+ = 2D images
  const containerRef = useRef(null);
  const imageContainerRef = useRef(null);
  const thumbnail3dRef = useRef(null);

  const productId = parseInt(searchParams.get('id')) || 2;

  useEffect(() => {
    const loadedProduct = getProductById(productId);
    if (loadedProduct) {
      setProduct(loadedProduct);
      setSelectedView(0); // Reset to 3D view when product changes
    } else {
      // Try loading from database (with cache-busting to get latest version)
      fetch(`/database/products.json?t=${Date.now()}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load products: ${res.status}`);
          }
          return res.json();
        })
        .then((products) => {
          const found = products.find((p) => p.id === productId);
          if (found) {
            // Format product with all necessary data from JSON
            const formattedProduct = {
              ...found,
              glb: `/database/${found.glb}`,
              image: found.image_paths?.[0] ? `/database/${found.image_paths[0]}` : null,
              images: found.image_paths ? found.image_paths.map(img => `/database/${img}`) : [],
              description: found.description || '',
              measurements: found.measurements || null,
            };
            setProduct(formattedProduct);
            setSelectedView(0); // Reset to 3D view when product changes
            console.log('Product loaded from JSON:', formattedProduct);
          } else {
            console.warn(`Product with ID ${productId} not found`);
          }
        })
        .catch((err) => {
          console.error('Error loading product:', err);
        });
    }
  }, [productId, getProductById]);

  // Initialize 3D viewer only when selectedView is 0 (3D model)
  useEffect(() => {
    if (!containerRef.current || !product || selectedView !== 0) return;

    const container = containerRef.current;
    // Clear previous content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    let scene, camera, renderer, controls, animationId;
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xE4E2E2, 1);
    container.appendChild(renderer.domElement);

    camera.position.set(0, 0.3, 5);

    // Maximum brightness - very high lighting for brightest models
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffffff, 1.0);
    rimLight.position.set(0, 0, -5);
    scene.add(rimLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;

    const loader = new GLTFLoader();
    // Add cache-busting query parameter to force browser to reload updated GLB files
    const basePath = product.glb || '/database/glbs/1.glb';
    const modelPath = `${basePath}?v=${Date.now()}`;

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 2 ? 2.4 / maxDim : 1.2;
        model.scale.multiplyScalar(scale);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);

        const distance = Math.max(size.x, size.y, size.z) * 2;
        camera.position.set(0, 0.3, distance);
        controls.target.set(0, 0.2, 0);
        controls.update();
      },
      undefined,
      (error) => console.error('Error loading model:', error)
    );

    function animate() {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (controls) {
        controls.dispose();
      }
      if (renderer) {
        if (container && renderer.domElement.parentNode) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
      if (scene) {
        scene.traverse((object) => {
          if (object.isMesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((mat) => mat.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [product, selectedView]);

  // Initialize 3D thumbnail viewer (autorotating)
  useEffect(() => {
    if (!thumbnail3dRef.current || !product) return;

    const container = thumbnail3dRef.current;
    // Clear previous content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    let scene, camera, renderer, model, animationId;
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    const width = 80;
    const height = 80;

    renderer.setSize(width, height);
    renderer.setPixelRatio(1); // Lower pixel ratio for thumbnail
    renderer.setClearColor(0x000000, 0); // Transparent background
    container.appendChild(renderer.domElement);

    camera.position.set(0, 0.3, 3);

    // Maximum brightness for thumbnail
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.6);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const loader = new GLTFLoader();
    // Add cache-busting query parameter to force browser to reload updated GLB files
    const basePath = product.glb || '/database/glbs/1.glb';
    const modelPath = `${basePath}?v=${Date.now()}`;

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

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 2 ? 2.5 / maxDim : 1.5;
        model.scale.multiplyScalar(scale);

        scene.add(model);

        const distance = Math.max(size.x, size.y, size.z) * 2.5;
        camera.position.set(0, 0.2, distance);
        camera.lookAt(0, 0, 0);
      },
      undefined,
      (error) => console.error('Error loading thumbnail model:', error)
    );

    let rotation = 0;
    function animate() {
      animationId = requestAnimationFrame(animate);
      rotation += 0.01; // Slow autorotation
      
      if (model) {
        model.rotation.y = rotation;
      }
      
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (renderer) {
        if (container && renderer.domElement.parentNode) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
      if (scene && model) {
        scene.remove(model);
        scene.traverse((object) => {
          if (object.isMesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((mat) => mat.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [product]);

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const totalViews = 1 + (product?.images?.length || 0);
        if (e.key === 'ArrowLeft') {
          setSelectedView((prev) => (prev - 1 + totalViews) % totalViews);
        } else {
          setSelectedView((prev) => (prev + 1) % totalViews);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [product]);

  const handleAddToCart = () => {
    if (!product) {
      console.warn('Cannot add to cart: product is null');
      return;
    }
    
    // Add product to cart with the selected quantity
    for (let i = 0; i < quantity; i++) {
      addToCart({
        ...product,
        // Ensure all required fields are present
        id: product.id,
        name: product.name,
        price: product.price || 0,
        description: product.description || '',
        image: product.image || product.images?.[0] || null,
        measurements: product.measurements || null,
      });
    }
    
    // Visual feedback
    const button = document.querySelector('.add-to-cart-btn');
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'ADDED TO CART';
      button.style.background = '#4CAF50';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 2000);
    }
    
    console.log(`Added ${quantity} ${product.name} to cart`);
  };

  const handleAddTo3DSpace = async () => {
    if (!product) {
      console.warn('Cannot add to 3D space: product is null');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/3dviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Failed to add to 3D viewer list:', result.error || response.status);
        alert('Failed to add to 3D viewer. Please try again.');
        return;
      }

      // Redirect to View 3D Space page after successful add
      navigate('/view-3d-space');
    } catch (err) {
      console.error('Error adding to 3D viewer:', err);
      alert('Failed to add to 3D viewer. Please try again.');
    }
  };

  if (!product) {
    return (
      <main className="product-main">
        <div className="container">Loading...</div>
      </main>
    );
  }

  return (
    <main className="product-main">
      <div className="product-container">
        <div className="product-gallery">
          <div className="gallery-main">
            {selectedView === 0 ? (
              <div className="gallery-3d-view" ref={containerRef} id="product3DViewer" />
            ) : (
              <div className="gallery-image-view" ref={imageContainerRef}>
                {product.images && product.images[selectedView - 1] && (
                  <img 
                    src={product.images[selectedView - 1]} 
                    alt={`${product.name} - View ${selectedView}`}
                    className="gallery-main-image"
                  />
                )}
              </div>
            )}
            
            {/* Navigation Arrows */}
            <div className="gallery-navigation">
              <button
                className="gallery-nav-btn gallery-nav-prev"
                onClick={() => {
                  const totalViews = 1 + (product.images?.length || 0);
                  setSelectedView((prev) => (prev - 1 + totalViews) % totalViews);
                }}
                aria-label="Previous image"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                className="gallery-nav-btn gallery-nav-next"
                onClick={() => {
                  const totalViews = 1 + (product.images?.length || 0);
                  setSelectedView((prev) => (prev + 1) % totalViews);
                }}
                aria-label="Next image"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Gallery Thumbnails */}
          <div className="gallery-thumbnails">
            {/* 3D Model Thumbnail */}
            <button
              className={`gallery-thumbnail ${selectedView === 0 ? 'active' : ''}`}
              onClick={() => setSelectedView(0)}
              aria-label="3D Model View"
            >
              <div className="thumbnail-3d" ref={thumbnail3dRef} />
            </button>
            
            {/* 2D Image Thumbnails */}
            {product.images && product.images.map((image, index) => (
              <button
                key={index}
                className={`gallery-thumbnail ${selectedView === index + 1 ? 'active' : ''}`}
                onClick={() => setSelectedView(index + 1)}
                aria-label={`View image ${index + 1}`}
              >
                <img 
                  src={image} 
                  alt={`${product.name} - Thumbnail ${index + 1}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="product-details">
          <div className="product-info-card">
            <h1 className="product-title">{product.name || 'Product'}</h1>
            <div className="product-specs">
              {product.description && (
                <p><strong>{product.description}</strong></p>
              )}
              {product.measurements && (
                <p><strong>SIZE, CM:</strong> {product.measurements.length} × {product.measurements.width} × {product.measurements.height}</p>
              )}
              {!product.description && !product.measurements && (
                <p>Product specifications not available.</p>
              )}
            </div>
          </div>

          <div className="product-3d-space-card">
            <p className="view-in-space-text">View it in your space</p>
            <button
              className="add-to-3d-space-btn"
              type="button"
              onClick={handleAddTo3DSpace}
            >
              ADD TO 3D SPACE
            </button>
          </div>

          <div className="product-purchase-card">
            <div className="product-purchase-row">
              <div className="quantity-controls">
                <button
                  className="quantity-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input 
                  type="number" 
                  id="quantity"
                  value={quantity} 
                  min="1" 
                  readOnly 
                  style={{ textAlign: 'center' }}
                />
                <button
                  className="quantity-btn"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <div className="product-price-section">
                <span className="product-price-large">{product.price ? `${product.price.toFixed(2)} $` : '0.00 $'}</span>
              </div>
            </div>
            <button className="add-to-cart-btn" onClick={handleAddToCart}>
              ADD TO CART
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Product;

