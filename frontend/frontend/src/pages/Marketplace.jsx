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
      <div className="main">
        <div className="container">
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="main">
        <div className="container">
          <p>No products found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
                        background: '#f5f5f5',
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
    </>
  );
};

export default Marketplace;

