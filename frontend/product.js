// Product page functionality
// Note: products array may be available from script.js, but we load directly from database
// so we don't need to declare it here

let currentProduct = null;
let quantity = 1;

// Get product ID from URL
function getProductIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id')) || 2; // Default to product ID 2 (Candle Holder Shadow)
}

// Load product data from database
async function loadProduct() {
    const productId = getProductIdFromURL();
    console.log('Loading product with ID:', productId);
    
    // Try to load from database first
    try {
        // Determine base path - try different possible paths
        let response = null;
        let workingPath = null;
        const paths = [
            '../database/products.json',
            'database/products.json'
        ];
        
        // Try each path
        for (const path of paths) {
            try {
                const testResponse = await fetch(path);
                if (testResponse.ok) {
                    const contentType = testResponse.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        response = testResponse;
                        workingPath = path;
                        console.log('Successfully loaded from:', path);
                        break;
                    }
                }
            } catch (e) {
                console.log('Failed to load from:', path, e.message);
                continue;
            }
        }
        
        if (!response || !response.ok) {
            throw new Error(`HTTP error! Could not load products.json from any path. Make sure you're serving the files from a web server.`);
        }
        
        const dbProducts = await response.json();
        console.log('Loaded products from database:', dbProducts);
        
        if (!Array.isArray(dbProducts)) {
            throw new Error('Invalid products.json format - expected an array');
        }
        
        const dbProduct = dbProducts.find(p => p.id === productId);
        console.log('Found product:', dbProduct);
        
        if (dbProduct) {
            // Build specs from product data
            const specs = [];
            
            // Add description
            if (dbProduct.description) {
                specs.push(`<strong>${dbProduct.description}</strong>`);
            }
            
            // Add measurements if available
            if (dbProduct.measurements) {
                specs.push(`<strong>SIZE, CM:</strong> ${dbProduct.measurements.length} x ${dbProduct.measurements.width} x ${dbProduct.measurements.height}`);
            }
            
            // Get first image for cart display
            const firstImage = dbProduct.image_paths && dbProduct.image_paths.length > 0 
                ? `../database/${dbProduct.image_paths[0]}` 
                : null;
            
            currentProduct = {
                id: dbProduct.id,
                name: dbProduct.name || 'Product',
                price: dbProduct.price || 0,
                description: dbProduct.description || '',
                glb: dbProduct.glb ? `../database/${dbProduct.glb}` : '',
                measurements: dbProduct.measurements || null,
                specs: specs,
                image_paths: dbProduct.image_paths ? dbProduct.image_paths.map(path => `../database/${path}`) : [],
                image: firstImage // Add image property for cart display
            };
            
            console.log('Current product set:', currentProduct);
            renderProduct();
            return;
        } else {
            console.warn(`Product with ID ${productId} not found in database. Available IDs:`, dbProducts.map(p => p.id));
            throw new Error(`Product with ID ${productId} not found`);
        }
    } catch (error) {
        console.error('Error loading product from database:', error);
        
        // Show detailed error to user
        const titleEl = document.getElementById('productTitle');
        if (titleEl) {
            titleEl.textContent = 'Error loading product';
        }
        const priceEl = document.getElementById('productPrice');
        if (priceEl) {
            priceEl.textContent = '0 $';
        }
        const specsEl = document.getElementById('productSpecs');
        if (specsEl) {
            specsEl.innerHTML = `<p style="color: red;">Error: ${error.message}</p><p>Check browser console for details.</p>`;
        }
        return;
    }
}

