
# Object Detection Web Application

A full-stack object detection system that allows users to upload or capture images and detect objects using a pre-trained **Faster R-CNN (ResNet-50 FPN)** model. Built with a **React + TypeScript** frontend and a **Flask + PyTorch** backend.

---

## Features

### Backend (Flask)
- PyTorch Faster R-CNN for real-time object detection.
- Returns bounding boxes, labels, confidence scores, and object dimensions.
- Image validation (type, size), result saving, and auto-cleanup.
- RESTful APIs for detection and result retrieval.

### Frontend (React + TypeScript)
- Drag & drop, file upload, camera capture, and live preview.
- Batch processing of multiple images.
- Confidence filters, class-based filtering, zoom, and comparison.
- History panel, dark mode, fullscreen support.
- Responsive design using TailwindCSS and Lucide icons.

---

## Folder Structure

```bash
object-detection/
│
├── backend/                   # Flask Backend
│   ├── app.py                 # Flask API logic
│   ├── model.py               # Object detection logic (Faster R-CNN)
│   ├── uploads/               # Temporary folder for uploaded images
│   ├── results/               # Folder for result images with bounding boxes
│   └── requirements.txt       # Backend dependencies
│
├── frontend/                  # React Frontend (Vite + TypeScript)
│   ├── public/                # Static assets
│   ├── src/                   # React source code
│   │   ├── App.tsx            # Main React component
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── index.html             # Root HTML file
│   ├── tailwind.config.js     # TailwindCSS config
│   ├── postcss.config.js      # PostCSS config
│   ├── tsconfig.json          # TypeScript config
│   ├── vite.config.ts         # Vite dev server config
│   └── package.json           # Frontend dependencies and scripts
│
├── README.md
└── .gitignore
```

---

## Setup Instructions

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # For Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

> The backend will start at: [http://localhost:5000](http://localhost:5000)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

> The frontend will open at: [http://localhost:5173](http://localhost:5173)

---

## 📸 Screenshots

Here are a few screenshots showcasing the **Object Detection Web Application**:

### 🖼️ UI Interface
User-friendly interface for uploading images, triggering detection, and viewing results.

![Screenshot 2025-06-27 122902](https://github.com/user-attachments/assets/a7a51f6d-52c4-49ab-ac67-0cb82a9eaef4)

📷 Image Upload & Camera Capture
Screenshot of drag & drop area, file upload, and live camera capture interface.
![image](https://github.com/user-attachments/assets/c1e9c207-54c0-47b5-a2a4-96acdd6b7685)


🎥 Direct Webcam Capture
Live webcam view and capture button used to directly take photos for detection.

![image](https://github.com/user-attachments/assets/6323ffdd-b49d-4109-bbb0-6e67e4c0d38d)


🗃️ Batch Image Processing
Showcase selection and processing of multiple images at once.

![image](https://github.com/user-attachments/assets/aa71294e-8287-4222-be04-c0c87ffec249)


### 🧠 Detection Output
Detected objects with bounding boxes, class labels, and confidence scores.

![Screenshot 2025-06-27 122945](https://github.com/user-attachments/assets/557ed870-1f61-43c7-9bd3-b02abc04e781)

🎯 Confidence & Class Filters
Sliders or toggle switches for filtering by confidence or class.

![image](https://github.com/user-attachments/assets/0bb9e39b-7b1d-488a-bb4b-55217b1c93ed)

🔍 Zoom & Side-by-Side Comparison
Compare input and output images with zoom support.

![image](https://github.com/user-attachments/assets/624c1669-e12f-43cd-9d2f-55d566c7611f)

🕒 Detection History Panel
List of previously processed images with quick preview options

![image](https://github.com/user-attachments/assets/0541f5a5-12e3-44bb-aad0-be152530d6ea)

🌙 Dark Mode UI
The entire application in dark mode for night use.

![image](https://github.com/user-attachments/assets/5cede878-093a-4874-a8d8-731249b50e08)


## API Endpoints

### POST `/detect`

- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `image` (required): Image file (`.jpg`, `.jpeg`, `.png`, `.webp`)
  - `confidence_threshold` (optional): Float (default = 0.5)

#### Example Response

```json
{
  "detections": [
    {
      "label": "person",
      "score": 0.95,
      "box": [100, 150, 400, 600],
      "dimensions": {
        "width": 300,
        "height": 450,
        "area": 135000
      },
      "center": [250, 375],
      "relative_size": 12.34
    }
  ],
  "statistics": {
    "total_objects": 1,
    "class_distribution": {
      "person": 1
    },
    "confidence_stats": {
      "mean": 0.95,
      "min": 0.95,
      "max": 0.95
    },
    "size_stats": {
      "mean_area": 135000,
      "min_area": 135000,
      "max_area": 135000
    }
  },
  "processing_time": 1.23,
  "image_metadata": {
    "size": [800, 600],
    "format": "JPEG",
    "mode": "RGB",
    "dpi": null
  },
  "file_info": {
    "original_name": "input.jpg",
    "size": 845921,
    "result_path": "results/detected_input.jpg"
  }
}
```

---

### GET `/output/<filename>`

- **Method**: `GET`
- **Description**: Returns the processed image with bounding boxes.
- **Example**:
  ```
  GET http://localhost:5000/output/detected_input.jpg
  ```

---

### GET `/health`

- **Method**: `GET`
- **Description**: Returns server health and configuration.

#### Example Response

```json
{
  "status": "healthy",
  "timestamp": 1719471350.123,
  "config": {
    "max_file_size": 10485760,
    "allowed_extensions": ["png", "jpg", "jpeg", "webp"]
  }
}
```

---

## Validation Rules

| Rule            | Limit                          |
|-----------------|--------------------------------|
| Max file size   | 10MB (backend), 5MB (frontend) |
| Allowed formats | jpg, jpeg, png, webp           |

---

## Contact

**Nagendra Reddy Keshavareddy**  
- LinkedIn: [https://www.linkedin.com/in/keshavareddy-nagendra-reddy-672127256/](https://www.linkedin.com/in/keshavareddy-nagendra-reddy-672127256/)  
- GitHub: [https://github.com/nagendrared](https://github.com/nagendrared)

---

## License

This project is licensed under the [MIT License](LICENSE).
