// Form validation and submission for Create Listing page
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createListingForm');
    const imageInput = document.getElementById('imageInput');
    const uploadArea = document.getElementById('uploadArea');
    const uploadedImages = document.getElementById('uploadedImages');
    const submitBtn = document.getElementById('submitBtn');
    const productName = document.getElementById('productName');
    const length = document.getElementById('length');
    const width = document.getElementById('width');
    const height = document.getElementById('height');
    
    // Listing fields (always visible on this page)
    const productDescription = document.getElementById('productDescription');
    const price = document.getElementById('price');
    const listingImageInput = document.getElementById('listingImageInput');
    const listingImageArea = document.getElementById('listingImageArea');
    const listingImagePreview = document.getElementById('listingImagePreview');
    
    let uploadedFiles = [];
    let listingImageFile = null;

    // Main image upload area click handler
    uploadArea.addEventListener('click', () => {
        imageInput.click();
    });

    // Main image drag and drop handlers
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleFiles(files);
    });

    // Main image file input change handler
    imageInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
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

    // Handle main uploaded files
    function handleFiles(files) {
        files.forEach(file => {
            if (!uploadedFiles.find(f => f.name === file.name && f.size === file.size)) {
                uploadedFiles.push(file);
            }
        });
        displayUploadedImages();
        validateForm();
    }

    // Handle listing image
    function handleListingImage(file) {
        listingImageFile = file;
        displayListingImage();
        validateForm();
    }

    // Display main uploaded images
    function displayUploadedImages() {
        uploadedImages.innerHTML = '';
        
        if (uploadedFiles.length === 0) {
            return;
        }

        uploadedFiles.forEach((file, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'uploaded-image-item';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                uploadedFiles.splice(index, 1);
                URL.revokeObjectURL(img.src);
                displayUploadedImages();
                validateForm();
            };
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(removeBtn);
            uploadedImages.appendChild(imgContainer);
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

    // Validate form (always requires listing fields since this is always a listing)
    const validateForm = () => {
        const hasImages = uploadedFiles.length > 0;
        const hasProductName = productName.value.trim() !== '';
        const hasDescription = productDescription.value.trim() !== '';
        const hasPrice = price.value.trim() !== '' && parseFloat(price.value) > 0;
        const hasListingImage = listingImageFile !== null;
        const hasLength = length.value.trim() !== '' && parseFloat(length.value) > 0;
        const hasWidth = width.value.trim() !== '' && parseFloat(width.value) > 0;
        const hasHeight = height.value.trim() !== '' && parseFloat(height.value) > 0;
        
        const isValid = hasImages && hasProductName && hasDescription && hasPrice && hasListingImage && hasLength && hasWidth && hasHeight;
        
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
    productDescription.addEventListener('input', validateForm);
    price.addEventListener('input', validateForm);
    length.addEventListener('input', validateForm);
    width.addEventListener('input', validateForm);
    height.addEventListener('input', validateForm);

    // Convert file to base64 for storage
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Form submission (always saves as listing)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!submitBtn.disabled) {
            try {
                // Get all existing listings from localStorage
                const existingListings = JSON.parse(localStorage.getItem('souffle_listings') || '[]');
                
                // Convert listing image to base64 for storage
                const listingImageBase64 = listingImageFile ? await fileToBase64(listingImageFile) : null;
                
                // Create new listing object
                const newListing = {
                    id: Date.now(), // Use timestamp as ID
                    name: productName.value,
                    price: parseFloat(price.value),
                    description: productDescription.value,
                    image: listingImageBase64,
                    dimensions: {
                        length: parseFloat(length.value),
                        width: parseFloat(width.value),
                        height: parseFloat(height.value)
                    },
                    modelImages: [] // We'll store model images if needed later
                };
                
                // Add to listings array
                existingListings.push(newListing);
                
                // Save back to localStorage
                localStorage.setItem('souffle_listings', JSON.stringify(existingListings));
                
                // Show success message
                alert('Listing added to Marketplace!');
                
                // Redirect to marketplace
                window.location.href = 'index.html';
                
            } catch (error) {
                console.error('Error saving listing:', error);
                alert('Error saving listing. Please try again.');
            }
        }
    });
});

