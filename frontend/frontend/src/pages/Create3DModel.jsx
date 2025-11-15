import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductsContext';

const Create3DModel = () => {
  const navigate = useNavigate();
  const { refreshProducts } = useProducts();
  const [isListing, setIsListing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create FormData for backend
      const formDataToSend = new FormData();
      
      // Add reference images (for 3D model generation)
      // Using the same images for both display and reference
      uploadedFiles.forEach((file) => {
        formDataToSend.append('referenceImages', file);
        formDataToSend.append('displayImages', file);
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

      // Send to backend
      const response = await fetch('http://localhost:5000/create-product', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create product');
      }

      // Success - refresh products and navigate
      if (isListing) {
        // For listings, also save to localStorage for backward compatibility
        const listing = {
          id: result.product_id,
          name: formData.productName,
          price: formData.price,
          description: formData.description,
          dimensions: {
            length: formData.length,
            width: formData.width,
            height: formData.height,
          },
          image: listingImage
            ? URL.createObjectURL(listingImage)
            : null,
        };

        const savedListings =
          JSON.parse(localStorage.getItem('souffle_listings') || '[]') || [];
        savedListings.push(listing);
        localStorage.setItem('souffle_listings', JSON.stringify(savedListings));
      }

      refreshProducts();
      
      // Show success message
      alert(
        isListing
          ? 'Listing created! 3D model is being generated...'
          : '3D model is being generated...'
      );
      
      // Navigate to home page
      navigate('/');
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err.message || 'Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    if (!formData.productName || !formData.length || !formData.width || !formData.height) {
      return false;
    }
    if (isListing && (!formData.description || !formData.price)) {
      return false;
    }
    if (uploadedFiles.length === 0) {
      return false;
    }
    return true;
  };

  return (
    <main className="main create-model-main">
      <div className="container">
        <div className="create-model-container">
          <h2 className="page-title">CREATE 3D MODEL</h2>
          <p className="page-subtitle">
            Upload images and provide details to generate your 3D model
          </p>

          {error && (
            <div style={{ 
              padding: '12px', 
              marginBottom: '20px', 
              backgroundColor: '#fee', 
              color: '#c33', 
              borderRadius: '4px' 
            }}>
              {error}
            </div>
          )}

          <div className="create-model-layout">
            <div className="upload-side">
              <div className="upload-section">
                <label className="form-label">Upload Images</label>
                <p className="upload-hint">
                  More angles will result in better model generation
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    setUploadedFiles(Array.from(e.target.files || []))
                  }
                  disabled={isSubmitting}
                />
                {uploadedFiles.length > 0 && (
                  <p>{uploadedFiles.length} file(s) selected</p>
                )}
              </div>

              {isListing && (
                <div className="upload-section">
                  <label className="form-label">Product Listing Image</label>
                  <p className="upload-hint">Main image for your listing</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setListingImage(e.target.files?.[0])}
                    disabled={isSubmitting}
                  />
                  {listingImage && (
                    <img
                      src={URL.createObjectURL(listingImage)}
                      alt="Listing preview"
                      style={{ maxWidth: '200px', marginTop: '10px' }}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="form-side">
              <form className="create-model-form" onSubmit={handleSubmit}>
                {/* ... existing form fields ... */}
                <div className="form-section">
                  <label className="form-label">Product Information</label>
                  <div className="checkbox-wrapper">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={isListing}
                        onChange={(e) => setIsListing(e.target.checked)}
                        disabled={isSubmitting}
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
                    value={formData.productName}
                    onChange={(e) =>
                      setFormData({ ...formData, productName: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {isListing && (
                  <div className="form-section" id="listingFields">
                    <label className="input-label">Product Description</label>
                    <textarea
                      className="form-textarea"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      required={isListing}
                      disabled={isSubmitting}
                    />
                    <label className="input-label">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input price-group"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      required={isListing}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                <div className="form-section dimensions-group">
                  <label className="input-label">Dimensions (CM)</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="form-group">
                      <label className="input-label">Length</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.length}
                        onChange={(e) =>
                          setFormData({ ...formData, length: e.target.value })
                        }
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Width</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.width}
                        onChange={(e) =>
                          setFormData({ ...formData, width: e.target.value })
                        }
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Height</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.height}
                        onChange={(e) =>
                          setFormData({ ...formData, height: e.target.value })
                        }
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className={`submit-btn ${validateForm() && !isSubmitting ? 'enabled' : ''}`}
                    disabled={!validateForm() || isSubmitting}
                  >
                    {isSubmitting
                      ? 'Processing...'
                      : isListing
                      ? 'Add Listing'
                      : 'Add to 3D Space'}
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