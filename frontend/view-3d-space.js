// View 3D Space page functionality
document.addEventListener('DOMContentLoaded', () => {
    const productsSelection = document.getElementById('productsSelection');
    const view3DBtn = document.getElementById('view3DBtn');
    let selectedProducts = new Set();
    
    // Load products - only show 6 example products
    function loadProducts() {
        // Only 6 example products with images
        return [
            { id: 1, name: "Candle holder 04", image: "../assets/products/vase.png" },
            { id: 2, name: "Candle Holder Shadow", image: "../assets/products/vase2.png" },
            { id: 3, name: "Super Combo Set 03", image: "../assets/products/cat_tree.png" },
            { id: 4, name: "Tree", image: "../assets/products/egg.png" },
            { id: 5, name: "Secret Garden", image: "../assets/products/vase2.png" },
            { id: 6, name: "Apple", image: "../assets/products/vase.png" }
        ];
    }
    
    // Render products with checkboxes
    function renderProducts() {
        const products = loadProducts();
        productsSelection.innerHTML = '';
        
        if (products.length === 0) {
            productsSelection.innerHTML = '<p class="no-products">No products available</p>';
            return;
        }
        
        const productsGrid = document.createElement('div');
        productsGrid.className = 'products-selection-grid';
        
        products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-selection-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `product-${product.id}`;
            checkbox.className = 'product-checkbox';
            checkbox.value = product.id;
            checkbox.addEventListener('change', handleProductToggle);
            
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'product-selection-image-wrapper';
            const img = document.createElement('img');
            img.src = product.image;
            img.alt = product.name;
            img.className = 'product-selection-image';
            img.onerror = function() {
                this.style.display = 'none';
            };
            imageWrapper.appendChild(img);
            
            const label = document.createElement('label');
            label.htmlFor = `product-${product.id}`;
            label.className = 'product-selection-label';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'product-selection-name';
            nameSpan.textContent = product.name;
            
            label.appendChild(nameSpan);
            
            productItem.appendChild(checkbox);
            productItem.appendChild(imageWrapper);
            productItem.appendChild(label);
            
            // Make entire item clickable
            productItem.addEventListener('click', (e) => {
                // Don't toggle if clicking directly on checkbox (to avoid double toggle)
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    handleProductToggle({ target: checkbox });
                }
            });
            
            productsGrid.appendChild(productItem);
        });
        
        productsSelection.appendChild(productsGrid);
    }
    
    // Handle product selection toggle
    function handleProductToggle(event) {
        const productId = parseInt(event.target.value);
        
        if (event.target.checked) {
            selectedProducts.add(productId);
        } else {
            selectedProducts.delete(productId);
        }
        
        updateViewButton();
    }
    
    // Update view button state
    function updateViewButton() {
        const hasSelection = selectedProducts.size > 0;
        view3DBtn.disabled = !hasSelection;
        
        if (hasSelection) {
            view3DBtn.classList.add('enabled');
        } else {
            view3DBtn.classList.remove('enabled');
        }
    }
    
    // Handle view 3D space button click
    view3DBtn.addEventListener('click', () => {
        if (selectedProducts.size > 0) {
            // Store selected products for the 3D viewer
            const selectedProductsArray = Array.from(selectedProducts);
            localStorage.setItem('souffle_selected_products', JSON.stringify(selectedProductsArray));
            
            // Navigate to 3D viewer (you can create this page later)
            alert(`Viewing ${selectedProducts.size} product(s) in 3D space!`);
            // window.location.href = '3d-viewer.html'; // Uncomment when you create the 3D viewer page
        }
    });
    
    // Initialize
    renderProducts();
    updateViewButton();
});

