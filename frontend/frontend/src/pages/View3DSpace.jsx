import { useState, useEffect, useRef } from 'react';
import { useProducts } from '../contexts/ProductsContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import qrCode from '../assets/qr_code.png';

const View3DSpace = () => {
  const { products } = useProducts();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [initializedSelection, setInitializedSelection] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrTargetUrl, setQrTargetUrl] = useState('');

  // Filter to only show products with GLB files (limit to 4)
  const productsWith3D = products
    .filter((p) => p.glb)
    .slice(0, 4);

  // On first load, start with all available 3D products selected
  useEffect(() => {
    if (!initializedSelection && productsWith3D.length > 0) {
      setSelectedProducts(productsWith3D.map((p) => p.id));
      setInitializedSelection(true);
    }
  }, [initializedSelection, productsWith3D]);

  const toggleProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleView3D = () => {
    // Save selected products locally for same-device usage
    localStorage.setItem(
      'selected_3d_products',
      JSON.stringify(selectedProducts)
    );

    // Build a cross-device AR URL that encodes the selected product IDs
    try {
      const idsParam = selectedProducts.join(',');
      // Use the public base URL for the AR app (ngrok tunnel)
      const origin = 'https://debasingly-stubborn-january.ngrok-free.dev';
      const arUrl = `${origin}/ar?ids=${encodeURIComponent(idsParam)}`;
      setQrTargetUrl(arUrl);
    } catch {
      setQrTargetUrl('');
    }

    setShowQR(true);
  };

  return (
    <main className="main view-3d-space-main">
      <div className="container">
        <div className="view-3d-space-container">
          <h2 className="page-title">VIEW 3D SPACE</h2>
          <p className="page-subtitle">
            Select products to view in your 3D space
          </p>

          <div className="products-selection">
            <div className="products-selection-grid">
              {productsWith3D.map((product) => (
                <Product3DCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProducts.includes(product.id)}
                  onToggle={() => toggleProduct(product.id)}
                />
              ))}
            </div>
          </div>

          <div className="view-3d-actions">
            <button
              className={`view-3d-btn ${selectedProducts.length > 0 ? 'enabled' : ''}`}
              onClick={handleView3D}
              disabled={selectedProducts.length === 0}
            >
              VIEW 3D SPACE
            </button>
          </div>
        </div>
      </div>

      {showQR && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '320px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            <p
              style={{
                marginBottom: '12px',
                fontSize: '14px',
                color: '#333',
                fontWeight: 500,
              }}
            >
              Scan this QR code to view your 3D space on another device:
            </p>
            {qrTargetUrl && (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  qrTargetUrl
                )}`}
                alt="View 3D space QR code"
                style={{
                  maxWidth: '220px',
                  width: '100%',
                  height: 'auto',
                  marginBottom: '16px',
                }}
              />
            )}
            <button
              type="button"
              onClick={() => setShowQR(false)}
              style={{
                marginTop: '4px',
                padding: '8px 16px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: '#000',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

const Product3DCard = ({ product, isSelected, onToggle }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !product.glb) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    const width = container.clientWidth || 200;
    const height = container.clientHeight || 200;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    scene.background = new THREE.Color(0xf5f5f5);
    container.appendChild(renderer.domElement);

    camera.position.set(0, 0.3, 5);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(0, 0, -5);
    scene.add(pointLight);

    const loader = new GLTFLoader();
    loader.load(
      product.glb,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.multiplyScalar(scale);

        scene.add(model);

        // Auto-rotate
        function animate() {
          requestAnimationFrame(animate);
          model.rotation.y += 0.01;
          renderer.render(scene, camera);
        }
        animate();
      },
      undefined,
      (error) => console.error('Error loading model:', error)
    );

    return () => {
      if (container && renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [product.glb]);

  return (
    <div
      className={`product-selection-item ${isSelected ? 'selected' : ''}`}
      style={{ position: 'relative' }}
      onClick={onToggle}
    >
      <div className="product-3d-viewer" ref={containerRef} />
      {/* Deselect indicator overlay for clearer feedback */}
      {!isSelected && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderRadius: '999px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 500,
          }}
        >
          {/* You can replace this ✕ with a custom PNG icon if desired */}
          <span style={{ fontSize: '11px' }}>✕</span>
          <span>Excluded</span>
        </div>
      )}
      <div className="checkbox-container-bottom">
        <input
          type="checkbox"
          className="product-checkbox"
          checked={isSelected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="product-selection-name">{product.name}</div>
    </div>
  );
};

export default View3DSpace;

