// Product page functionality
// Make sure products array is available (from script.js)
if (typeof products === 'undefined') {
    // Fallback product data if script.js isn't loaded
    var products = [
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
}

let currentProduct = null;
let quantity = 1;

// Get product ID from URL
function getProductIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id')) || 2; // Default to product ID 2 (Candle Holder Shadow)
}

// Load product data
function loadProduct() {
    const productId = getProductIdFromURL();
    currentProduct = products.find(p => p.id === productId);
    
    if (!currentProduct) {
        // Default product if not found
        currentProduct = {
            id: 2,
            name: "Candle Holder Shadow",
            price: 250,
            image: "../assets/products/vase2.png",
            images: [
                "../assets/products/vase2.png",
                "../assets/products/vase.png",
                "../assets/products/cat_tree.png"
            ],
            specs: [
                "CANDLE HOLDER MADE OF ANODIZED ALUMINUM",
                "IT COMES WITH WAX REMOVER",
                "IT FITS FOR MODEL A Ø 17 ММ CANDLE",
                "SIZE, MM: 207 х 245",
                "DESIGNED AND MANUFACTURED IN KYIV"
            ],
            concept: "This candle holder is like a blank canvas, where candles tell colorful stories. As the wax melts, it leaves unique traces, forming a mosaic of colors. With each passing moment, the candle changes shape, creating a new picture and bringing peace and beauty to the space"
        };
    }

    // Set default images if not provided
    if (!currentProduct.images) {
        currentProduct.images = [
            currentProduct.image,
            "../assets/products/vase.png",
            "../assets/products/cat_tree.png"
        ];
    }

    renderProduct();
    loadRelatedProducts();
}

// Render product details
function renderProduct() {
    if (!currentProduct) return;

    // Update title
    document.getElementById('productTitle').textContent = currentProduct.name;
    
    // Update price
    document.getElementById('productPrice').textContent = `${currentProduct.price} $`;
    
    // Update specs
    const specsEl = document.getElementById('productSpecs');
    if (currentProduct.specs) {
        specsEl.innerHTML = currentProduct.specs.map(spec => 
            `<p><strong>${spec}</strong></p>`
        ).join('');
    }
    
    // Update concept
    const conceptEl = document.getElementById('productConcept');
    if (currentProduct.concept) {
        conceptEl.querySelector('p').textContent = currentProduct.concept;
    }
    
    // Update quantity label
    const quantityLabel = document.querySelector('.product-quantity label');
    if (quantityLabel) {
        quantityLabel.textContent = `${currentProduct.name} quantity`;
    }
    
    // Render gallery
    renderGallery();
}

// Render image gallery
function renderGallery() {
    const mainSlide = document.getElementById('mainSlide');
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.getElementById('galleryThumbnails');
    
    if (!currentProduct || !currentProduct.images) return;
    
    // Set main image
    mainImage.src = currentProduct.images[0];
    mainImage.alt = currentProduct.name;
    
    // Clear thumbnails
    thumbnails.innerHTML = '';
    
    // Create thumbnails
    currentProduct.images.forEach((img, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `gallery-thumbnail ${index === 0 ? 'active' : ''}`;
        thumbnail.onclick = () => switchImage(index);
        
        const imgEl = document.createElement('img');
        imgEl.src = img;
        imgEl.alt = `${currentProduct.name} - Image ${index + 1}`;
        
        thumbnail.appendChild(imgEl);
        thumbnails.appendChild(thumbnail);
    });
}

// Switch main image
function switchImage(index) {
    if (!currentProduct || !currentProduct.images) return;
    
    const mainImage = document.getElementById('mainImage');
    mainImage.src = currentProduct.images[index];
    
    // Update active thumbnail
    const thumbnails = document.querySelectorAll('.gallery-thumbnail');
    thumbnails.forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

// Quantity controls
function setupQuantityControls() {
    const decreaseBtn = document.getElementById('decreaseQty');
    const increaseBtn = document.getElementById('increaseQty');
    const quantityInput = document.getElementById('quantity');
    
    decreaseBtn.addEventListener('click', () => {
        if (quantity > 1) {
            quantity--;
            quantityInput.value = quantity;
        }
    });
    
    increaseBtn.addEventListener('click', () => {
        quantity++;
        quantityInput.value = quantity;
    });
}

// Add to cart
function setupAddToCart() {
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    addToCartBtn.addEventListener('click', () => {
        if (!currentProduct) return;
        
        // Ensure cart is initialized
        if (typeof cart === 'undefined') {
            cart = [];
            loadCart();
        }
        
        // Add product to cart with quantity
        for (let i = 0; i < quantity; i++) {
            cart.push({ ...currentProduct, cartId: Date.now() + i });
        }
        
        if (typeof saveCart === 'function') {
            saveCart();
        } else {
            localStorage.setItem('souffle_cart', JSON.stringify(cart));
        }
        
        if (typeof updateCartUI === 'function') {
            updateCartUI();
        } else {
            const cartCount = document.getElementById('cartCount');
            if (cartCount) {
                cartCount.textContent = cart.length;
            }
        }
        
        // Show feedback
        const originalText = addToCartBtn.textContent;
        addToCartBtn.textContent = 'ADDED TO CART';
        addToCartBtn.style.background = '#4CAF50';
        
        setTimeout(() => {
            addToCartBtn.textContent = originalText;
            addToCartBtn.style.background = '';
        }, 2000);
    });
}

// Load related products
function loadRelatedProducts() {
    const relatedGrid = document.getElementById('relatedProducts');
    if (!relatedGrid || !currentProduct) return;
    
    // Ensure products array is available
    const productsList = typeof products !== 'undefined' ? products : [];
    if (productsList.length === 0) return;
    
    // Get 4 random products excluding current product
    const related = productsList
        .filter(p => p.id !== currentProduct.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
    
    relatedGrid.innerHTML = related.map(product => `
        <a href="product.html?id=${product.id}" class="related-product-item">
            <img src="${product.image}" alt="${product.name}" class="related-product-image" onerror="this.style.display='none'">
            <div class="related-product-info">
                <div class="related-product-name">${product.name}</div>
                <div class="related-product-price">$${product.price}</div>
            </div>
        </a>
    `).join('');
}

// Initialize product page
document.addEventListener('DOMContentLoaded', () => {
    // Initialize cart if not already done
    if (typeof cart === 'undefined') {
        cart = [];
        const savedCart = localStorage.getItem('souffle_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
    }
    
    // Update cart UI
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
    
    loadProduct();
    setupQuantityControls();
    setupAddToCart();
    
    // Cart toggle functions
    function toggleCart() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            if (sidebar.classList.contains('active')) {
                renderCartItems();
            }
        }
    }
    
    function renderCartItems() {
        const cartItems = document.getElementById('cartItems');
        if (!cartItems) return;
        
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
        const cartTotal = document.getElementById('cartTotal');
        if (cartTotal) {
            cartTotal.textContent = total.toFixed(2);
        }
    }
    
    // Make removeFromCart available globally
    window.removeFromCart = function(cartId) {
        cart = cart.filter(item => item.cartId !== cartId);
        localStorage.setItem('souffle_cart', JSON.stringify(cart));
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = cart.length;
        }
        renderCartItems();
    };
    
    // Cart toggle
    const cartBtn = document.getElementById('cartBtn');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartBtn) cartBtn.addEventListener('click', toggleCart);
    if (closeCart) closeCart.addEventListener('click', toggleCart);
    if (cartOverlay) cartOverlay.addEventListener('click', toggleCart);
    
    // Header shadow on scroll
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 0) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }
});

