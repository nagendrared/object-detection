import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, Loader2, Trash2, AlertCircle, ImageIcon, Camera, 
  Sun, Moon, Download, List, ZoomIn, ZoomOut, Video, VideoOff
} from 'lucide-react';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

type FileValidationResult = {
  isValid: boolean;
  error?: string;
};

type DetectedObject = {
  label: string;
  score: number;
  box: number[];
  dimensions?: {
    width: number;
    height: number;
    area: number;
  };
};

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [darkMode, setDarkMode] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [showDetectedList, setShowDetectedList] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure you have granted camera permissions.');
      console.error(err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => 
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.95)
    );

    // Create a File object
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    
    setSelectedFile(file);
    setPreviewUrl(canvas.toDataURL('image/jpeg'));
    setIsLiveMode(false);
    stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const validateFile = useCallback((file: File): FileValidationResult => {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }

    if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
      return { 
        isValid: false, 
        error: `Invalid file type. Please upload ${ALLOWED_EXTENSIONS.join(', ')} files only` 
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}` 
      };
    }

    return { isValid: true };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('http://127.0.0.1:5000/detect', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      setResultImage(`http://localhost:5000/output/detected_${selectedFile.name}`);
      
      if (data.detections && Array.isArray(data.detections)) {
        const processedObjects = data.detections.map((obj: any) => ({
          label: obj.label || 'Unknown',
          score: obj.score || 0,
          box: obj.box || [],
          dimensions: obj.dimensions || null
        }));
        
        setDetectedObjects(processedObjects);
        
        if (processedObjects.length > 0) {
          setShowDetectedList(true);
        } else {
          setError('No objects detected in the image');
        }
      } else {
        setDetectedObjects([]);
        setError('No detection data received from the server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
      console.error(err);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [selectedFile]);

  const handleDownload = useCallback(() => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `detected_${selectedFile?.name || 'image'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [resultImage, selectedFile]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const clearImage = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResultImage(null);
    setError(null);
    setDetectedObjects([]);
    setShowDetectedList(false);
    setZoomLevel(1);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadstart = () => setIsPreviewLoading(true);
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      setIsPreviewLoading(false);
    };
    reader.readAsDataURL(file);
  }, [validateFile]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-b from-blue-50 to-white'
    }`}>
      <div className={`${
        darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-blue-600 to-blue-700'
      } py-6 sm:py-8 px-4 sm:px-6 shadow-lg mb-6 sm:mb-10 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto relative">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-opacity-20 hover:bg-white transition-all duration-300"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-6 h-6 text-yellow-300" />
            ) : (
              <Moon className="w-6 h-6 text-white" />
            )}
          </button>
          <div className="flex items-center justify-center gap-3 text-white">
            <Camera className="w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              Object Detection
            </h1>
          </div>
          <p className={`${darkMode ? 'text-gray-300' : 'text-blue-100'} text-center mt-2 text-sm sm:text-base`}>
            Upload an image or use camera to detect and analyze objects
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 flex flex-col items-center justify-center max-w-7xl">
        {!previewUrl && !isLiveMode && (
          <div className={`${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col items-center w-full max-w-xs sm:max-w-sm md:max-w-xl lg:max-w-3xl mb-6 sm:mb-8`}>
            <div className="flex gap-4 w-full mb-6">
              <button
                onClick={() => setIsLiveMode(true)}
                className={`flex-1 px-4 py-3 rounded-xl ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                } text-white transition-all duration-300 flex items-center justify-center gap-2`}
              >
                <Camera className="w-5 h-5" />
                Use Camera
              </button>
            </div>

            <label 
              className={`cursor-pointer flex flex-col items-center gap-4 sm:gap-6 p-8 sm:p-10 border-2 border-dashed rounded-xl w-full 
                ${isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : darkMode 
                    ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700' 
                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                }
                transition-all duration-300
                focus-within:ring-4 focus-within:ring-blue-200`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onKeyDown={handleKeyPress}
              tabIndex={0}
              role="button"
              aria-label="Upload image"
            >
              <Upload className={`w-12 h-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-center">
                <p className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Drag and drop your image here
                </p>
                <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  or click to browse
                </p>
                <p className={`mt-2 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Supported formats: {ALLOWED_EXTENSIONS.join(', ')}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Max file size: {formatFileSize(MAX_FILE_SIZE)}
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept={ALLOWED_TYPES.join(',')}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const validation = validateFile(file);
                  if (!validation.isValid) {
                    setError(validation.error);
                    return;
                  }

                  setSelectedFile(file);
                  const reader = new FileReader();
                  reader.onloadstart = () => setIsPreviewLoading(true);
                  reader.onload = () => {
                    setPreviewUrl(reader.result as string);
                    setIsPreviewLoading(false);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
        )}

        {isLiveMode && (
          <div className={`${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } p-6 rounded-2xl shadow-xl flex flex-col items-center w-full max-w-4xl mb-6`}>
            <div className="flex justify-between items-center w-full mb-4">
              <h2 className={`text-xl sm:text-2xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-800'
              } flex items-center gap-2`}>
                <Video className="w-6 h-6 text-blue-500" />
                Live Camera
              </h2>
              <button
                onClick={() => {
                  stopCamera();
                  setIsLiveMode(false);
                }}
                className={`p-2 rounded-lg ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                } transition-colors`}
                aria-label="Close camera"
              >
                <VideoOff className="w-5 h-5 text-red-500" />
              </button>
            </div>
            
            <div className={`relative w-full ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            } rounded-xl p-4`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 md:h-96 object-contain rounded-lg"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play();
                  }
                }}
              />
            </div>

            <div className="flex gap-4 mt-4 w-full">
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  className={`flex-1 px-4 py-2 ${
                    darkMode 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  } text-white rounded-lg transition-colors duration-300 flex items-center justify-center gap-2`}
                >
                  <Camera className="w-5 h-5" />
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={captureFrame}
                  className={`flex-1 px-4 py-2 ${
                    darkMode 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  } text-white rounded-lg transition-colors duration-300 flex items-center justify-center gap-2`}
                >
                  <Camera className="w-5 h-5" />
                  Capture & Detect
                </button>
              )}
            </div>
          </div>
        )}
        
        {previewUrl && (
          <div className="w-full max-w-full lg:max-w-6xl px-2 sm:px-4">
            <div className={`grid ${resultImage ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6 sm:gap-8`}>
              <div className={`${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } p-6 rounded-2xl shadow-xl flex flex-col items-center transition-all duration-300`}>
                <div className="flex justify-between items-center w-full mb-4">
                  <h2 className={`text-xl sm:text-2xl font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  } flex items-center gap-2`}>
                    <ImageIcon className="w-6 h-6 text-blue-500" />
                    Uploaded Image
                  </h2>
                  {selectedFile && (
                    <span className={`text-sm ${
                      darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-500 bg-gray-100'
                    } px-3 py-1 rounded-full`}>
                      {formatFileSize(selectedFile.size)}
                    </span>
                  )}
                </div>
                <div className={`relative w-full ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                } rounded-xl p-4`}>
                  <img 
                    src={previewUrl} 
                    alt="Uploaded" 
                    className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-contain rounded-lg shadow-sm transition-transform duration-300 hover:scale-[1.02]"
                  />
                </div>
              </div>

              {resultImage && (
                <div className={`${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                } p-6 rounded-2xl shadow-xl flex flex-col items-center transition-all duration-300`}>
                  <div className="flex justify-between items-center w-full mb-4">
                    <h2 className={`text-xl sm:text-2xl font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-800'
                    } flex items-center gap-2`}>
                      <Camera className="w-6 h-6 text-blue-500" />
                      Detected Objects
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleZoomOut}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Zoom out"
                      >
                        <ZoomOut className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleZoomIn}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Zoom in"
                      >
                        <ZoomIn className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className={`relative w-full ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } rounded-xl p-4`}>
                    <img 
                      src={resultImage} 
                      alt="Detected objects" 
                      className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-contain rounded-lg shadow-sm transition-transform duration-300"
                      style={{ transform: `scale(${zoomLevel})` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-4 w-full">
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download
                    </button>
                    <button
                      onClick={() => setShowDetectedList(!showDetectedList)}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                    >
                      <List className="w-5 h-5" />
                      {showDetectedList ? 'Hide' : 'Show'} Objects
                    </button>
                  </div>
                  {showDetectedList && detectedObjects.length > 0 && (
                    <div className={`mt-4 w-full ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    } rounded-lg p-4`}>
                      <h3 className="text-lg font-semibold mb-2">Detected Objects:</h3>
                      <ul className="space-y-2">
                        {detectedObjects.map((obj, index) => (
                          <li 
                            key={index}
                            className={`flex justify-between items-center ${
                              darkMode ? 'bg-gray-600' : 'bg-white'
                            } p-3 rounded-lg shadow-sm`}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{obj.label}</span>
                              {obj.dimensions && (
                                <span className={`text-sm ${
                                  darkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  Area: {Math.round(obj.dimensions.area)}px²
                                </span>
                              )}
                            </div>
                            <span className={`${
                              obj.score > 0.7 ? 'bg-green-100 text-green-800' :
                              obj.score > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            } px-3 py-1 rounded-full text-sm font-medium`}>
                              {Math.round(obj.score * 100)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mt-6 sm:mt-8">
              <button
                onClick={handleSubmit}
                className={`px-6 sm:px-8 py-3 rounded-xl text-base sm:text-lg font-medium
                  ${isLoading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : darkMode
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  } 
                  text-white transition-all duration-300 transform hover:scale-105 active:scale-95
                  shadow-lg hover:shadow-xl
                  focus:outline-none focus:ring-4 focus:ring-blue-200`}
                disabled={isLoading}
                aria-label={isLoading ? 'Processing image' : 'Detect objects'}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                    <span>Processing...</span>
                  </>
                ) : (
                  'Detect Objects'
                )}
              </button>

              <button
                onClick={clearImage}
                className={`px-6 sm:px-8 py-3 rounded-xl text-base sm:text-lg font-medium
                  ${darkMode
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  }
                  text-white transition-all duration-300 transform hover:scale-105 active:scale-95
                  shadow-lg hover:shadow-xl
                  focus:outline-none focus:ring-4 focus:ring-red-200
                  flex items-center justify-center gap-2`}
                aria-label="Delete image"
              >
                <Trash2 className="w-5 h-5" />
                Delete Image
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className={`flex items-center gap-3 mt-6 ${
            darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'
          } border px-6 py-4 rounded-xl shadow-sm`}>
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <p className={darkMode ? 'text-red-200' : 'text-red-600'}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;