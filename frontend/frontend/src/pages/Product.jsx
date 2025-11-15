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
  const containerRef = useRef(null);

  const productId = parseInt(searchParams.get('id')) || 2;

  useEffect(() => {
    const loadedProduct = getProductById(productId);
    if (loadedProduct) {
      setProduct(loadedProduct);
    } else {
      // Try loading from database
      fetch('/database/products.json')
        .then((res) => res.json())
        .then((products) => {
          const found = products.find((p) => p.id === productId);
          if (found) {
            setProduct({
              ...found,
              glb: `/database/${found.glb}`,
              image: found.image_paths?.[0] ? `/database/${found.image_paths[0]}` : null,
            });
          }
        })
        .catch((err) => console.error('Error loading product:', err));
    }
  }, [productId, getProductById]);

  useEffect(() => {
    if (!containerRef.current || !product) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xf5f5f5, 1);
    container.appendChild(renderer.domElement);

    camera.position.set(0, 0.3, 5);

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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;

    const loader = new GLTFLoader();
    const modelPath = product.glb || '/assets/models/Chair.glb';

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
      requestAnimationFrame(animate);
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
      if (container && renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [product]);

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
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
          <div className="gallery-main" ref={containerRef} id="product3DViewer" />
        </div>

        <div className="product-details">
          <div className="product-info-card">
            <h1 className="product-title">{product.name}</h1>
            {product.specs && product.specs.length > 0 && (
              <div className="product-specs">
                {product.specs.map((spec, idx) => (
                  <p key={idx}>{spec}</p>
                ))}
              </div>
            )}
          </div>

          <div className="product-3d-space-card">
            <p className="view-in-space-text">View it in your space</p>
            <button className="add-to-3d-space-btn">ADD TO 3D SPACE</button>
          </div>

          <div className="product-purchase-card">
            <div className="product-purchase-row">
              <div className="quantity-controls">
                <button
                  className="quantity-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </button>
                <input type="number" value={quantity} min="1" readOnly />
                <button
                  className="quantity-btn"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
              <div className="product-price-section">
                <span className="product-price-large">${product.price}</span>
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

