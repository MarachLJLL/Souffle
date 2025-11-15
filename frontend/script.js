// Product data based on the original site with varying sizes
// Images cycle through: vase.png, vase2.png, cat_tree.png, egg.png
const products = [
    { id: 1, name: "Candle holder 04", price: 50, image: "../assets/products/vase.png", size: "normal" },
    { id: 2, name: "Candle Holder Shadow", price: 250, image: "../assets/products/vase2.png", size: "large" },
    { id: 3, name: "Super Combo Set 03", price: 155, image: "../assets/products/cat_tree.png", size: "wide" },
    { id: 4, name: "Tree", price: 25, image: "../assets/products/egg.png", size: "normal" },
    { id: 5, name: "Apple", price: 30, image: "../assets/products/vase.png", size: "normal" },
    { id: 6, name: "Secret Garden", price: 65, image: "../assets/products/vase2.png", size: "normal" },
    { id: 7, name: "Eggs candles set 2 pieces", price: 25, image: "../assets/products/cat_tree.png", size: "normal" },
    { id: 8, name: "Big Pattison", price: 40, image: "../assets/products/egg.png", size: "normal" },
    { id: 9, name: "Alchemy Of Light", price: 25, image: "../assets/products/vase.png", size: "normal" },
    { id: 10, name: "100 hours", price: 40, image: "../assets/products/vase2.png", size: "normal" },
    { id: 11, name: "Transparent holder", price: 90, image: "../assets/products/cat_tree.png", size: "large" },
    { id: 12, name: "Traditional Candle", price: 25, image: "../assets/products/egg.png", size: "normal" },
    { id: 13, name: "Amber Forest", price: 25, image: "../assets/products/vase.png", size: "normal" },
    { id: 14, name: "Corn", price: 35, image: "../assets/products/vase2.png", size: "normal" },
    { id: 15, name: "Patisson white", price: 40, image: "../assets/products/cat_tree.png", size: "normal" },
    { id: 16, name: "Cauliflower", price: 30, image: "../assets/products/egg.png", size: "normal" },
    { id: 17, name: "Eggs Candles Set 4 pieces", price: 35, image: "../assets/products/vase.png", size: "normal" },
    { id: 18, name: "Blossom", price: 65, image: "../assets/products/vase2.png", size: "normal" },
    { id: 19, name: "Wildflower", price: 65, image: "../assets/products/cat_tree.png", size: "normal" },
    { id: 20, name: "Magic Night", price: 25, image: "../assets/products/egg.png", size: "normal" },
    { id: 21, name: "Magnolia", price: 25, image: "../assets/products/vase.png", size: "normal" },
    { id: 22, name: "Wick scissors", price: 17, image: "../assets/products/vase2.png", size: "normal" }
];

// Cart state
let cart = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    loadCart();
    updateCartUI();

    // Cart toggle
    document.getElementById('cartBtn').addEventListener('click', toggleCart);
    document.getElementById('closeCart').addEventListener('click', toggleCart);
    document.getElementById('cartOverlay').addEventListener('click', toggleCart);

    // Header shadow on scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 0) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
});

// Render products
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = products.map(product => `
        <div class="product-item" onclick="addToCart(${product.id})">
            <div class="product-image-wrapper">
                <img src="${product.image}" alt="${product.name}" onerror="this.style.display='none'">
            </div>
            <div class="product-info-overlay">
                <span class="product-name">${product.name}</span>
                <span class="product-price">$${product.price}</span>
            </div>
        </div>
    `).join('');
}

// Cart functions
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        cart.push({ ...product, cartId: Date.now() });
        saveCart();
        updateCartUI();
        
        // Show brief feedback
        const cartBtn = document.getElementById('cartBtn');
        cartBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            cartBtn.style.transform = 'scale(1)';
        }, 200);
    }
}

function removeFromCart(cartId) {
    cart = cart.filter(item => item.cartId !== cartId);
    saveCart();
    updateCartUI();
    renderCartItems();
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    
    if (sidebar.classList.contains('active')) {
        renderCartItems();
    }
}

function renderCartItems() {
    const cartItems = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.style.display='none'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price}</div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.cartId})">Remove</button>
            </div>
        </div>
    `).join('');

    // Update total
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('cartTotal').textContent = total.toFixed(2);
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    cartCount.textContent = cart.length;
}

function saveCart() {
    localStorage.setItem('souffle_cart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('souffle_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}
