from flask import Flask, request, jsonify, send_file
import os
from model import ObjectDetector
from flask_cors import CORS
import time
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Constants and configuration
UPLOAD_FOLDER = "uploads"
RESULT_FOLDER = "results"
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Create folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

# Initialize the object detector
detector = ObjectDetector()

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/detect', methods=['POST'])
def detect():
    """Enhanced endpoint to detect objects in an image."""
    try:
        # Validate file presence
        if 'image' not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image_file = request.files['image']
        
        # Validate filename
        if image_file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        # Get confidence threshold from request
        confidence_threshold = float(request.form.get('confidence_threshold', 0.5))
        detector.confidence_threshold = confidence_threshold

        # Validate file type
        if not allowed_file(image_file.filename):
            return jsonify({"error": "File type not allowed"}), 400

        # Validate file size
        image_file.seek(0, os.SEEK_END)
        file_size = image_file.tell()
        image_file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": f"File size exceeds {MAX_FILE_SIZE/1024/1024}MB limit"}), 400

        # Save and process the image
        filename = secure_filename(image_file.filename)
        image_path = os.path.join(UPLOAD_FOLDER, filename)
        image_file.save(image_path)

        # Process the image
        start_time = time.time()
        result = detector.process_image(image_path)
        
        # Draw detection boxes
        result_image_path = os.path.join(RESULT_FOLDER, f"detected_{filename}")
        detector.draw_boxes(image_path, result['detections'], result_image_path)

        # Add processing metadata
        result['file_info'] = {
            'original_name': filename,
            'size': file_size,
            'result_path': result_image_path
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        # Clean up old files (optional)
        cleanup_old_files()

@app.route('/output/<filename>', methods=['GET'])
def output(filename):
    """Serve the detected image with improved error handling."""
    try:
        image_path = os.path.join(RESULT_FOLDER, secure_filename(filename))
        if not os.path.exists(image_path):
            return jsonify({"error": "File not found"}), 404
        return send_file(image_path, mimetype="image/jpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def cleanup_old_files(max_age_hours=1):
    """Clean up old files to prevent disk space issues."""
    try:
        current_time = time.time()
        for folder in [UPLOAD_FOLDER, RESULT_FOLDER]:
            for filename in os.listdir(folder):
                filepath = os.path.join(folder, filename)
                file_age = current_time - os.path.getmtime(filepath)
                if file_age > max_age_hours * 3600:
                    os.remove(filepath)
    except Exception as e:
        print(f"Error during cleanup: {str(e)}")

@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file size exceeded error."""
    return jsonify({"error": f"File size exceeds {MAX_FILE_SIZE/1024/1024}MB limit"}), 413

@app.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    return jsonify({"error": "Internal server error occurred"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "config": {
            "max_file_size": MAX_FILE_SIZE,
            "allowed_extensions": list(ALLOWED_EXTENSIONS)
        }
    })

if __name__ == '__main__':
    # Set up basic logging
    import logging
    logging.basicConfig(level=logging.INFO)
    
    # Increase maximum content length
    app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
    
    # Run the app
    app.run(debug=True)
