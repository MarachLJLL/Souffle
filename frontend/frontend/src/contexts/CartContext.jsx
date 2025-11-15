import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('souffle_cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Ensure all items have unique cartIds
        const cartWithIds = parsedCart.map((item, index) => {
          if (!item.cartId || item.cartId === null || item.cartId === undefined) {
            // Generate a unique ID for items missing cartId
            const uniqueId = `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
            return { ...item, cartId: uniqueId };
          }
          return item;
        });
        setCart(cartWithIds);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('souffle_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    // Generate a unique cartId using timestamp + random number + index
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
    setCart((prevCart) => [...prevCart, { ...product, cartId: uniqueId }]);
    // Brief visual feedback
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
      cartBtn.style.transform = 'scale(1.1)';
      setTimeout(() => {
        cartBtn.style.transform = 'scale(1)';
      }, 200);
    }
  };

  const removeFromCart = (cartId) => {
    setCart((prevCart) => {
      const filtered = prevCart.filter((item) => {
        // Handle both string and number comparisons, ensure strict equality
        if (item.cartId === undefined || item.cartId === null) {
          return false; // Remove items without cartId
        }
        return String(item.cartId) !== String(cartId);
      });
      return filtered;
    });
  };

  const updateQuantity = (cartId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.cartId === cartId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const quantity = item.quantity || 1;
      return total + parseFloat(item.price) * quantity;
    }, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + (item.quantity || 1), 0);
  };

  const toggleCart = () => {
    setIsOpen((prev) => !prev);
  };

  const closeCart = () => {
    setIsOpen(false);
  };

  const value = {
    cart,
    isOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    toggleCart,
    closeCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

