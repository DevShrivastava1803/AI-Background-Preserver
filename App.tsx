import React, { useState, useCallback } from 'react';
import { ImageDisplay } from './components/ImageDisplay';
import { Spinner } from './components/Spinner';
import { processImageWithGemini } from './services/geminiService';
import { urlToInfo, dataUrlToInfo, fileToInfo } from './utils/fileUtils';

interface ImageInfo {
  base64: string;
  mimeType: string;
}

const App: React.FC = () => {
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [originalImageInfo, setOriginalImageInfo] = useState<ImageInfo | null>(null);
  const [displayOriginalImageUrl, setDisplayOriginalImageUrl] = useState<string | null>(null);
  const [latestProcessedImageUrl, setLatestProcessedImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isFirstRequest, setIsFirstRequest] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const resetStateForNewImage = () => {
    setIsLoading(true);
    setLoadingMessage('Loading image...');
    setError(null);
    setDisplayOriginalImageUrl(null);
    setLatestProcessedImageUrl(null);
    setOriginalImageInfo(null);
    setPrompt('');
  };

  const processFile = async (file: File) => {
    resetStateForNewImage();

    try {
      const { base64, mimeType, dataUrl } = await fileToInfo(file);
      setOriginalImageInfo({ base64, mimeType });
      setDisplayOriginalImageUrl(dataUrl);
      setIsFirstRequest(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load image from file.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = '';
  };

  const handleLoadImage = async () => {
    if (!imageUrlInput.trim()) {
      setError("Please enter an image URL.");
      return;
    }
    
    resetStateForNewImage();

    try {
      const { base64, mimeType, dataUrl } = await urlToInfo(imageUrlInput);
      setOriginalImageInfo({ base64, mimeType });
      setDisplayOriginalImageUrl(dataUrl);
      setIsFirstRequest(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load image from URL.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        processFile(file);
    } else {
        setError("Invalid file type. Please drop an image file.");
    }
  };

  const handleProcessImage = useCallback(async () => {
    if (!originalImageInfo) {
      setError('Please load an image first.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage(isFirstRequest ? 'Cleaning background...' : 'Applying refinement...');
    setError(null);

    try {
      let base64Image: string;
      let mimeType: string;
      let currentPrompt: string;

      if (isFirstRequest) {
        base64Image = originalImageInfo.base64;
        mimeType = originalImageInfo.mimeType;
        currentPrompt = "Identify and meticulously remove all people and text. Intelligently and realistically reconstruct the background. The output image should look as if the people and text were never there. Provide a clean, preserved background suitable for graphic design and digital creations.";
      } else {
        if (!latestProcessedImageUrl) {
          throw new Error("Cannot apply refinement, the processed image is missing.");
        }
        if (!prompt.trim()) {
          setError("Please provide a refinement instruction.");
          setIsLoading(false);
          return;
        }
        const { base64, mimeType: processedMimeType } = dataUrlToInfo(latestProcessedImageUrl);
        base64Image = base64;
        mimeType = processedMimeType;
        currentPrompt = prompt;
      }

      const resultBase64 = await processImageWithGemini(base64Image, mimeType, currentPrompt);
      
      setLatestProcessedImageUrl(`data:image/png;base64,${resultBase64}`);
      setIsFirstRequest(false);
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [originalImageInfo, prompt, isFirstRequest, latestProcessedImageUrl]);

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
            Upload an image or use a URL to instantly remove people and text, then use prompts to refine it further.
          </p>
        </header>

        <main>
          <div className="bg-gray-800/50 rounded-2xl shadow-2xl p-6 mb-8 backdrop-blur-sm border border-gray-700">
            <div className="flex border-b border-gray-700 mb-4">
              <TabButton mode="upload" label="Upload Image" />
              <TabButton mode="url" label="Image URL" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
                  <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={isLoading} />
                  <label htmlFor="file-upload" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-teal-500/50 cursor-pointer">
                      {isLoading && loadingMessage === 'Loading image...' ? <Spinner small /> : 'Choose File'}
                  </label>
                  <p className="text-sm text-gray-500 mt-2">or drag and drop an image</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoadImage()}
                      placeholder="Paste an image URL here"
                      disabled={isLoading}
                      className="flex-grow bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 transition disabled:opacity-50"
                  />
                  <button
                    onClick={handleLoadImage}
                    disabled={isLoading}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-teal-500/50 flex items-center justify-center gap-2"
                  >
                    {isLoading && loadingMessage === 'Loading image...' && <Spinner small />}
                    Load Image
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                 <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Refine further (e.g., 'make it a painting')"
                    disabled={isFirstRequest || isLoading || !originalImageInfo}
                    className="flex-grow bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleProcessImage}
                  disabled={isLoading || !originalImageInfo}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-4 focus:ring-blue-500/50 flex items-center justify-center gap-2"
                >
                   {isLoading && loadingMessage !== 'Loading image...' && <Spinner small />}
                   {isFirstRequest ? 'Clean Background' : 'Apply Refinement'}
                </button>
              </div>
            </div>
             {error && (
              <div className="mt-4 text-center bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ImageDisplay title="Original" imageUrl={displayOriginalImageUrl} isLoading={isLoading && loadingMessage === 'Loading image...'} />
            <ImageDisplay title="Processed" imageUrl={latestProcessedImageUrl} isLoading={isLoading && loadingMessage !== 'Loading image...'} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;