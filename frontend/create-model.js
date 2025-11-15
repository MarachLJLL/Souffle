// Form validation and submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createModelForm');
    
    // Display images (for product page)
    const displayImagesInput = document.getElementById('displayImagesInput');
    const displayImagesArea = document.getElementById('displayImagesArea');
    const displayImagesPreview = document.getElementById('displayImagesPreview');
    
    // Reference images (for 3D model generation)
    const referenceImagesInput = document.getElementById('referenceImagesInput');
    const referenceImagesArea = document.getElementById('referenceImagesArea');
    const referenceImagesPreview = document.getElementById('referenceImagesPreview');
    
    const submitBtn = document.getElementById('submitBtn');
    const productName = document.getElementById('productName');
    const length = document.getElementById('length');
    const width = document.getElementById('width');
    const height = document.getElementById('height');
    
    // Listing fields
    const isListingCheckbox = document.getElementById('isListing');
    const listingFields = document.getElementById('listingFields');
    const productDescription = document.getElementById('productDescription');
    const price = document.getElementById('price');
    const listingImageInput = document.getElementById('listingImageInput');
    const listingImageArea = document.getElementById('listingImageArea');
    const listingImagePreview = document.getElementById('listingImagePreview');
    
    let displayImages = [];
    let referenceImages = [];
    let listingImageFile = null;

    // Checkbox handler - show/hide listing fields
    isListingCheckbox.addEventListener('change', () => {
        if (isListingCheckbox.checked) {
            listingFields.style.display = 'block';
            submitBtn.textContent = 'Add Listing';
        } else {
            listingFields.style.display = 'none';
            submitBtn.textContent = 'Add to 3D Space';
            // Clear listing-specific fields
            productDescription.value = '';
            price.value = '';
            listingImageFile = null;
            listingImagePreview.innerHTML = '';
            listingImageInput.value = '';
        }
        validateForm();
    });

    // Display images upload area click handler
    displayImagesArea.addEventListener('click', () => {
        displayImagesInput.click();
    });

    // Display images drag and drop handlers
    displayImagesArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        displayImagesArea.classList.add('drag-over');
    });

    displayImagesArea.addEventListener('dragleave', () => {
        displayImagesArea.classList.remove('drag-over');
    });

    displayImagesArea.addEventListener('drop', (e) => {
        e.preventDefault();
        displayImagesArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleDisplayImages(files);
    });

    // Display images file input change handler
    displayImagesInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleDisplayImages(files);
    });

    // Reference images upload area click handler
    referenceImagesArea.addEventListener('click', () => {
        referenceImagesInput.click();
    });

    // Reference images drag and drop handlers
    referenceImagesArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        referenceImagesArea.classList.add('drag-over');
    });

    referenceImagesArea.addEventListener('dragleave', () => {
        referenceImagesArea.classList.remove('drag-over');
    });

    referenceImagesArea.addEventListener('drop', (e) => {
        e.preventDefault();
        referenceImagesArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleReferenceImages(files);
    });

    // Reference images file input change handler
    referenceImagesInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleReferenceImages(files);
    });

    // Listing image upload area click handler
    listingImageArea.addEventListener('click', () => {
        listingImageInput.click();
    });

    // Listing image drag and drop handlers
    listingImageArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        listingImageArea.classList.add('drag-over');
    });

    listingImageArea.addEventListener('dragleave', () => {
        listingImageArea.classList.remove('drag-over');
    });

    listingImageArea.addEventListener('drop', (e) => {
        e.preventDefault();
        listingImageArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            handleListingImage(files[0]);
        }
    });

    // Listing image file input change handler
    listingImageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleListingImage(e.target.files[0]);
        }
    });

    // Handle display images (for product page)
    function handleDisplayImages(files) {
        files.forEach(file => {
            if (!displayImages.find(f => f.name === file.name && f.size === file.size)) {
                displayImages.push(file);
            }
        });
        displayImagePreview(displayImages, displayImagesPreview, 'displayImages');
        validateForm();
    }

    // Handle reference images (for 3D model)
    function handleReferenceImages(files) {
        files.forEach(file => {
            if (!referenceImages.find(f => f.name === file.name && f.size === file.size)) {
                referenceImages.push(file);
            }
        });
        displayImagePreview(referenceImages, referenceImagesPreview, 'referenceImages');
        validateForm();
    }

    // Handle listing image
    function handleListingImage(file) {
        listingImageFile = file;
        displayListingImage();
        validateForm();
    }

    // Generic function to display uploaded images
    function displayImagePreview(imageArray, container, arrayName) {
        container.innerHTML = '';
        
        if (imageArray.length === 0) {
            return;
        }

        imageArray.forEach((file, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'uploaded-image-item';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                const targetArray = arrayName === 'displayImages' ? displayImages : referenceImages;
                targetArray.splice(index, 1);
                URL.revokeObjectURL(img.src);
                displayImagePreview(targetArray, container, arrayName);
                validateForm();
            };
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(removeBtn);
            container.appendChild(imgContainer);
        });
    }

    // Display listing image
    function displayListingImage() {
        listingImagePreview.innerHTML = '';
        
        if (!listingImageFile) {
            return;
        }

        const imgContainer = document.createElement('div');
        imgContainer.className = 'uploaded-image-item';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(listingImageFile);
        img.alt = listingImageFile.name;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            URL.revokeObjectURL(img.src);
            listingImageFile = null;
            listingImagePreview.innerHTML = '';
            listingImageInput.value = '';
            validateForm();
        };
        
        imgContainer.appendChild(img);
        imgContainer.appendChild(removeBtn);
        listingImagePreview.appendChild(imgContainer);
    }

    // Validate form
    const validateForm = () => {
        // Reference images are required for 3D model generation
        const hasReferenceImages = referenceImages.length > 0;
        const hasProductName = productName.value.trim() !== '';
        const hasLength = length.value.trim() !== '' && parseFloat(length.value) > 0;
        const hasWidth = width.value.trim() !== '' && parseFloat(width.value) > 0;
        const hasHeight = height.value.trim() !== '' && parseFloat(height.value) > 0;
        
        let isValid = hasReferenceImages && hasProductName && hasLength && hasWidth && hasHeight;
        
        // If listing is checked, validate listing fields
        if (isListingCheckbox.checked) {
            const hasDescription = productDescription.value.trim() !== '';
            const hasPrice = price.value.trim() !== '' && parseFloat(price.value) > 0;
            const hasListingImage = listingImageFile !== null;
            isValid = isValid && hasDescription && hasPrice && hasListingImage;
        }
        
        submitBtn.disabled = !isValid;
        
        if (isValid) {
            submitBtn.classList.add('enabled');
        } else {
            submitBtn.classList.remove('enabled');
        }
    };
    
    // Initial validation
    validateForm();

    // Input event listeners for validation
    productName.addEventListener('input', validateForm);
    length.addEventListener('input', validateForm);
    width.addEventListener('input', validateForm);
    height.addEventListener('input', validateForm);
    productDescription.addEventListener('input', validateForm);
    price.addEventListener('input', validateForm);

    // Convert file to base64 for storage
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!submitBtn.disabled) {
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';
                
                // Create FormData to send to backend
                const formData = new FormData();
                
                // Add display images (for product page)
                displayImages.forEach((file) => {
                    formData.append('displayImages', file);
                });
                
                // Add reference images (for 3D model generation)
                referenceImages.forEach((file) => {
                    formData.append('referenceImages', file);
                });
                
                // Add product information
                formData.append('productName', productName.value);
                formData.append('length', length.value);
                formData.append('width', width.value);
                formData.append('height', height.value);
                
                // Add listing-specific data if it's a listing
                const isListing = isListingCheckbox.checked;
                formData.append('isListing', isListing);
                
                if (isListing) {
                    formData.append('description', productDescription.value);
                    formData.append('price', price.value);
                    if (listingImageFile) {
                        formData.append('listingImage', listingImageFile);
                    }
                }
                
                // Send to backend
                const response = await fetch('http://localhost:5000/create-product', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert(isListing ? 'Listing created! 3D model is being generated...' : '3D model is being generated...');
                    
                    // Reset form
                    form.reset();
                    displayImages = [];
                    referenceImages = [];
                    listingImageFile = null;
                    displayImagesPreview.innerHTML = '';
                    referenceImagesPreview.innerHTML = '';
                    listingImagePreview.innerHTML = '';
                    isListingCheckbox.checked = false;
                    listingFields.style.display = 'none';
                    submitBtn.textContent = 'Add to 3D Space';
                    validateForm();
                    
                    // Optionally redirect
                    if (isListing) {
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 2000);
                    }
                } else {
                    alert(`Error: ${result.error || 'Failed to create product'}`);
                    submitBtn.disabled = false;
                    submitBtn.textContent = isListing ? 'Add Listing' : 'Add to 3D Space';
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('Error submitting form. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = isListingCheckbox.checked ? 'Add Listing' : 'Add to 3D Space';
            }
        }
    });
});
