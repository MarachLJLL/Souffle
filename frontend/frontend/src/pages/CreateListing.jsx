import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductsContext';

const CreateListing = () => {
  const navigate = useNavigate();
  const { refreshProducts } = useProducts();
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const listing = {
      id: Date.now(),
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

    refreshProducts();
    navigate('/');
  };

  const validateForm = () => {
    return (
      formData.productName &&
      formData.length &&
      formData.width &&
      formData.height &&
      formData.description &&
      formData.price
    );
  };

  return (
    <main className="main create-model-main">
      <div className="container">
        <div className="create-model-container">
          <h2 className="page-title">CREATE LISTING</h2>
          <p className="page-subtitle">
            Upload images and provide details to create your listing
          </p>

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
                />
                {uploadedFiles.length > 0 && (
                  <p>{uploadedFiles.length} file(s) selected</p>
                )}
              </div>

              <div className="upload-section">
                <label className="form-label">Product Listing Image</label>
                <p className="upload-hint">Main image for your listing</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setListingImage(e.target.files?.[0])}
                  required
                />
                {listingImage && (
                  <img
                    src={URL.createObjectURL(listingImage)}
                    alt="Listing preview"
                    style={{ maxWidth: '200px', marginTop: '10px' }}
                  />
                )}
              </div>
            </div>

            <div className="form-side">
              <form className="create-model-form" onSubmit={handleSubmit}>
                <div className="form-section">
                  <label className="form-label">Product Information</label>
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
                  />
                </div>

                <div className="form-section">
                  <label className="input-label">Product Description</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
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
                    required
                  />
                </div>

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
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className={`submit-btn ${validateForm() ? 'enabled' : ''}`}
                    disabled={!validateForm()}
                  >
                    Add Listing
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

export default CreateListing;

