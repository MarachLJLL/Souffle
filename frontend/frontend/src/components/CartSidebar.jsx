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

  if (!isOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={closeCart} />
      <div className="cart-sidebar">
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
              const quantity = item.quantity || 1;
              return (
                <div key={item.cartId} className="cart-item">
                  <div className="cart-item-info">
                    <h3 className="cart-item-name">{item.name}</h3>
                    <p className="cart-item-price">${item.price}</p>
                  </div>
                  <div className="cart-item-controls">
                    <button
                      className="quantity-btn"
                      onClick={() => updateQuantity(item.cartId, quantity - 1)}
                    >
                      −
                    </button>
                    <span className="quantity">{quantity}</span>
                    <button
                      className="quantity-btn"
                      onClick={() => updateQuantity(item.cartId, quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      className="remove-btn"
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
            <button className="checkout-btn">Checkout</button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;

