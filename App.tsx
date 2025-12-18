import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowUpTrayIcon, 
  SparklesIcon, 
  ScissorsIcon, 
  ArrowDownTrayIcon,
  PhotoIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon
} from '@heroicons/react/24/solid';
import { AppState, GarmentDetails, CropRect } from './types';
import { fileToBase64, loadImage, calculateSmartCrop, performCrop } from './utils/imageHelpers';
import { detectGarment } from './services/geminiService';

// --- Components ---

/**
 * Manual Crop Editor Component
 * Allows user to drag a 1:1 box and resize it via slider
 */
const CropEditor: React.FC<{
  imageSrc: string;
  initialCrop: CropRect;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}> = ({ imageSrc, initialCrop, onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  
  // Crop state in NATURAL image pixels
  const [crop, setCrop] = useState<CropRect>(initialCrop);
  
  // Dragging state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 }); // Mouse position
  const startCropPos = useRef({ x: 0, y: 0 }); // Crop position

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    startCropPos.current = { x: crop.x, y: crop.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !imgElement || !containerRef.current) return;
    
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;

    // Convert screen pixels to image natural pixels
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0) return;

    const scale = imgElement.naturalWidth / rect.width;

    setCrop(prev => ({
      ...prev,
      x: startCropPos.current.x + (deltaX * scale),
      y: startCropPos.current.y + (deltaY * scale)
    }));
  }, [imgElement]);

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]);

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!imgElement) return;
    const newSize = Number(e.target.value);
    
    // When resizing, keep center fixed
    const oldCenter = crop.size / 2;
    const newCenter = newSize / 2;
    const offset = oldCenter - newCenter;

    setCrop(prev => ({
      x: prev.x + offset,
      y: prev.y + offset,
      size: newSize
    }));
  };

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgElement(e.currentTarget);
  };

  // Rendering calculations
  const getStyle = () => {
    if (!imgElement) return { display: 'none' };

    const leftPer = (crop.x / imgElement.naturalWidth) * 100;
    const topPer = (crop.y / imgElement.naturalHeight) * 100;
    const widthPer = (crop.size / imgElement.naturalWidth) * 100;
    const heightPer = (crop.size / imgElement.naturalHeight) * 100;

    return {
      left: `${leftPer}%`,
      top: `${topPer}%`,
      width: `${widthPer}%`,
      height: `${heightPer}%`,
    };
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden">
      <div className="flex-grow flex items-center justify-center p-4 relative bg-gray-950/50"
           style={{ touchAction: 'none' }}>
        
        {/* Container strictly wraps image */}
        <div ref={containerRef} className="relative inline-block shadow-2xl">
           <img 
             src={imageSrc} 
             alt="Source" 
             onLoad={onImgLoad}
             className="max-h-[60vh] max-w-full w-auto h-auto block select-none pointer-events-none" 
           />
           
           {/* Dark Overlay with "Hole" using box-shadow trick */}
           <div className="absolute inset-0 bg-black/50 overflow-hidden">
              <div 
                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move active:cursor-grabbing"
                style={getStyle()}
                onMouseDown={handleMouseDown}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50">
                   <div className="border-r border-white/30 h-full col-start-1"></div>
                   <div className="border-r border-white/30 h-full col-start-2"></div>
                   <div className="border-b border-white/30 w-full row-start-1 absolute top-1/3"></div>
                   <div className="border-b border-white/30 w-full row-start-2 absolute top-2/3"></div>
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700 flex flex-col sm:flex-row items-center gap-4 z-10">
        {imgElement && (
           <div className="flex items-center gap-3 w-full sm:w-auto flex-grow">
              <span className="text-xs font-mono text-gray-400 whitespace-nowrap">Crop Size</span>
              <input 
                type="range" 
                min={100} 
                max={Math.max(imgElement.naturalWidth, imgElement.naturalHeight)} 
                value={crop.size} 
                onChange={handleSizeChange}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
           </div>
        )}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
             Cancel
          </button>
          <button onClick={() => onConfirm(crop)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
            <CheckIcon className="h-4 w-4" /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Main App ---

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [garmentDetails, setGarmentDetails] = useState<GarmentDetails | null>(null);
  const [currentCrop, setCurrentCrop] = useState<CropRect | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>("smart-crop");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAppState(AppState.ANALYZING);
    setCroppedImage(null);
    setGarmentDetails(null);
    setCurrentCrop(null);
    setErrorMsg(null);
    
    // Store original name without extension
    const name = file.name.replace(/\.[^/.]+$/, "");
    setOriginalFileName(name);

    try {
      const base64 = await fileToBase64(file);
      setSourceImage(base64);
      processImage(base64);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load image file.");
      setAppState(AppState.ERROR);
    }
  };

  const processImage = async (base64: string) => {
    try {
      // Step 1: Detect
      const details = await detectGarment(base64);
      setGarmentDetails(details);
      
      setAppState(AppState.CROPPING);
      
      // Step 2: Calculate Smart Crop
      const img = await loadImage(base64);
      
      // PRIORITIZE TEXTURE BOX (the linear chest area) if available, otherwise fallback to garment box
      const targetBox = details.textureBox || details.box;
      
      const smartCrop = calculateSmartCrop(targetBox, img.naturalWidth, img.naturalHeight);
      setCurrentCrop(smartCrop);

      // Step 3: Perform Crop
      const resultUrl = await performCrop(base64, smartCrop, 1024);
      setCroppedImage(resultUrl);
      setAppState(AppState.SUCCESS);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to process image.");
      setAppState(AppState.ERROR);
    }
  };

  const handleManualCropConfirm = async (newCrop: CropRect) => {
    if (!sourceImage) return;
    try {
      setAppState(AppState.CROPPING);
      setCurrentCrop(newCrop);
      const resultUrl = await performCrop(sourceImage, newCrop, 1024);
      setCroppedImage(resultUrl);
      setAppState(AppState.SUCCESS);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to apply manual crop");
    }
  };

  const handleDownload = () => {
    if (croppedImage) {
      const link = document.createElement('a');
      link.href = croppedImage;
      
      // Construct filename: name_color.jpg
      const colorPart = garmentDetails?.color 
        ? `_${garmentDetails.color.replace(/[^a-zA-Z0-9-]/g, '')}` // sanitize
        : '';
        
      link.download = `${originalFileName}${colorPart}.jpg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setSourceImage(null);
    setCroppedImage(null);
    setGarmentDetails(null);
    setCurrentCrop(null);
    setErrorMsg(null);
    setOriginalFileName("smart-crop");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-950/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
              <ScissorsIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Smart Crop Pro
            </h1>
          </div>
          <div className="text-sm text-gray-400 hidden sm:block">
            AI Garment Analysis & Extraction
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        
        {/* Background Accents */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Modal-like Editor Overlay if Editing */}
        {appState === AppState.EDITING && sourceImage && currentCrop && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-4xl h-full max-h-[800px] bg-gray-900 rounded-2xl border border-gray-800 flex flex-col shadow-2xl overflow-hidden">
               <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                 <h2 className="font-bold text-white flex gap-2"><AdjustmentsHorizontalIcon className="h-5 w-5"/> Fine-Tune Crop (1:1)</h2>
               </div>
               <div className="flex-grow overflow-hidden relative">
                 <CropEditor 
                   imageSrc={sourceImage}
                   initialCrop={currentCrop}
                   onConfirm={handleManualCropConfirm}
                   onCancel={() => setAppState(AppState.SUCCESS)}
                 />
               </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Upload & Original */}
          <div className="flex flex-col space-y-6">
            <div className={`
              border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[400px] relative overflow-hidden bg-gray-900/50
              ${appState === AppState.IDLE ? 'border-gray-700 hover:border-indigo-500 hover:bg-gray-800/50' : 'border-gray-800'}
            `}>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                disabled={appState !== AppState.IDLE && appState !== AppState.ERROR}
              />

              {sourceImage ? (
                <img 
                  src={sourceImage} 
                  alt="Original" 
                  className="max-h-[500px] w-full object-contain rounded-lg shadow-2xl" 
                />
              ) : (
                <div className="space-y-4 pointer-events-none">
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                    <ArrowUpTrayIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Upload Photo</h3>
                    <p className="text-gray-400 text-sm mt-1">Click or drag an image here</p>
                    <p className="text-gray-600 text-xs mt-4">Supports JPG, PNG (Max 10MB)</p>
                  </div>
                </div>
              )}

              {/* Status Overlay */}
              {(appState === AppState.ANALYZING || appState === AppState.CROPPING) && (
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                   <div className="relative w-16 h-16 mb-4">
                     <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
                   </div>
                   <p className="text-indigo-300 font-medium animate-pulse">
                     {appState === AppState.ANALYZING ? "Detecting texture & best linear area..." : "Processing crop..."}
                   </p>
                 </div>
              )}
            </div>
            
            {appState === AppState.ERROR && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-center">
                <p>{errorMsg || "An unknown error occurred."}</p>
                <button 
                  onClick={handleReset}
                  className="mt-2 text-sm font-bold hover:underline"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Result */}
          <div className="flex flex-col space-y-6">
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-indigo-400" />
                  Result (1024x1024)
                </h2>
                {croppedImage && (
                    <button 
                      onClick={() => setAppState(AppState.EDITING)}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-indigo-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-gray-700"
                    >
                      <AdjustmentsHorizontalIcon className="h-3 w-3" /> Adjust Crop
                    </button>
                )}
              </div>

              <div className="flex-grow flex items-center justify-center bg-gray-950 rounded-xl border border-gray-800 relative overflow-hidden group min-h-[300px]">
                 {!croppedImage ? (
                   <div className="text-center text-gray-600 p-8">
                     <PhotoIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                     <p>Process an image to see the crop here.</p>
                   </div>
                 ) : (
                   <div className="relative w-full h-full flex items-center justify-center p-4">
                      <div className="checker-bg absolute inset-0 opacity-10 pointer-events-none"></div>
                      <img 
                        src={croppedImage} 
                        alt="Cropped" 
                        className="max-w-full max-h-[400px] object-contain shadow-2xl relative z-10" 
                      />
                   </div>
                 )}
              </div>

              {/* Analysis Results */}
              {garmentDetails && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Texture</p>
                    <p className="text-sm font-medium text-white">{garmentDetails.texture}</p>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Color</p>
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                       {/* Color dot attempt - strictly decorative as we don't have hex */}
                       <span className="w-2 h-2 rounded-full bg-white/50"></span>
                       {garmentDetails.color}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-4">
                <button
                  onClick={handleDownload}
                  disabled={!croppedImage}
                  className={`
                    flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all
                    ${croppedImage 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:scale-[1.02]' 
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                  `}
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download .JPG
                </button>
                <button
                   onClick={handleReset}
                   disabled={appState === AppState.IDLE}
                   className={`
                    px-4 rounded-xl flex items-center justify-center transition-all border
                    ${appState !== AppState.IDLE
                      ? 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-white'
                      : 'border-gray-800 bg-transparent text-gray-600 cursor-not-allowed'}
                   `}
                   title="Reset"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-800/50">
               <h3 className="text-sm font-semibold text-gray-400 mb-2">Capabilities</h3>
               <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
                 <li>Detects garment bounds, fabric texture, and color.</li>
                 <li><strong className="text-indigo-400">Smart Linear Crop:</strong> Automatically focuses on the flattest chest area (texture patch).</li>
                 <li><strong className="text-gray-400">Manual Adjustment:</strong> Fine-tune the crop area and zoom.</li>
                 <li>High-res 1024px output (JPEG).</li>
               </ul>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;