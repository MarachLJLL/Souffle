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
JOBS_DIR = os.path.join(BASE_DIR, 'jobs')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(JOBS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

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
    
    thread = threading.Thread(
        target=poll_and_update_job_status,
        args=(meshy_task_id, json_path, glb_save_path)
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
            with open(json_path, 'r') as f:
                job_data = json.load(f)
                if job_data.get('status') == 'PENDING':
                    start_polling_thread(job_data)
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

# --- Main Execution ---
if __name__ == "__main__":
    revive_pending_jobs() # Run this once on startup
    app.run(debug=False, port=5000) # Use debug=False to avoid running revive_pending_jobs twice