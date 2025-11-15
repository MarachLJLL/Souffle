import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const Header = () => {
  const { getCartCount, toggleCart } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDropdownToggle = (e) => {
    e.preventDefault();
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            Soufflé
          </Link>
          <nav className="nav">
            <Link to="/" className="nav-link">
              MARKETPLACE
            </Link>
            <div className="dropdown">
              <a
                href="#"
                className="nav-link dropdown-toggle"
                onClick={handleDropdownToggle}
              >
                3D SPACE
              </a>
              {dropdownOpen && (
                <div className="dropdown-menu">
                  <Link
                    to="/create-3d-model"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    CREATE 3D MODEL
                  </Link>
                  <Link
                    to="/view-3d-space"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    VIEW 3D SPACE
                  </Link>
                </div>
              )}
            </div>
            <Link to="/create-listing" className="nav-link">
              CREATE LISTING
            </Link>
            <button className="cart-btn" id="cartBtn" onClick={toggleCart}>
              <span>CART</span>
              <span className="cart-count">{getCartCount()}</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;

