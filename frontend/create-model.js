// Form validation and submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createModelForm');
    const imageInput = document.getElementById('imageInput');
    const uploadArea = document.getElementById('uploadArea');
    const uploadedImages = document.getElementById('uploadedImages');
    const submitBtn = document.getElementById('submitBtn');
    const productName = document.getElementById('productName');
    const length = document.getElementById('length');
    const width = document.getElementById('width');
    const height = document.getElementById('height');
    
    // Listing fields
    const isListingCheckbox = document.getElementById('isListing');
    const listingFields = document.getElementById('listingFields');
    const listingImageUploadSection = document.getElementById('listingImageUploadSection');
    const productDescription = document.getElementById('productDescription');
    const price = document.getElementById('price');
    
    // Listing image upload elements
    const listingImageInput = document.getElementById('listingImageInput');
    const listingImageArea = document.getElementById('listingImageArea');
    const listingImagePreview = document.getElementById('listingImagePreview');
    
    let uploadedFiles = [];
    let listingImageFile = null;

    // Checkbox handler - show/hide listing fields and listing image upload
    isListingCheckbox.addEventListener('change', () => {
        if (isListingCheckbox.checked) {
            listingFields.style.display = 'block';
            listingImageUploadSection.style.display = 'block';
            submitBtn.textContent = 'Add Listing';
        } else {
            listingFields.style.display = 'none';
            listingImageUploadSection.style.display = 'none';
            submitBtn.textContent = 'Add to 3D Space';
            // Clear listing-specific fields
            productDescription.value = '';
            price.value = '';
            // Clear listing image
            if (listingImageFile && listingImageFile.preview) {
                URL.revokeObjectURL(listingImageFile.preview);
            }
            listingImageFile = null;
            displayListingImage();
            listingImageInput.value = '';
            clearListingErrors();
        }
        validateForm();
    });

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

    referenceImagesArea.addEventListener('drop', (e) => {
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

    // Listing image upload button click handler
    listingUploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        listingImageInput.click();
    });

    // Listing image drag and drop handlers
    listingUploadArea.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        listingUploadArea.classList.add('is-dragging');
    });

    listingUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        listingUploadArea.classList.add('is-dragging');
    });

    listingUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!listingUploadArea.contains(e.relatedTarget)) {
            listingUploadArea.classList.remove('is-dragging');
        }
    });

    listingUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        listingUploadArea.classList.remove('is-dragging');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            handleListingImage(file);
        }
    });

    // Listing image file input change handler
    listingImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
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
        clearErrors();
    }

    // Show errors
    function showErrors(errors) {
        if (errors.length === 0) {
            uploadErrors.innerHTML = '';
            return;
        }
        
        uploadErrors.innerHTML = `
            <div class="file-upload-error">
                <svg class="file-upload-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <path d="M12 9v4"></path>
                    <path d="M12 17h.01"></path>
                </svg>
                <div class="file-upload-error-content">
                    <div class="file-upload-error-title">File upload error(s)</div>
                    <div class="file-upload-error-description">
                        ${errors.map(error => `<p>${error}</p>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Clear errors
    function clearErrors() {
        uploadErrors.innerHTML = '';
    }

    // Handle listing image
    function handleListingImage(file) {
        clearListingErrors();
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            showListingErrors(['File must be an image.']);
            return;
        }
        
        if (file.size > MAX_FILE_SIZE) {
            showListingErrors([`File exceeds the maximum size of ${formatBytes(MAX_FILE_SIZE)}.`]);
            return;
        }
        
        // Clear previous file and preview
        if (listingImageFile && listingImageFile.preview) {
            URL.revokeObjectURL(listingImageFile.preview);
        }
        
        listingImageFile = file;
        listingImageFile.preview = URL.createObjectURL(file);
        displayListingImage();
        validateForm();
        
        // Reset input
        listingImageInput.value = '';
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
            listingUploadPlaceholder.style.display = 'block';
            return;
        }
        
        listingUploadPlaceholder.style.display = 'none';
        
        const previewItem = document.createElement('div');
        previewItem.className = 'file-preview-item';
        
        const img = document.createElement('img');
        img.src = listingImageFile.preview;
        img.alt = listingImageFile.name;
        img.title = `${listingImageFile.name} (${formatBytes(listingImageFile.size)})`;
        previewItem.appendChild(img);
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-remove-btn';
        removeBtn.type = 'button';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            if (listingImageFile && listingImageFile.preview) {
                URL.revokeObjectURL(listingImageFile.preview);
            }
            listingImageFile = null;
            listingImageInput.value = '';
            displayListingImage();
            validateForm();
            clearListingErrors();
        };
        removeBtn.innerHTML = `
            <svg class="file-remove-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        previewItem.appendChild(removeBtn);
        
        listingFilePreviewContainer.appendChild(previewItem);
    }

    // Show listing errors
    function showListingErrors(errors) {
        if (!listingUploadErrors || errors.length === 0) {
            if (listingUploadErrors) {
                listingUploadErrors.innerHTML = '';
            }
            return;
        }
        
        listingUploadErrors.innerHTML = `
            <div class="file-upload-error">
                <svg class="file-upload-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <path d="M12 9v4"></path>
                    <path d="M12 17h.01"></path>
                </svg>
                <div class="file-upload-error-content">
                    <div class="file-upload-error-title">File upload error(s)</div>
                    <div class="file-upload-error-description">
                        ${errors.map(error => `<p>${error}</p>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Clear listing errors
    function clearListingErrors() {
        if (listingUploadErrors) {
            listingUploadErrors.innerHTML = '';
        }
    }

    // Display main uploaded images
    function displayUploadedImages() {
        // Clear previous previews and revoke URLs
        if (filePreviewContainer) {
            filePreviewContainer.querySelectorAll('.file-preview-item').forEach(item => {
                const img = item.querySelector('img');
                if (img && img.src.startsWith('blob:')) {
                    URL.revokeObjectURL(img.src);
                }
            });
        }
        
        if (!filePreviewContainer || !uploadPlaceholder || !fileCount || !fileCountText) {
            return;
        }
        
        filePreviewContainer.innerHTML = '';
        
        if (uploadedFiles.length === 0) {
            uploadPlaceholder.style.display = 'block';
            fileCount.style.display = 'none';
            return;
        }
        
        uploadPlaceholder.style.display = 'none';
        fileCount.style.display = 'block';
        fileCountText.textContent = uploadedFiles.length;
        
        uploadedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item';
            
            // Create preview
            if (file.type.startsWith('image/')) {
                const preview = URL.createObjectURL(file);
                file.preview = preview;
                
                const img = document.createElement('img');
                img.src = preview;
                img.alt = file.name;
                img.title = `${file.name} (${formatBytes(file.size)})`;
                previewItem.appendChild(img);
            } else {
                const fileIcon = document.createElement('svg');
                fileIcon.className = 'file-icon';
                fileIcon.setAttribute('viewBox', '0 0 24 24');
                fileIcon.setAttribute('fill', 'none');
                fileIcon.setAttribute('stroke', 'currentColor');
                fileIcon.setAttribute('stroke-width', '2');
                fileIcon.setAttribute('stroke-linecap', 'round');
                fileIcon.setAttribute('stroke-linejoin', 'round');
                fileIcon.innerHTML = '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline>';
                previewItem.appendChild(fileIcon);
                previewItem.title = `${file.name} (${formatBytes(file.size)})`;
            }
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'file-remove-btn';
            removeBtn.type = 'button';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeFile(index);
            };
            removeBtn.innerHTML = `
                <svg class="file-remove-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
            previewItem.appendChild(removeBtn);
            
            filePreviewContainer.appendChild(previewItem);
        });
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
    
    // Initial validation and display
    displayUploadedImages();
    displayListingImage();
    validateForm();

    // Input event listeners for validation
    productName.addEventListener('input', validateForm);
    length.addEventListener('input', validateForm);
    width.addEventListener('input', validateForm);
    height.addEventListener('input', validateForm);
    productDescription.addEventListener('input', validateForm);
    
    // Price input validation - limit to dollars and cents (XX.XX format)
    price.addEventListener('input', (e) => {
        let value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        
        // Remove any non-digit or non-decimal characters
        const cleanedValue = value.replace(/[^\d.]/g, '');
        
        // Allow only one decimal point
        const parts = cleanedValue.split('.');
        let newValue = cleanedValue;
        
        if (parts.length > 2) {
            // Multiple decimal points - keep only the first one
            newValue = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limit to 2 decimal places after the decimal point
        if (parts.length === 2 && parts[1].length > 2) {
            newValue = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        // Only update if value changed
        if (newValue !== value) {
            e.target.value = newValue;
            // Adjust cursor position
            const newCursorPos = Math.min(cursorPosition, newValue.length);
            e.target.setSelectionRange(newCursorPos, newCursorPos);
        }
        
        validateForm();
    });
    
    // Prevent typing more than 2 decimal places
    price.addEventListener('keydown', (e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        
        // Check if there's already a decimal point and 2 digits after it
        const decimalIndex = value.indexOf('.');
        if (decimalIndex !== -1) {
            const afterDecimal = value.substring(decimalIndex + 1);
            // If we have 2 digits after decimal and cursor is after the last digit
            if (afterDecimal.length >= 2 && cursorPosition > decimalIndex + 2) {
                // Allow backspace, delete, arrow keys, tab, and control keys
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'];
                if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                }
            }
        }
    });
    
    // Prevent scroll wheel from changing number input values
    const numberInputs = [price, length, width, height];
    numberInputs.forEach(input => {
        if (input) {
            input.addEventListener('wheel', (e) => {
                // Prevent default scroll behavior on number inputs
                if (document.activeElement === input) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    });

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
                const response = await fetch('http://localhost:8080/create-product', {
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
