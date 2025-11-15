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
      // In Vite, files in public/ are served at the root
      // So /database/products.json should work if database/ is in public/
      const response = await fetch('/database/products.json');
      
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
      // In Vite, files in public/ are served at root, so /database/ works
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

  // Load products (from database + localStorage listings)
  const loadProducts = async () => {
    setLoading(true);
    try {
      const dbProducts = await loadProductsFromDatabase();
      const savedListings =
        JSON.parse(localStorage.getItem('souffle_listings') || '[]') || [];

      // Convert listings to product format (with base64 images)
      const listingProducts = savedListings.map((listing) => ({
        id: listing.id,
        name: listing.name,
        price: listing.price,
        glb: listing.glb || null, // GLB path if available
        image: listing.image, // base64 image for fallback
        size: 'normal',
        isListing: true,
        description: listing.description,
        dimensions: listing.dimensions,
        specs: listing.dimensions
          ? [
              `LENGTH: ${listing.dimensions.length} CM`,
              `WIDTH: ${listing.dimensions.width} CM`,
              `HEIGHT: ${listing.dimensions.height} CM`,
            ]
          : [],
      }));

      // Combine database products with listings
      setProducts([...dbProducts, ...listingProducts]);
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

  // Refresh products (useful after adding a listing)
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

