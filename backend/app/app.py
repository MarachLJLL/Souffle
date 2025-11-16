import os
import threading
import json
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pipeline import (
    create_3d_model_from_images, 
    create_3d_model_from_text, 
    poll_and_update_job_status,
    MeshyApiException
)

app = Flask(__name__)
CORS(app)

# --- Directory Setup ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
JOBS_DIR = os.path.join(BASE_DIR, 'jobs')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
DATABASE_DIR = os.path.join(PROJECT_ROOT, 'database')
IMAGES_DIR = os.path.join(DATABASE_DIR, 'images')
GLBS_DIR = os.path.join(DATABASE_DIR, 'glbs')
PRODUCTS_JSON = os.path.join(DATABASE_DIR, 'products.json')
VIEWER_JSON = os.path.join(DATABASE_DIR, '3Dviewer.json')

os.makedirs(JOBS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(GLBS_DIR, exist_ok=True)

# --- Job Management ---

def get_next_job_id():
    """Finds the next available integer ID for a job."""
    try:
        existing_ids = [int(f.split('.')[0]) for f in os.listdir(JOBS_DIR) if f.endswith('.json')]
        return (max(existing_ids) + 1) if existing_ids else 1
    except (ValueError, FileNotFoundError):
        return 1

def start_polling_thread(job_data):
    """Starts a background polling thread for a given job."""
    local_id = job_data['local_id']
    meshy_task_id = job_data['meshy_task_id']
    json_path = os.path.join(JOBS_DIR, f"{local_id}.json")
    glb_save_path = os.path.join(MODELS_DIR, f"{local_id}.glb")
    
    # Use database/glbs path if this is a product job
    if job_data.get('is_product'):
        glb_save_path = os.path.join(GLBS_DIR, f"{job_data.get('product_id', local_id)}.glb")
    
    thread = threading.Thread(
        target=poll_and_update_job_status,
        args=(meshy_task_id, json_path, glb_save_path, job_data.get('is_product'), job_data.get('product_id'))
    )
    thread.daemon = True
    thread.start()
    print(f"Restarted polling thread for orphaned job #{local_id}")

def revive_pending_jobs():
    """Scans for PENDING jobs on startup and restarts their polling threads."""
    print("--- Reviving any pending jobs on startup... ---")
    for filename in os.listdir(JOBS_DIR):
        if filename.endswith('.json'):
            json_path = os.path.join(JOBS_DIR, filename)
            try:
                with open(json_path, 'r') as f:
                    job_data = json.load(f)
                    if job_data.get('status') == 'PENDING':
                        start_polling_thread(job_data)
            except Exception as e:
                print(f"Error reading job file {filename}: {e}")
    print("--- Revival process complete. ---")


# --- API Endpoints ---

@app.post("/create-job")
def create_job_route():
    images = request.files.getlist('images')
    prompt = request.form.get('prompt', '').strip()

    try:
        meshy_task_id = None
        if images:
            meshy_task_id = create_3d_model_from_images(images, prompt)
        elif prompt:
            meshy_task_id = create_3d_model_from_text(prompt)
        else:
            return jsonify({"error": "You must provide either images or a text prompt."}), 400
        
        local_id = get_next_job_id()
        job_data = {
            "local_id": local_id,
            "meshy_task_id": meshy_task_id,
            "prompt": prompt,
            "status": "PENDING", # Initial status
            "status_meshy": "PENDING",
            "progress": 0,
            "created_at": int(time.time()),
            "error_message": None
        }

        # Write the initial job metadata file
        json_path = os.path.join(JOBS_DIR, f"{local_id}.json")
        with open(json_path, 'w') as f:
            json.dump(job_data, f, indent=4)
        
        # Start the background polling
        start_polling_thread(job_data)
        
        return jsonify(job_data), 202

    except MeshyApiException as e:
        return jsonify({"error": e.args[0], "details": e.details}), e.status_code

@app.get("/jobs")
def get_all_jobs():
    """Reads all job .json files and returns them as a list."""
    all_jobs = []
    for filename in sorted(os.listdir(JOBS_DIR), reverse=True): # Show newest first
        if filename.endswith('.json'):
            try:
                with open(os.path.join(JOBS_DIR, filename), 'r') as f:
                    all_jobs.append(json.load(f))
            except Exception as e:
                print(f"Error reading job file {filename}: {e}")
    return jsonify(all_jobs)

@app.get("/download/<int:job_id>")
def download_file(job_id):
    """Serves the specified .glb file from the 'models' directory."""
    try:
        return send_from_directory(
            MODELS_DIR, f"{job_id}.glb", as_attachment=True
        )
    except FileNotFoundError:
        return jsonify({"error": "File not found."}), 404

def get_next_product_id():
    """Gets the next available product ID from products.json."""
    try:
        if os.path.exists(PRODUCTS_JSON):
            with open(PRODUCTS_JSON, 'r') as f:
                products = json.load(f)
                if products:
                    max_id = max(product.get('id', 0) for product in products)
                    return max_id + 1
        return 1
    except Exception as e:
        print(f"Error getting next product ID: {e}")
        return 1

def update_products_json(product_data):
    """Adds or updates a product in products.json."""
    try:
        if os.path.exists(PRODUCTS_JSON):
            with open(PRODUCTS_JSON, 'r') as f:
                products = json.load(f)
        else:
            products = []
        
        # Check if product with this ID already exists
        product_id = product_data['id']
        existing_index = next((i for i, p in enumerate(products) if p.get('id') == product_id), None)
        
        if existing_index is not None:
            products[existing_index] = product_data
        else:
            products.append(product_data)
        
        with open(PRODUCTS_JSON, 'w') as f:
            json.dump(products, f, indent=4)
        
        print(f"Updated products.json with product ID {product_id}")
    except Exception as e:
        print(f"Error updating products.json: {e}")


# --- 3D Viewer ID Management ---

def _load_viewer_ids():
    """Load the list of product IDs used by the 3D viewer."""
    try:
        if not os.path.exists(VIEWER_JSON):
            return []
        with open(VIEWER_JSON, "r") as f:
            raw = f.read().strip()
            if not raw:
                return []
            data = json.loads(raw)
            if isinstance(data, list):
                ids = []
                for x in data:
                    try:
                        val = int(x)
                        if val > 0:
                            ids.append(val)
                    except (TypeError, ValueError):
                        continue
                return ids
        return []
    except Exception as e:
        print(f"Error reading 3Dviewer.json: {e}")
        return []


def _save_viewer_ids(ids):
    """Save a de-duplicated list of product IDs to 3Dviewer.json."""
    try:
        unique_ids = sorted(set(int(x) for x in ids if isinstance(x, (int, float, str)) and str(x).isdigit()))
        with open(VIEWER_JSON, "w") as f:
            json.dump(unique_ids, f, indent=2)
        print(f"Updated 3Dviewer.json with IDs: {unique_ids}")
    except Exception as e:
        print(f"Error writing 3Dviewer.json: {e}")

@app.post("/create-product")
def create_product_route():
    """Creates a product from form data, saves images, and generates 3D model."""
    try:
        # Get form data
        display_images = request.files.getlist('displayImages')
        reference_images = request.files.getlist('referenceImages')
        product_name = request.form.get('productName', '').strip()
        length = request.form.get('length', '').strip()
        width = request.form.get('width', '').strip()
        height = request.form.get('height', '').strip()
        is_listing = request.form.get('isListing', 'false').lower() == 'true'
        
        # Validate required fields
        if not reference_images or len(reference_images) == 0:
            return jsonify({"error": "At least one reference image is required for 3D model generation."}), 400
        if not product_name:
            return jsonify({"error": "Product name is required."}), 400
        if not length or not width or not height:
            return jsonify({"error": "All dimensions are required."}), 400
        
        # Get next product ID
        product_id = get_next_product_id()
        
        # Save display images to database/images folder (for product page)
        display_image_paths = []
        for idx, image_file in enumerate(display_images):
            # Get file extension
            filename = image_file.filename
            ext = os.path.splitext(filename)[1] or '.jpg'
            image_filename = f"{product_id}_display_{idx + 1}{ext}"
            image_path = os.path.join(IMAGES_DIR, image_filename)
            
            # Save the image
            image_file.save(image_path)
            display_image_paths.append(f"images/{image_filename}")
            print(f"Saved display image: {image_path}")
        
        # Save listing image if it's a listing
        listing_image_path = None
        if is_listing:
            listing_image = request.files.get('listingImage')
            if listing_image:
                filename = listing_image.filename
                ext = os.path.splitext(filename)[1] or '.jpg'
                listing_filename = f"{product_id}_listing{ext}"
                listing_path = os.path.join(IMAGES_DIR, listing_filename)
                listing_image.save(listing_path)
                listing_image_path = f"images/{listing_filename}"
                print(f"Saved listing image: {listing_path}")
        
        # Create 3D model job using reference images
        # Reset file pointers before sending to pipeline
        for img in reference_images:
            img.seek(0)
        
        meshy_task_id = create_3d_model_from_images(reference_images, product_name)
        
        # Get next job ID
        local_id = get_next_job_id()
        
        # Prepare product data (will be updated when model is ready)
        product_data = {
            "id": product_id,
            "name": product_name,
            "image_paths": display_image_paths,  # Display images for product page
            "glb": f"glbs/{product_id}.glb",
            "measurements": {
                "length": float(length),
                "width": float(width),
                "height": float(height)
            }
        }
        
        # Add listing-specific fields
        if is_listing:
            product_data["price"] = float(request.form.get('price', 0))
            product_data["description"] = request.form.get('description', '').strip()
            if listing_image_path:
                product_data["listing_image"] = listing_image_path
        
        # Create job data
        job_data = {
            "local_id": local_id,
            "meshy_task_id": meshy_task_id,
            "prompt": product_name,
            "status": "PENDING",
            "status_meshy": "PENDING",
            "progress": 0,
            "created_at": int(time.time()),
            "error_message": None,
            "is_product": True,
            "product_id": product_id,
            "product_data": product_data
        }
        
        # Write initial job metadata
        json_path = os.path.join(JOBS_DIR, f"{local_id}.json")
        with open(json_path, 'w') as f:
            json.dump(job_data, f, indent=4)
        
        # Add initial product entry to products.json (without GLB initially)
        update_products_json(product_data)
        
        # Start background polling
        start_polling_thread(job_data)
        
        return jsonify({
            "message": "Product created successfully. 3D model is being generated.",
            "product_id": product_id,
            "job_id": local_id
        }), 202
        
    except MeshyApiException as e:
        return jsonify({"error": e.args[0], "details": e.details}), e.status_code
    except Exception as e:
        print(f"Error creating product: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/3dviewer", methods=["GET", "POST"])
def viewer_ids_route():
    """
    Small helper endpoint for the 3D viewer:
    - GET  /3dviewer  -> returns JSON array of product IDs
    - POST /3dviewer  -> body { "id": <number> } appends ID (de-duplicated)
    """
    if request.method == "GET":
        ids = _load_viewer_ids()
        return jsonify(ids), 200

    # POST
    data = request.get_json(silent=True) or {}
    product_id = data.get("id")
    try:
        numeric_id = int(product_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid or missing id"}), 400

    if numeric_id <= 0:
        return jsonify({"error": "Invalid id"}), 400

    ids = _load_viewer_ids()
    if numeric_id not in ids:
        ids.append(numeric_id)
        _save_viewer_ids(ids)

    return jsonify({"ok": True, "ids": ids}), 200

# --- Main Execution ---
if __name__ == "__main__":
    revive_pending_jobs() # Run this once on startup
    app.run(debug=False, port=8080) # Use debug=False to avoid running revive_pending_jobs twice