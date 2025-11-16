import { useState, useEffect, useRef } from 'react';
import { useProducts } from '../contexts/ProductsContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const View3DSpace = () => {
  const { products } = useProducts();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [initializedSelection, setInitializedSelection] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrTargetUrl, setQrTargetUrl] = useState('');
  const [viewerIds, setViewerIds] = useState(null);

  // Load the list of product IDs configured for the 3D viewer
  useEffect(() => {
    const loadViewerIds = async () => {
      try {
        // Fetch from backend so we get the up-to-date list written by /3dviewer
        const res = await fetch('http://localhost:8080/3dviewer');
        if (!res.ok) {
          console.warn('Failed to load 3D viewer IDs:', res.status, res.statusText);
          setViewerIds([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          const ids = data
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0);
          setViewerIds(ids);
        } else {
          setViewerIds([]);
        }
      } catch (err) {
        console.error('Error loading 3Dviewer.json:', err);
        setViewerIds([]);
      }
    };

    loadViewerIds();
  }, []);

  // Filter to only show products with GLB files and included in 3Dviewer.json (if present)
  const productsWith3D = products
    .filter((p) => p.glb)
    .filter((p) => {
      // If viewerIds is null, we haven't loaded yet – show nothing to avoid flicker
      if (viewerIds === null) return false;
      // Once loaded, only show products whose IDs are listed in 3Dviewer.json
      return viewerIds.includes(p.id);
    })
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
                  onRemove={async () => {
                    try {
                      const res = await fetch('http://localhost:8080/3dviewer', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: product.id }),
                      });
                      const result = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        console.error('Failed to remove from 3D viewer list:', result.error || res.status);
                        alert('Failed to remove from 3D space. Please try again.');
                        return;
                      }
                      // Update local viewerIds and selection state so UI reflects removal
                      setViewerIds((prev) =>
                        Array.isArray(prev) ? prev.filter((id) => id !== product.id) : prev
                      );
                      setSelectedProducts((prev) => prev.filter((id) => id !== product.id));
                    } catch (err) {
                      console.error('Error removing from 3D viewer:', err);
                      alert('Failed to remove from 3D space. Please try again.');
                    }
                  }}
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

const Product3DCard = ({ product, isSelected, onToggle, onRemove }) => {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(false);

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

    // Maximum brightness for very bright models
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Strong fill light to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.0);
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      {/* Permanent remove from 3D viewer list (minus icon in top-right on hover) */}
      {onRemove && hovered && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderRadius: '999px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          −
        </button>
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

