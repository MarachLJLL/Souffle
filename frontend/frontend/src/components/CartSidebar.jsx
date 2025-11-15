import { useCart } from '../contexts/CartContext';

const CartSidebar = () => {
  const {
    cart,
    isOpen,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    closeCart,
  } = useCart();

  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'active' : ''}`} onClick={closeCart} />
      <div className={`cart-sidebar ${isOpen ? 'active' : ''}`}>
        <div className="cart-header">
          <h2>CART</h2>
          <button className="close-btn" onClick={closeCart}>
            ×
          </button>
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <p className="empty-cart">Your cart is empty</p>
          ) : (
            cart.map((item) => {
              // Get image path - use item.image if available, otherwise construct from image_paths
              const imagePath = item.image 
                ? item.image 
                : item.image_paths && item.image_paths[0]
                  ? `/database/${item.image_paths[0]}`
                  : null;
              
              return (
                <div key={item.cartId} className="cart-item">
                  {imagePath && (
                    <img 
                      src={imagePath} 
                      alt={item.name} 
                      className="cart-item-image"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="cart-item-info">
                    <h3 className="cart-item-name">{item.name}</h3>
                    <p className="cart-item-price">${parseFloat(item.price || 0).toFixed(2)}</p>
                    <button
                      className="cart-item-remove"
                      onClick={() => removeFromCart(item.cartId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>
                Total: $<span>{getCartTotal().toFixed(2)}</span>
              </span>
            </div>
            <button className="checkout-btn">CHECKOUT</button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;

