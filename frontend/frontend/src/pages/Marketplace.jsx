import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../contexts/ProductsContext';
import { useCart } from '../contexts/CartContext';
import Carousel3D from '../components/Carousel3D';
import ProductPreview3D from '../components/ProductPreview3D';

const Marketplace = () => {
  const { products, loading } = useProducts();
  const { addToCart } = useCart();
  const initializedRefs = useRef(new Set());

  // Add class to body when on marketplace page
  useEffect(() => {
    document.body.classList.add('marketplace-page-active');
    return () => {
      document.body.classList.remove('marketplace-page-active');
    };
  }, []);

  // Debug: Log products when they load
  useEffect(() => {
    if (!loading && products.length > 0) {
      console.log('Marketplace: Products loaded:', products);
      console.log('Marketplace: First product:', products[0]);
    }
  }, [products, loading]);

  // Initialize 3D previews after products are loaded and DOM is ready
  useEffect(() => {
    if (loading || products.length === 0) return;

    // Use requestAnimationFrame to ensure DOM is ready, similar to original
    requestAnimationFrame(() => {
      setTimeout(() => {
        products.forEach((product) => {
          if (product.glb && !initializedRefs.current.has(product.id)) {
            initializedRefs.current.add(product.id);
          }
        });
      }, 200);
    });
  }, [products, loading]);

  if (loading) {
    return (
      <div className="marketplace-page" style={{ backgroundColor: '#E4E2E2', minHeight: '100vh' }}>
        <div className="main">
          <div className="container">
            <p>Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="marketplace-page" style={{ backgroundColor: '#E4E2E2', minHeight: '100vh' }}>
        <div className="main">
          <div className="container">
            <p>No products found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-page" style={{ backgroundColor: '#E4E2E2', minHeight: '100vh' }}>
      <Carousel3D />
      <main className="main">
        <div className="container">
          <div className="products-grid" id="productsGrid">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product?id=${product.id}`}
                className="product-item"
              >
                <div className="product-image-wrapper">
                  {product.glb ? (
                    <ProductPreview3D
                      productId={product.id}
                      glbPath={product.glb}
                      measurements={product.measurements}
                    />
                  ) : product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        background: '#E4E2E2',
                        width: '100%',
                        aspectRatio: 1,
                      }}
                    />
                  )}
                </div>
                <div className="product-info-overlay">
                  <span className="product-name">{product.name}</span>
                  <span className="product-price">${product.price}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Marketplace;

