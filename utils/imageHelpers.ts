import { BoundingBox, CropRect } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

/**
 * Calculates a square crop rectangle based on the Gemini bounding box.
 * Adds padding and ensures 1:1 aspect ratio.
 */
export const calculateSmartCrop = (
  box: BoundingBox, 
  imgWidth: number, 
  imgHeight: number
): CropRect => {
  // Convert normalized coordinates (0-1000) to pixels
  const rawYmin = (box.ymin / 1000) * imgHeight;
  const rawXmin = (box.xmin / 1000) * imgWidth;
  const rawYmax = (box.ymax / 1000) * imgHeight;
  const rawXmax = (box.xmax / 1000) * imgWidth;

  const width = rawXmax - rawXmin;
  const height = rawYmax - rawYmin;

  // Find center
  const centerX = rawXmin + width / 2;
  const centerY = rawYmin + height / 2;

  // Determine size (largest dimension + padding)
  const paddingPercent = 0.1; 
  const baseSize = Math.max(width, height);
  const size = baseSize * (1 + paddingPercent);

  // Calculate top-left corner to center the crop
  let x = centerX - size / 2;
  let y = centerY - size / 2;

  return { x, y, size };
};

/**
 * Performs the actual crop on the image using pixel coordinates.
 * Exports as high-quality JPEG.
 */
export const performCrop = async (
  imageSrc: string,
  crop: CropRect,
  outputSize: number = 1024
): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  // Fill with white background for JPEG (prevents black artifacts on edges/transparency)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, outputSize, outputSize);

  // Calculate scale to map crop.size -> outputSize
  // source rectangle: crop.x, crop.y, crop.size, crop.size
  // destination: 0, 0, outputSize, outputSize
  
  ctx.drawImage(
    img,
    crop.x, crop.y, crop.size, crop.size, // Source
    0, 0, outputSize, outputSize          // Destination
  );

  // Return as JPEG with high quality
  return canvas.toDataURL('image/jpeg', 0.95);
};

// Backwards compatibility wrapper (if needed elsewhere, but we updated App.tsx)
export const cropAndResizeImage = async (
  imageSrc: string,
  box: BoundingBox,
  outputSize: number = 1024
): Promise<string> => {
  const img = await loadImage(imageSrc);
  const rect = calculateSmartCrop(box, img.naturalWidth, img.naturalHeight);
  return performCrop(imageSrc, rect, outputSize);
};