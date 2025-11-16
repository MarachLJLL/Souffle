import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import { ProductsProvider } from './contexts/ProductsContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartSidebar from './components/CartSidebar';
import Marketplace from './pages/Marketplace';
import Product from './pages/Product';
import Create3DModel from './pages/Create3DModel';
import View3DSpace from './pages/View3DSpace';
import './styles.css';

function App() {
  return (
    <Router>
      <CartProvider>
        <ProductsProvider>
          <div className="App">
            <Header />
            <Routes>
              <Route path="/" element={<Marketplace />} />
              <Route path="/product" element={<Product />} />
              <Route path="/create-3d-model" element={<Create3DModel />} />
              <Route path="/view-3d-space" element={<View3DSpace />} />
            </Routes>
            <Footer />
            <CartSidebar />
          </div>
        </ProductsProvider>
      </CartProvider>
    </Router>
  );
}

export default App;
