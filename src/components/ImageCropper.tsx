import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  targetWidth = 1920,
  targetHeight = 640
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to the desired output size
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      0.9 // 90% quality webp
    );
  });
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel, aspectRatio = 3 / 1 }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 1920, Math.round(1920 / aspectRatio));
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-surface border border-border/50 rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[80vh] md:max-h-[600px]">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-display font-bold text-white uppercase tracking-wider">Reposition Image</h2>
          <button onClick={onCancel} className="p-2 text-muted hover:text-white transition-colors rounded-full hover:bg-surface-2">
            <X size={20} />
          </button>
        </div>
        
        <div className="relative flex-1 bg-black min-h-[300px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
            objectFit="contain"
          />
        </div>

        <div className="p-6 border-t border-border/50 bg-surface flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full max-w-xs flex items-center gap-4">
            <span className="text-sm font-bold text-muted uppercase">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 md:flex-none px-6 py-3 font-bold uppercase tracking-widest text-sm text-white border border-border/50 rounded-xl hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="flex-1 md:flex-none px-6 py-3 font-bold uppercase tracking-widest text-sm text-black bg-primary rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : (
                <>
                  <Check size={16} /> Save Cover
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
