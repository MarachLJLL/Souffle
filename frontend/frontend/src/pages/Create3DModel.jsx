import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductsContext';

const Create3DModel = () => {
  const navigate = useNavigate();
  const { refreshProducts } = useProducts();
  const [isListing, setIsListing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    productName: '',
    length: '',
    width: '',
    height: '',
    description: '',
    price: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [listingImage, setListingImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const listingImageInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Validate that we have at least one image
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one image for 3D model generation.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create FormData to send to backend
      const formDataToSend = new FormData();

      // Use all uploaded files as both display images and reference images
      // Display images are for the product page, reference images are for 3D model generation
      uploadedFiles.forEach((file) => {
        formDataToSend.append('displayImages', file);
        formDataToSend.append('referenceImages', file);
      });

      // Add product information
      formDataToSend.append('productName', formData.productName);
      formDataToSend.append('length', formData.length);
      formDataToSend.append('width', formData.width);
      formDataToSend.append('height', formData.height);
      formDataToSend.append('isListing', isListing.toString());

      // Add listing-specific data if it's a listing
      if (isListing) {
        formDataToSend.append('description', formData.description);
        formDataToSend.append('price', formData.price);
        if (listingImage) {
          formDataToSend.append('listingImage', listingImage);
        }
      }

      // Send to backend API
      const response = await fetch('http://localhost:8080/create-product', {
        method: 'POST',
        body: formDataToSend,
      });

      // Check if response is OK
      if (!response.ok) {
        // Try to parse error response
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details?.error || errorMessage;
            console.error('Backend error:', errorData);
          } else {
            // If not JSON, try to get text
            const errorText = await response.text();
            console.error('Backend error (non-JSON):', errorText);
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          // Use default error message
        }
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Parse successful response
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        setError('Received invalid response from server. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success - refresh products and navigate
      await refreshProducts();
      
      // Show success message
      alert(
        isListing
          ? 'Listing created! 3D model is being generated...'
          : '3D model is being generated...'
      );

      // Reset form
      setFormData({
        productName: '',
        length: '',
        width: '',
        height: '',
        description: '',
        price: '',
      });
      setUploadedFiles([]);
      setListingImage(null);
      setIsListing(false);

      // Navigate to marketplace
      navigate('/');
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Error submitting form. Please try again.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error: Could not connect to backend server. Please ensure the backend is running on port 8080.';
      } else if (error.name === 'TypeError') {
        errorMessage = `Network error: ${error.message}`;
      } else {
        errorMessage = `Error: ${error.message || error.toString()}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.productName || !formData.length || !formData.width || !formData.height) {
      return false;
    }
    if (isListing && (!formData.description || !formData.price)) {
      return false;
    }
    return true;
  };

  const handleFileSelect = (files) => {
    setUploadedFiles(Array.from(files || []));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleListingImageDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setListingImage(file);
    }
  };

  return (
    <main className="main create-model-main">
      <div className="container">
        <div className="create-model-container">
          <div className="create-model-header">
            <h2 className="page-title">CREATE 3D MODEL</h2>
            <p className="page-subtitle">
              Upload images from multiple angles and provide product details to generate your 3D model
            </p>
          </div>

          <div className="create-model-layout">
            <div className="upload-side">
              <div className="upload-section">
                <label className="form-label">Upload Images</label>
                <p className="upload-hint">
                  Drag and drop images or click to browse. More angles result in better model quality.
                </p>
                <div
                  className={`file-upload-area ${isDragging ? 'is-dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    style={{ display: 'none' }}
                  />
                  <div className="file-upload-content">
                    {uploadedFiles.length > 0 ? (
                      <div className="file-preview-container">
                        {uploadedFiles.slice(0, 5).map((file, index) => (
                          <div key={index} className="file-preview-item">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                            />
                          </div>
                        ))}
                        {uploadedFiles.length > 5 && (
                          <div className="file-count">+{uploadedFiles.length - 5}</div>
                        )}
                      </div>
                    ) : (
                      <div className="file-upload-placeholder">
                        <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="17 8 12 3 7 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="12" y1="3" x2="12" y2="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Drag images here or click to select</span>
                      </div>
                    )}
                    <button type="button" className="file-upload-btn">
                      <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {uploadedFiles.length > 0 ? 'Change' : 'Select Files'}
                    </button>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="file-count-badge">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected</div>
                  )}
                </div>
              </div>

              {isListing && (
                <div className="upload-section">
                  <label className="form-label">Product Listing Image</label>
                  <p className="upload-hint">Main image displayed in your listing</p>
                  <div
                    className="listing-image-upload"
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={handleListingImageDrop}
                    onClick={() => listingImageInputRef.current?.click()}
                  >
                    <input
                      ref={listingImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setListingImage(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                    {listingImage ? (
                      <div className="listing-image-preview">
                        <img
                          src={URL.createObjectURL(listingImage)}
                          alt="Listing preview"
                          onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                        />
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setListingImage(null);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="listing-image-placeholder">
                        <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="17 8 12 3 7 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="12" y1="3" x2="12" y2="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Click to upload listing image</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="form-side">
              <form className="create-model-form" onSubmit={handleSubmit}>
                <div className="form-section">
                  <label className="form-label">Product Information</label>
                  <div className="checkbox-wrapper">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={isListing}
                        onChange={(e) => setIsListing(e.target.checked)}
                      />
                      <span className="checkbox-label">This is a listing</span>
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <label className="input-label">Product Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter product name"
                    value={formData.productName}
                    onChange={(e) =>
                      setFormData({ ...formData, productName: e.target.value })
                    }
                    required
                  />
                </div>

                {isListing && (
                  <div className="form-section listing-fields" id="listingFields">
                    <label className="input-label">Product Description</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Describe your product..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      required={isListing}
                    />
                    <label className="input-label">Price ($)</label>
                    <div className="price-input-wrapper">
                      <span className="price-prefix">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input price-input"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        required={isListing}
                      />
                    </div>
                  </div>
                )}

                <div className="form-section dimensions-group">
                  <label className="input-label">Dimensions (CM)</label>
                  <div className="dimensions-row">
                    <div className="dimension-input">
                      <label className="dimension-label">Length</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        step="0.1"
                        value={formData.length}
                        onChange={(e) =>
                          setFormData({ ...formData, length: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="dimension-input">
                      <label className="dimension-label">Width</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        step="0.1"
                        value={formData.width}
                        onChange={(e) =>
                          setFormData({ ...formData, width: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="dimension-input">
                      <label className="dimension-label">Height</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        step="0.1"
                        value={formData.height}
                        onChange={(e) =>
                          setFormData({ ...formData, height: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="form-error" style={{ 
                    color: '#ff4444', 
                    padding: '12px', 
                    backgroundColor: '#ffe6e6', 
                    borderRadius: '4px',
                    marginBottom: '16px'
                  }}>
                    {error}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="submit"
                    className={`submit-btn ${validateForm() && !isLoading && uploadedFiles.length > 0 ? 'enabled' : 'disabled'}`}
                    disabled={!validateForm() || isLoading || uploadedFiles.length === 0}
                  >
                    {isLoading
                      ? 'Processing...'
                      : isListing
                      ? 'Create Listing'
                      : 'Generate 3D Model'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Create3DModel;

