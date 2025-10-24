import React from 'react';
import { ImageDisplay } from './ImageDisplay';
import { Spinner } from './Spinner';
import type { ImageState } from '../App';

interface ImageProcessorProps {
  image: ImageState;
  onPromptChange: (id: string, prompt: string) => void;
  onRefine: (id: string) => void;
  onRemove: (id: string) => void;
}

const RemoveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);


export const ImageProcessor: React.FC<ImageProcessorProps> = ({ image, onPromptChange, onRefine, onRemove }) => {
  return (
    <div className="bg-gray-800/50 rounded-2xl shadow-lg p-4 relative border border-gray-700">
        <button 
            onClick={() => onRemove(image.id)}
            className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors z-30 p-1 bg-gray-900/50 rounded-full"
            aria-label="Remove image"
        >
            <RemoveIcon />
        </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageDisplay title="Original" imageUrl={image.displayOriginalImageUrl} />
        <div className="flex flex-col gap-4">
            <ImageDisplay title="Processed" imageUrl={image.latestProcessedImageUrl} isLoading={image.isLoading && !image.isProcessed} />
            
            {image.isProcessed && (
                 <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={image.prompt}
                        onChange={(e) => onPromptChange(image.id, e.target.value)}
                        placeholder="Refine further (e.g., 'make it a painting')"
                        disabled={image.isLoading}
                        className="flex-grow bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                    />
                    <button
                        onClick={() => onRefine(image.id)}
                        disabled={image.isLoading || !image.prompt.trim()}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-blue-500/50 flex items-center justify-center gap-2"
                    >
                       {image.isLoading && <Spinner small />}
                       Apply Refinement
                    </button>
                </div>
            )}
        </div>
      </div>
      {image.error && (
        <div className="mt-4 text-center bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg">
          <strong>Error:</strong> {image.error}
        </div>
      )}
    </div>
  );
};
