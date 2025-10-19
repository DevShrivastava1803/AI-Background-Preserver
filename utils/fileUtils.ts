export const fileToInfo = (
  file: File
): Promise<{ base64: string; mimeType: string; dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error("Invalid file type. Please upload an image."));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl) {
        return reject(new Error("Failed to read the image file data."));
      }
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: file.type, dataUrl });
    };
    reader.onerror = (error) => reject(new Error(`An error occurred while reading the image file: ${error}`));
  });
};

export const urlToInfo = async (
  url: string
): Promise<{ base64: string; mimeType: string; dataUrl: string }> => {
  // Use a CORS proxy to bypass browser security restrictions.
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image. The server responded with status: ${response.status} ${response.statusText}. Please ensure the URL is correct and the image is publicly accessible.`);
    }
    
    const mimeType = response.headers.get('Content-Type');
    if (!mimeType || !mimeType.startsWith('image/')) {
      throw new Error('The URL did not point to a valid image. Please check the URL and try again.');
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (!dataUrl) {
            return reject(new Error("Failed to read the downloaded image data."));
        }
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType, dataUrl });
      };
      reader.onerror = (error) => reject(new Error(`An error occurred while reading the image file: ${error}`));
    });
  } catch (error) {
    console.error("Error fetching or converting image from URL:", error);
     if (error instanceof TypeError) {
      throw new Error("A network error occurred while fetching the image. This might be due to the proxy service or your connection. Please try again.");
    }
    // Rethrow other specific errors or a generic one
    throw error instanceof Error ? error : new Error("An unknown error occurred while fetching the image.");
  }
};


export const dataUrlToInfo = (dataUrl: string): { base64: string; mimeType: string } => {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid data URL format. Expected "data:<mime-type>;base64,<data>".');
  }

  const mimeType = match[1];
  const base64 = match[2];
  return { base64, mimeType };
};
