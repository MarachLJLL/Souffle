# backend/app/pipeline.py

import os
import requests
import json
from dotenv import load_dotenv
import base64 # <-- Import the base64 library
import time

# Load .env from project root (two levels up from backend/app/)
pipeline_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(pipeline_dir)
project_root = os.path.dirname(backend_dir)
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

MESHY_API_KEY = os.getenv("MESHY_API_KEY")

# --- UPDATE API URLs to match the /openapi/ documentation ---
MESHY_IMAGE_API_URL = "https://api.meshy.ai/openapi/v1/image-to-3d"
MESHY_MULTI_IMAGE_API_URL = "https://api.meshy.ai/openapi/v1/multi-image-to-3d"
MESHY_TEXT_API_URL = "https://api.meshy.ai/v1/text-to-3d" # This one was already correct

class MeshyApiException(Exception):
    def __init__(self, message, status_code=500, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details or {}

def create_3d_model_from_images(image_files, prompt: str):
    """
    Creates a 3D model from one or more images by converting them to
    Base64 Data URIs and sending them to the appropriate Meshy API endpoint.
    """
    if not MESHY_API_KEY:
        raise MeshyApiException("Meshy API key is not configured.", 500)

    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}",
        "Content-Type": "application/json",
    }
    
    # --- Convert uploaded files to Base64 Data URIs ---
    image_data_uris = []
    for file in image_files:
        # Read the binary content of the file
        file_bytes = file.read()
        # Encode the bytes into Base64
        encoded_bytes = base64.b64encode(file_bytes)
        # Decode the bytes into a string for the JSON payload
        encoded_string = encoded_bytes.decode('utf-8')
        # Get the mimetype (e.g., 'image/png', 'image/jpeg')
        mimetype = file.mimetype
        # Construct the full Data URI
        data_uri = f"data:{mimetype};base64,{encoded_string}"
        image_data_uris.append(data_uri)

    # --- Determine which endpoint to use and build the payload ---
    api_url = ""
    payload = {}
    
    if len(image_data_uris) == 1:
        # SINGLE IMAGE API
        api_url = MESHY_IMAGE_API_URL
        payload = {
            "image_url": image_data_uris[0],
            "enable_pbr": True,
            # --- FIX: Explicitly tell the API to generate textures ---
            "should_texture": True, 
        }
        print("Using Single Image to 3D endpoint.")
    else:
        # MULTI-IMAGE API
        api_url = MESHY_MULTI_IMAGE_API_URL
        payload = {
            "image_urls": image_data_uris,
            "enable_pbr": True,
            # --- FIX: Explicitly tell the API to generate textures ---
            "should_texture": True,
        }
        print("Using Multi-Image to 3D endpoint.")

    try:
        # Send the request with a JSON payload
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json().get("result")
    
    except requests.exceptions.HTTPError as http_err:
        error_details = response.json() if response.content else {"error": "No details from API"}
        print(f"HTTP error (Image-to-3D): {http_err} - {response.status_code} - {error_details}")
        raise MeshyApiException("Failed Image-to-3D API call.", response.status_code, error_details) from http_err
    except requests.exceptions.RequestException as req_err:
        print(f"Request error (Image-to-3D): {req_err}")
        raise MeshyApiException("Network error during Image-to-3D call.", 503) from req_err


