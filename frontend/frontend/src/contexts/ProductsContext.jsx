import { createContext, useContext, useState, useEffect } from 'react';

const ProductsContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider');
  }
  return context;
};

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load products from database
  const loadProductsFromDatabase = async () => {
    try {
      // Vite middleware serves /database/ from root database/ folder (not public/database/)
      // Add cache-busting query parameter to ensure we get the latest version
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`/database/products.json${cacheBuster}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load products: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', contentType, text.substring(0, 200));
        throw new Error('Response is not JSON');
      }
      
      const dbProducts = await response.json();
      console.log('✅ Loaded products from /database/products.json');

      // Convert database products to our format
      // Paths use /database/ which is served from root database/ folder
      return dbProducts.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        glb: `/database/${product.glb}`, // Path to GLB file
        image:
          product.image_paths && product.image_paths.length > 0
            ? `/database/${product.image_paths[0]}` // Use first JPG image for marketplace
            : null,
        images: product.image_paths
          ? product.image_paths.map((img) => `/database/${img}`)
          : [],
        measurements: product.measurements,
        specs: product.measurements
          ? [
              `LENGTH: ${product.measurements.length} CM`,
              `WIDTH: ${product.measurements.width} CM`,
              `HEIGHT: ${product.measurements.height} CM`,
            ]
          : [],
      }));
    } catch (error) {
      console.error('Error loading products from database:', error);
      return [];
    }
  };

  // Load products from database only
  const loadProducts = async () => {
    setLoading(true);
    try {
      const dbProducts = await loadProductsFromDatabase();
      setProducts(dbProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Refresh products
  const refreshProducts = () => {
    loadProducts();
  };

  // Get product by ID
  const getProductById = (id) => {
    return products.find((p) => p.id === parseInt(id));
  };

  const value = {
    products,
    loading,
    refreshProducts,
    getProductById,
  };

  return (
    <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
  );
};

