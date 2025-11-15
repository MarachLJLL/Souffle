// Load products from database
async function loadProductsFromDatabase() {
    try {
        const response = await fetch('../database/products.json');
        if (!response.ok) {
            throw new Error('Failed to load products');
        }
        const dbProducts = await response.json();
        
        // Convert database products to our format
        return dbProducts.map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            glb: `../database/${product.glb}`, // Path to GLB file
            image: product.image_paths && product.image_paths.length > 0 
                ? `../database/${product.image_paths[0]}` // Use first JPG image for marketplace
                : null,
            images: product.image_paths ? product.image_paths.map(img => `../database/${img}`) : [],
            measurements: product.measurements,
            specs: product.measurements ? [
                `LENGTH: ${product.measurements.length} CM`,
                `WIDTH: ${product.measurements.width} CM`,
                `HEIGHT: ${product.measurements.height} CM`
            ] : []
        }));
    } catch (error) {
        console.error('Error loading products from database:', error);
        return [];
    }
}

// Load listings from localStorage and merge with database products
async function loadProducts() {
    const dbProducts = await loadProductsFromDatabase();
    const savedListings = JSON.parse(localStorage.getItem('souffle_listings') || '[]');
    
    // Convert listings to product format (with base64 images)
    const listingProducts = savedListings.map(listing => ({
        id: listing.id,
        name: listing.name,
        price: listing.price,
        glb: listing.glb || null, // GLB path if available
        image: listing.image, // base64 image for fallback
        size: "normal",
        isListing: true,
        description: listing.description,
        dimensions: listing.dimensions,
        specs: listing.dimensions ? [
            `LENGTH: ${listing.dimensions.length} CM`,
            `WIDTH: ${listing.dimensions.width} CM`,
            `HEIGHT: ${listing.dimensions.height} CM`
        ] : []
    }));
    
    // Combine database products with listings
    return [...dbProducts, ...listingProducts];
}

// Initialize products array (will be populated asynchronously)
let products = [];

// Cart state
let cart = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Load products from database
    products = await loadProducts();
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

// Render products with 3D GLB previews
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return; // Product page doesn't have this element
    
    grid.innerHTML = products.map((product, index) => `
        <a href="product.html?id=${product.id}" class="product-item">
            <div class="product-image-wrapper">
                ${product.glb 
                    ? `<div id="product-preview-${product.id}"></div>`
                    : product.image
                        ? `<img src="${product.image}" alt="${product.name}" onerror="this.style.display='none'">`
                        : '<div style="background: #f5f5f5; width: 100%; aspect-ratio: 1;"></div>'
                }
            </div>
            <div class="product-info-overlay">
                <span class="product-name">${product.name}</span>
                <span class="product-price">$${product.price}</span>
            </div>
        </a>
    `).join('');
    
    // Initialize 3D previews for all products with GLB files
    // Use requestAnimationFrame to ensure DOM is ready and layout is calculated
    requestAnimationFrame(() => {
        setTimeout(() => {
            products.forEach(product => {
                if (product.glb) {
                    initProductPreview(product.id, product.glb);
                }
            });
        }, 200);
    });
}

// Initialize 3D preview for a product
async function initProductPreview(productId, glbPath) {
    try {
        const { initProductPreview: initPreview } = await import('./productPreview3d.js');
        initPreview(productId, glbPath);
    } catch (error) {
        console.error('Error loading 3D preview module:', error);
    }
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
