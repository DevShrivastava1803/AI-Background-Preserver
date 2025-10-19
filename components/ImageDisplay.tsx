import React from 'react';
import { Spinner } from './Spinner';

interface ImageDisplayProps {
  title: string;
  imageUrl: string | null;
  isLoading?: boolean;
}

const ImageIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);


export const ImageDisplay: React.FC<ImageDisplayProps> = ({ title, imageUrl, isLoading = false }) => {
  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    const filename = `processed-image-${Date.now()}.png`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4 text-gray-300">{title}</h2>
      <div className="w-full aspect-square bg-gray-800 rounded-2xl shadow-lg border border-gray-700 flex items-center justify-center relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-10 backdrop-blur-sm">
            <Spinner />
          </div>
        )}
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
        ) : (
          <div className="text-center text-gray-500">
            <ImageIcon />
            <p className="mt-2">{title === 'Original' ? 'Upload an image to start' : 'Processed image will appear here'}</p>
          </div>
        )}
        {title === 'Processed' && imageUrl && !isLoading && (
          <button
            onClick={handleDownload}
            aria-label="Download processed image"
            className="absolute bottom-4 right-4 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-500/50 flex items-center justify-center gap-2 z-20"
          >
            <DownloadIcon />
            Download Image
          </button>
        )}
      </div>
    </div>
  );
};