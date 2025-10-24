
import React, { useState, useCallback } from 'react';
import { ImageProcessor } from './components/ImageProcessor';
import { Spinner } from './components/Spinner';
import { processImageWithGemini } from './services/geminiService';
import { urlToInfo, dataUrlToInfo, fileToInfo } from './utils/fileUtils';

interface ImageInfo {
  base64: string;
  mimeType: string;
}

export interface ImageState {
  id: string;
  originalImageInfo: ImageInfo;
  displayOriginalImageUrl: string;
  latestProcessedImageUrl: string | null;
  prompt: string;
  isLoading: boolean;
  isProcessed: boolean;
  error: string | null;
}

const MAX_IMAGES = 5;

const App: React.FC = () => {
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [images, setImages] = useState<ImageState[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [isUrlLoading, setIsUrlLoading] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const unprocessedImagesCount = images.filter(img => !img.isProcessed).length;

  const addImages = (files: File[]) => {
    setGlobalError(null);
    if (images.length + files.length > MAX_IMAGES) {
      setGlobalError(`You can only upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    files.forEach(async (file) => {
      try {
        const { base64, mimeType, dataUrl } = await fileToInfo(file);
        const newImage: ImageState = {
          id: `${Date.now()}-${Math.random()}`,
          originalImageInfo: { base64, mimeType },
          displayOriginalImageUrl: dataUrl,
          latestProcessedImageUrl: null,
          prompt: '',
          isLoading: false,
          isProcessed: false,
          error: null,
        };
        setImages(prev => [...prev, newImage]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load an image from file.';
        setGlobalError(message);
      }
    });
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // FIX: Explicitly cast to File[] to resolve a TypeScript type inference issue where FileList becomes unknown[].
    const files = event.target.files ? Array.from(event.target.files) as File[] : [];
    if (files.length > 0) {
      addImages(files);
    }
    event.target.value = '';
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    // FIX: Explicitly cast to File[] to resolve a TypeScript type inference issue where FileList becomes unknown[], which causes issues with `.filter`.
    const files = e.dataTransfer.files ? (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/')) : [];
    if (files.length > 0) {
      addImages(files);
    } else {
      setGlobalError("No valid image files were dropped.");
    }
  };
  
  const handleLoadImageFromUrl = async () => {
    if (!imageUrlInput.trim()) {
      setGlobalError("Please enter an image URL.");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setGlobalError(`You can only upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    setIsUrlLoading(true);
    setGlobalError(null);
    try {
      const { base64, mimeType, dataUrl } = await urlToInfo(imageUrlInput);
      const newImage: ImageState = {
        id: `${Date.now()}-${Math.random()}`,
        originalImageInfo: { base64, mimeType },
        displayOriginalImageUrl: dataUrl,
        latestProcessedImageUrl: null,
        prompt: '',
        isLoading: false,
        isProcessed: false,
        error: null,
      };
      setImages(prev => [...prev, newImage]);
      setImageUrlInput('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load image from URL.';
      setGlobalError(message);
    } finally {
      setIsUrlLoading(false);
    }
  };

  const handleCleanAll = async () => {
    setIsBatchProcessing(true);
    setGlobalError(null);

    const cleaningPromises = images.map(image => {
      if (image.isProcessed) return Promise.resolve(image);

      setImages(prev => prev.map(img => img.id === image.id ? { ...img, isLoading: true, error: null } : img));
      
      const cleaningPrompt = "Identify and meticulously remove all people and text. Intelligently and realistically reconstruct the background. The output image should look as if the people and text were never there. Provide a clean, preserved background suitable for graphic design and digital creations.";

      return processImageWithGemini(image.originalImageInfo.base64, image.originalImageInfo.mimeType, cleaningPrompt)
        .then(resultBase64 => {
           setImages(prev => prev.map(img => img.id === image.id ? {
              ...img,
              latestProcessedImageUrl: `data:image/png;base64,${resultBase64}`,
              isProcessed: true,
              isLoading: false,
            } : img));
        })
        .catch(err => {
            const message = err instanceof Error ? err.message : 'An unknown error occurred during cleaning.';
             setImages(prev => prev.map(img => img.id === image.id ? { ...img, isLoading: false, error: message } : img));
        });
    });

    await Promise.all(cleaningPromises);
    setIsBatchProcessing(false);
  };
  
  const handleRefine = async (id: string) => {
    const imageToRefine = images.find(img => img.id === id);
    if (!imageToRefine || !imageToRefine.latestProcessedImageUrl || !imageToRefine.prompt.trim()) return;

    setImages(prev => prev.map(img => img.id === id ? { ...img, isLoading: true, error: null } : img));

    try {
        const { base64, mimeType } = dataUrlToInfo(imageToRefine.latestProcessedImageUrl);
        const resultBase64 = await processImageWithGemini(base64, mimeType, imageToRefine.prompt);
        setImages(prev => prev.map(img => img.id === id ? {
            ...img,
            latestProcessedImageUrl: `data:image/png;base64,${resultBase64}`,
            isLoading: false,
        } : img));
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred during refinement.';
        setImages(prev => prev.map(img => img.id === id ? { ...img, isLoading: false, error: message } : img));
    }
  };

  const handlePromptChange = (id: string, prompt: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, prompt } : img));
  };
  
  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const TabButton: React.FC<{ mode: 'upload' | 'url'; label: string }> = ({ mode, label }) => (
    <button
      onClick={() => setInputMode(mode)}
      className={`py-2 px-4 text-sm font-medium rounded-t-lg transition-colors duration-300 ${
        inputMode === mode
          ? 'bg-gray-700 text-teal-400 border-b-2 border-teal-400'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
            AI Background Preserver
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Upload up to 5 images to instantly remove people and text, then use prompts to refine them individually.
          </p>
        </header>

        <main>
          <div className="bg-gray-800/50 rounded-2xl shadow-2xl p-6 mb-8 backdrop-blur-sm border border-gray-700">
            <div className="flex border-b border-gray-700 mb-4">
              <TabButton mode="upload" label="Upload Images" />
              <TabButton mode="url" label="Add Image URL" />
            </div>

            <div className="mb-4">
              {inputMode === 'upload' ? (
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`p-4 border-2 border-dashed rounded-lg transition-colors duration-300 text-center ${
                      isDragging ? 'border-teal-400 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" multiple disabled={isBatchProcessing} />
                  <label htmlFor="file-upload" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-teal-500/50 cursor-pointer">
                      Choose Files
                  </label>
                  <p className="text-sm text-gray-500 mt-2">or drag and drop images ({images.length}/{MAX_IMAGES} selected)</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoadImageFromUrl()}
                      placeholder="Paste an image URL here and click 'Add Image'"
                      disabled={isUrlLoading || isBatchProcessing}
                      className="flex-grow bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 transition disabled:opacity-50"
                  />
                  <button
                    onClick={handleLoadImageFromUrl}
                    disabled={isUrlLoading || isBatchProcessing}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-teal-500/50 flex items-center justify-center gap-2"
                  >
                    {isUrlLoading && <Spinner small />}
                    Add Image
                  </button>
                </div>
              )}
            </div>

            {images.length > 0 && (
                <div className="border-t border-gray-700 pt-4 flex justify-center">
                    <button
                        onClick={handleCleanAll}
                        disabled={isBatchProcessing || unprocessedImagesCount === 0}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-blue-500/50 flex items-center justify-center gap-2 text-lg"
                    >
                        {isBatchProcessing && <Spinner small />}
                        {isBatchProcessing ? 'Cleaning...' : `Clean All Backgrounds (${unprocessedImagesCount})`}
                    </button>
                </div>
            )}

            {globalError && (
              <div className="mt-4 text-center bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg">
                <strong>Error:</strong> {globalError}
              </div>
            )}
          </div>
          
          {images.length === 0 && (
            <div className="text-center py-16 text-gray-500">
                <p className="text-xl">Upload some images to get started!</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8">
            {images.map((image) => (
                <ImageProcessor
                    key={image.id}
                    image={image}
                    onPromptChange={handlePromptChange}
                    onRefine={handleRefine}
                    onRemove={handleRemoveImage}
                />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