// Render product details
function renderProduct() {
    if (!currentProduct) {
        console.error('No current product to render');
        // Show error message
        const titleEl = document.getElementById('productTitle');
        if (titleEl) titleEl.textContent = 'Product not found';
        const priceEl = document.getElementById('productPrice');
        if (priceEl) priceEl.textContent = '0 $';
        const specsEl = document.getElementById('productSpecs');
        if (specsEl) specsEl.innerHTML = '<p>Product information not available.</p>';
        return;
    }

    console.log('Rendering product:', currentProduct);

    // Update title with product name
    const titleEl = document.getElementById('productTitle');
    if (titleEl) {
        titleEl.textContent = currentProduct.name || 'Product';
    } else {
        console.error('Product title element not found');
    }
    
    // Update price
    const priceEl = document.getElementById('productPrice');
    if (priceEl) {
        const price = currentProduct.price || 0;
        priceEl.textContent = `${price.toFixed(2)} $`;
    } else {
        console.error('Product price element not found');
    }
    
    // Update specs - display description and measurements
    const specsEl = document.getElementById('productSpecs');
    if (specsEl) {
        const specsHTML = [];
        
        // Add description if available
        if (currentProduct.description) {
            specsHTML.push(`<p><strong>${currentProduct.description}</strong></p>`);
        }
        
        // Add measurements if available
        if (currentProduct.measurements) {
            const m = currentProduct.measurements;
            specsHTML.push(`<p><strong>SIZE, CM:</strong> ${m.length} x ${m.width} x ${m.height}</p>`);
        }
        
        if (specsHTML.length > 0) {
            specsEl.innerHTML = specsHTML.join('');
        } else {
            specsEl.innerHTML = '<p>Product specifications not available.</p>';
        }
    } else {
        console.error('Product specs element not found');
    }
    
    // Update quantity label
    const quantityLabel = document.querySelector('.product-quantity label');
    if (quantityLabel) {
        quantityLabel.textContent = `${currentProduct.name} quantity`;
    }
    
    // Render gallery if needed
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
            // Try to load cart if function exists
            if (typeof loadCart === 'function') {
                loadCart();
            } else {
                // Fallback: load from localStorage directly
                const savedCart = localStorage.getItem('souffle_cart');
                if (savedCart) {
                    try {
                        cart = JSON.parse(savedCart);
                    } catch (e) {
                        console.error('Error parsing cart from localStorage:', e);
                        cart = [];
                    }
                }
            }
        }
        
        // Add product to cart with quantity
        for (let i = 0; i < quantity; i++) {
            cart.push({ ...currentProduct, cartId: Date.now() + i });
        }
        
        // Save cart to localStorage
        if (typeof saveCart === 'function') {
            saveCart();
        } else {
            localStorage.setItem('souffle_cart', JSON.stringify(cart));
        }
        
        // Update cart UI (both count and sidebar if open)
        if (typeof updateCartUI === 'function') {
            updateCartUI();
        } else {
            // Fallback: manually update cart count
            const cartCount = document.getElementById('cartCount');
            if (cartCount) {
                cartCount.textContent = cart.length;
            }
        }
        
        // Update cart sidebar if it's open
        const cartSidebar = document.getElementById('cartSidebar');
        if (cartSidebar && cartSidebar.classList.contains('active')) {
            if (typeof renderCartItems === 'function') {
                renderCartItems();
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Product page initialized');
    console.log('Current URL:', window.location.href);
    console.log('Product ID from URL:', getProductIdFromURL());
    
    // Initialize cart if not already done
    if (typeof cart === 'undefined') {
        cart = [];
        // Try to load cart using loadCart function if available
        if (typeof loadCart === 'function') {
            loadCart();
        } else {
            // Fallback: load from localStorage directly
            const savedCart = localStorage.getItem('souffle_cart');
            if (savedCart) {
                try {
                    cart = JSON.parse(savedCart);
                } catch (e) {
                    console.error('Error parsing cart from localStorage:', e);
                    cart = [];
                }
            }
        }
    }
    
    // Update cart UI
    if (typeof updateCartUI === 'function') {
        updateCartUI();
    } else {
        // Fallback: manually update cart count
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = cart.length;
        }
    }
    
    // Check if we're using file:// protocol (which causes CORS issues)
    if (window.location.protocol === 'file:') {
        const specsEl = document.getElementById('productSpecs');
        if (specsEl) {
            specsEl.innerHTML = `
                <p style="color: red; font-weight: bold;">⚠️ CORS Error</p>
                <p>You're opening this file directly from your file system, which prevents loading JSON files.</p>
                <p><strong>Solution:</strong> Serve the files from a web server.</p>
                <p>You can use Python: <code>cd frontend && python -m http.server 8000</code></p>
                <p>Then open: <code>http://localhost:8000/product.html?id=1</code></p>
            `;
        }
        const titleEl = document.getElementById('productTitle');
        if (titleEl) titleEl.textContent = 'CORS Error - Use a Web Server';
        return;
    }
    
    // Show loading message immediately
    const titleEl = document.getElementById('productTitle');
    if (titleEl && titleEl.textContent === 'Loading...') {
        // Keep loading message
    }
    
    // Load product directly from database (don't wait for script.js products array)
    try {
        await loadProduct();
    } catch (error) {
        console.error('Failed to load product:', error);
        const titleEl = document.getElementById('productTitle');
        if (titleEl) titleEl.textContent = 'Error loading product';
    }
    
    setupQuantityControls();
    setupAddToCart();
    
    // Cart toggle functions
    function toggleCart(e) {
        if (e) e.preventDefault();
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        console.log('toggleCart called', sidebar, overlay);
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            if (sidebar.classList.contains('active')) {
                renderCartItems();
            }
        } else {
            console.error('Cart elements not found:', { sidebar, overlay });
        }
    }
    
    // Make toggleCart globally available to override script.js version
    window.toggleCart = toggleCart;
    
    function renderCartItems() {
        const cartItems = document.getElementById('cartItems');
        if (!cartItems) return;
        
        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
            return;
        }

        cartItems.innerHTML = cart.map(item => {
            // Use image property or first image from image_paths array
            const imageUrl = item.image || (item.image_paths && item.image_paths.length > 0 ? item.image_paths[0] : null);
            const displayName = item.name || 'Product';
            const displayPrice = (item.price || 0).toFixed(2);
            
            return `
            <div class="cart-item">
                ${imageUrl ? `<img src="${imageUrl}" alt="${displayName}" class="cart-item-image" onerror="this.style.display='none'">` : '<div class="cart-item-image" style="background: #f5f5f5;"></div>'}
                <div class="cart-item-info">
                    <div class="cart-item-name">${displayName}</div>
                    <div class="cart-item-price">$${displayPrice}</div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.cartId})">Remove</button>
                </div>
            </div>
            `;
        }).join('');

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
        
        // Save cart to localStorage
        if (typeof saveCart === 'function') {
            saveCart();
        } else {
            localStorage.setItem('souffle_cart', JSON.stringify(cart));
        }
        
        // Update cart UI
        if (typeof updateCartUI === 'function') {
            updateCartUI();
        } else {
            const cartCount = document.getElementById('cartCount');
            if (cartCount) {
                cartCount.textContent = cart.length;
            }
        }
        
        // Re-render cart items
        renderCartItems();
    };
    
    // Cart toggle - ensure we override script.js listeners and use our version
    const cartBtn = document.getElementById('cartBtn');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    
    console.log('Setting up cart listeners:', { cartBtn, closeCart, cartOverlay });
    
    // Use our toggleCart function - override any existing listeners
    if (cartBtn) {
        // Remove old listeners by replacing with new handler
        cartBtn.onclick = null;
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Cart button clicked');
            toggleCart(e);
        }, true); // Use capture phase to ensure it runs first
    }
    
    if (closeCart) {
        closeCart.onclick = null;
        closeCart.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCart(e);
        }, true);
    }
    
    if (cartOverlay) {
        cartOverlay.onclick = null;
        cartOverlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCart(e);
        }, true);
    }
    
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