def create_3d_model_from_text(prompt: str):
    # This function was already correct and doesn't need changes.
    if not MESHY_API_KEY:
        raise MeshyApiException("Meshy API key is not configured.", 500)
    headers = {"Authorization": f"Bearer {MESHY_API_KEY}", "Content-Type": "application/json"}
    payload = {"object_prompt": prompt, "enable_pbr": True}
    
    try:
        response = requests.post(MESHY_TEXT_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json().get("result")
    except requests.exceptions.HTTPError as http_err:
        error_details = response.json() if response.content else {"error": "No details from API"}
        print(f"HTTP error (Text-to-3D): {http_err} - {response.status_code} - {error_details}")
        raise MeshyApiException("Failed Text-to-3D API call.", response.status_code, error_details) from http_err
    except requests.exceptions.RequestException as req_err:
        print(f"Request error (Text-to-3D): {req_err}")
        raise MeshyApiException("Network error during Text-to-3D call.", 503) from req_err

def get_task_status(task_id: str):
    # This function needs to use the new base URL for checking task status
    if not MESHY_API_KEY:
        raise MeshyApiException("Meshy API key is not configured.", 500)

    # Note: The task status URL is the same for single and multi-image.
    url = f"{MESHY_IMAGE_API_URL}/{task_id}"
    headers = {"Authorization": f"Bearer {MESHY_API_KEY}"}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        # ... error handling remains the same ...
        error_details = response.json() if response.content else {}
        raise MeshyApiException(f"Failed to get status for task {task_id}.", response.status_code, error_details) from http_err
    except requests.exceptions.RequestException as req_err:
        raise MeshyApiException("A network error occurred while contacting Meshy.ai.", 503) from req_err
    
def poll_and_download_model(task_id, save_path):
    """
    Polls the Meshy API for a task's status in a loop.
    When it succeeds, it downloads the .glb file to the specified path.
    This function is designed to be run in a background thread.
    """
    print(f"THREAD STARTED: Polling for task_id: {task_id}")
    while True:
        try:
            status_data = get_task_status(task_id)
            status = status_data.get('status')
            progress = status_data.get('progress', 0)
            
            print(f"THREAD polling for {task_id}: Status is {status}, Progress: {progress}%")

            if status == 'SUCCEEDED':
                glb_url = status_data.get('model_urls', {}).get('glb')
                if not glb_url:
                    print(f"THREAD ERROR: Task {task_id} succeeded but no GLB URL found.")
                    break

                print(f"THREAD SUCCESS: Task {task_id} complete. Downloading from {glb_url}")
                
                # Download the file
                with requests.get(glb_url, stream=True) as r:
                    r.raise_for_status()
                    with open(save_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                
                print(f"THREAD FINISHED: Successfully saved model to {save_path}")
                break # Exit the loop

            elif status == 'FAILED':
                error_message = status_data.get('task_error', {}).get('message', 'Unknown error')
                print(f"THREAD FAILED: Task {task_id} failed. Reason: {error_message}")
                break # Exit the loop

            # Wait for 10 seconds before polling again to avoid spamming the API
            time.sleep(10)

        except Exception as e:
            print(f"THREAD EXCEPTION while polling for {task_id}: {e}")
            # Optional: decide if you want to break the loop on any exception
            time.sleep(15) # Wait a bit longer after an error
            
def poll_and_update_job_status(meshy_task_id, json_path, glb_save_path, is_product=False, product_id=None):
    """
    Polls Meshy API and updates a local JSON file with the job's status.
    Downloads the .glb file on success. If is_product is True, also updates products.json.
    Designed for a background thread.
    """
    print(f"THREAD STARTED: Polling for Meshy task {meshy_task_id}")
    
    # Determine products.json path if this is a product job
    products_json_path = None
    if is_product:
        # Get the project root (go up from backend/app to backend, then to project root)
        pipeline_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(pipeline_dir)
        project_root = os.path.dirname(backend_dir)
        products_json_path = os.path.join(project_root, 'database', 'products.json')
    
    while True:
        try:
            status_data = get_task_status(meshy_task_id)
            status = status_data.get('status')
            progress = status_data.get('progress', 0)

            # Update the JSON file with the latest progress
            with open(json_path, 'r+') as f:
                job_data = json.load(f)
                job_data['progress'] = progress
                job_data['status_meshy'] = status
                f.seek(0)
                json.dump(job_data, f, indent=4)
                f.truncate()
            
            print(f"THREAD polling for {meshy_task_id}: Status is {status}, Progress: {progress}%")

            if status == 'SUCCEEDED':
                glb_url = status_data.get('model_urls', {}).get('glb')
                if not glb_url:
                    raise ValueError("Task succeeded but no GLB URL found.")

                print(f"THREAD SUCCESS: Downloading from {glb_url}")
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(glb_save_path), exist_ok=True)
                
                with requests.get(glb_url, stream=True) as r:
                    r.raise_for_status()
                    with open(glb_save_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                
                # Final update to the JSON file to mark as READY
                with open(json_path, 'r+') as f:
                    job_data = json.load(f)
                    job_data['status'] = 'READY'
                    job_data['progress'] = 100
                    f.seek(0)
                    json.dump(job_data, f, indent=4)
                    f.truncate()
                
                # If this is a product job, update products.json
                if is_product and products_json_path and os.path.exists(products_json_path):
                    try:
                        with open(products_json_path, 'r') as f:
                            products = json.load(f)
                        
                        # Find and update the product
                        product_updated = False
                        for product in products:
                            if product.get('id') == product_id:
                                # Update the product entry (GLB path should already be set)
                                # The product_data from job_data should have all the info
                                if 'product_data' in job_data:
                                    product.update(job_data['product_data'])
                                product_updated = True
                                break
                        
                        if not product_updated and 'product_data' in job_data:
                            # Product not found, add it
                            products.append(job_data['product_data'])
                        
                        with open(products_json_path, 'w') as f:
                            json.dump(products, f, indent=4)
                        
                        print(f"THREAD: Updated products.json for product ID {product_id}")
                    except Exception as update_e:
                        print(f"THREAD WARNING: Failed to update products.json: {update_e}")

                print(f"THREAD FINISHED: Saved model to {glb_save_path} and marked job as READY.")
                break # Success, exit the loop

            elif status == 'FAILED':
                error_message = status_data.get('task_error', {}).get('message', 'Unknown error')
                # Final update to the JSON file to mark as FAILED
                with open(json_path, 'r+') as f:
                    job_data = json.load(f)
                    job_data['status'] = 'FAILED'
                    job_data['error_message'] = error_message
                    f.seek(0)
                    json.dump(job_data, f, indent=4)
                    f.truncate()
                print(f"THREAD FAILED: Task {meshy_task_id} failed. Reason: {error_message}")
                break # Failure, exit the loop

            time.sleep(10)

        except Exception as e:
            print(f"THREAD EXCEPTION while polling for {meshy_task_id}: {e}")
            # Mark the job as failed in the JSON file
            try:
                with open(json_path, 'r+') as f:
                    job_data = json.load(f)
                    job_data['status'] = 'FAILED'
                    job_data['error_message'] = str(e)
                    f.seek(0)
                    json.dump(job_data, f, indent=4)
                    f.truncate()
            except Exception as write_e:
                print(f"CRITICAL: Failed to write error state to {json_path}: {write_e}")
            break # Exit loop on any exception
