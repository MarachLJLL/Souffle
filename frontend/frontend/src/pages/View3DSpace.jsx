import { useState, useEffect, useRef } from 'react';
import { useProducts } from '../contexts/ProductsContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const View3DSpace = () => {
  const { products } = useProducts();
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Load products from localStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('selected_3d_products');
    if (savedProducts) {
      try {
        const productIds = JSON.parse(savedProducts);
        setSelectedProducts(productIds);
      } catch (error) {
        console.error('Error loading 3D space products:', error);
      }
    }
  }, []);

  // Filter to only show products with GLB files that are in selectedProducts or all products
  // Show products that are added to 3D space, or show all if none selected
  const productsWith3D = selectedProducts.length > 0
    ? products.filter((p) => p.glb && selectedProducts.includes(p.id))
    : products.filter((p) => p.glb).slice(0, 4);

  const toggleProduct = (productId) => {
    const updated = selectedProducts.includes(productId)
      ? selectedProducts.filter((id) => id !== productId)
      : [...selectedProducts, productId];
    
    setSelectedProducts(updated);
    // Save to localStorage
    localStorage.setItem('selected_3d_products', JSON.stringify(updated));
  };

  const handleView3D = () => {
    // Save selected products and navigate (not fully implemented)
    localStorage.setItem(
      'selected_3d_products',
      JSON.stringify(selectedProducts)
    );
    alert('View 3D Space functionality coming soon!');
  };

  const clearAll = () => {
    setSelectedProducts([]);
    localStorage.removeItem('selected_3d_products');
  };

  return (
    <main className="main view-3d-space-main">
      <div className="container">
        <div className="view-3d-space-container">
          <h2 className="page-title">VIEW 3D SPACE</h2>
          <p className="page-subtitle">
            Select products to view in your 3D space
          </p>

          {selectedProducts.length > 0 && (
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
              <button
                onClick={clearAll}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  color: '#666'
                }}
              >
                Clear All
              </button>
            </div>
          )}

          <div className="products-selection">
            {productsWith3D.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                <p>No products added to 3D space yet.</p>
                <p style={{ marginTop: '10px', fontSize: '14px' }}>
                  Add products from the product page to view them here.
                </p>
              </div>
            ) : (
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
            )}
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
      onClick={onToggle}
    >
      <div className="product-3d-viewer" ref={containerRef} />
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

