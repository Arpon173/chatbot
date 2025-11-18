import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

// --- Types ---

interface ImageState {
  file: File;
  previewUrl: string;
}

// --- Helper Functions ---

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type });
};

// --- UI Components ---

const Header: React.FC = () => (
    <header className="bg-gray-800/80 backdrop-blur-sm p-4 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-center relative">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-400">
                  <path d="M11.25 3.75c-.265 0-.52.023-.772.066C7.265 4.14 5.33 6.324 5.33 9.013v3.414c0 1.246.363 2.428 1.025 3.445l.13.152c.264.308.54.598.828.872.29.276.59.54.898.792a.75.75 0 0 1-.822 1.256c-.33-.269-.646-.554-.954-.852-.303-.293-.594-.593-.872-.9-.705-1.096-1.076-2.37-1.076-3.71v-3.414c0-3.31 2.55-6.088 5.82-6.262.279-.02.557-.03.837-.03h.004c3.456 0 6.25 2.794 6.25 6.25v3.414c0 1.34-.37 2.614-1.076 3.71-.278.307-.57.607-.872.9-.308.298-.624.583-.954.852a.75.75 0 1 1-.822-1.256c.309-.252.608-.516.898-.792.289-.274.564-.564.828-.872l.13-.152c.662-1.017 1.025-2.199 1.025-3.445v-3.414c0-2.69-1.936-4.874-4.508-5.197A6.723 6.723 0 0 0 12.75 3.75h-1.5Z" />
                </svg>
                Nano Banana Image Editor
            </h1>
        </div>
    </header>
);

const LoadingSpinner: React.FC = () => (
  <div className="absolute inset-0 bg-gray-900/70 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
    <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-lg text-white">Generating your image...</p>
    <p className="text-sm text-gray-400">This may take a moment.</p>
  </div>
);

// --- Main App Component ---

function App() {
  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const [image, setImage] = useState<ImageState | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      setAi(genAI);
    } catch (e) {
      console.error(e);
      setError('Failed to initialize the AI. Please check your API key configuration.');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file (e.g., JPEG, PNG).');
        return;
      }
      setImage({
        file: file,
        previewUrl: URL.createObjectURL(file),
      });
      setError(null);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const resetApp = () => {
    setImage(null);
    setPrompt('');
    setError(null);
    // Revoke the old object URL to free up memory
    if (image?.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ai || !image || !prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const imagePart = await fileToGenerativePart(image.file);
      const textPart = { text: prompt };
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      
      const resultPart = response.candidates?.[0]?.content?.parts[0];
      if (resultPart?.inlineData) {
        const { data, mimeType } = resultPart.inlineData;
        const newDataUrl = `data:${mimeType};base64,${data}`;
        const newFile = await dataUrlToFile(newDataUrl, `edited-${image.file.name}`);
        
        // Revoke the old object URL before setting the new one
        URL.revokeObjectURL(image.previewUrl);
        
        setImage({
            file: newFile,
            previewUrl: newDataUrl
        });
        setPrompt('');
      } else {
        throw new Error('No image was generated. The prompt might be unsafe or unsupported. Please try a different prompt.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while editing the image.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-2xl flex-1 flex flex-col items-center">
        
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg w-full mb-4 text-center">
              {error}
            </div>
          )}

          {!image ? (
            <div 
              className="w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-2xl hover:border-indigo-500 hover:bg-gray-800/50 transition-colors duration-300 cursor-pointer"
              onClick={triggerFileUpload}
              onDrop={(e) => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } } as any); }}
              onDragOver={(e) => e.preventDefault()}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              <div className="text-center p-8">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-500 mb-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                <h2 className="text-xl font-semibold text-white">Upload an Image</h2>
                <p className="text-gray-400 mt-1">Click to browse or drag and drop here</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex-1 flex flex-col items-center relative">
              {isLoading && <LoadingSpinner />}
              <div className="w-full mb-4 rounded-lg overflow-hidden shadow-lg border border-gray-700">
                  <img src={image.previewUrl} alt="Editable image" className="w-full h-auto max-h-[60vh] object-contain bg-gray-800" />
              </div>

              <form onSubmit={handleEdit} className="w-full flex flex-col gap-4">
                 <div className="flex-1">
                     <label htmlFor="prompt-input" className="sr-only">Edit Prompt</label>
                     <input
                      id="prompt-input"
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., Add a retro filter, make the background blurry..."
                      className="w-full bg-gray-700 text-gray-200 rounded-lg py-3 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
                      disabled={isLoading}
                    />
                 </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={resetApp}
                    disabled={isLoading}
                    className="flex-1 bg-gray-600 text-white rounded-lg p-3 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition duration-200"
                  >
                    Upload New
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !prompt.trim()}
                    className="flex-1 bg-indigo-600 text-white rounded-lg p-3 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="m9.521 2.262-.256.495.256-.495Zm-1.428 15.475.256-.495-.256.495Zm-.256-.495 8.95-17.304-1.128-.582-8.95 17.304 1.128.582Zm-1.185-1.48L.347 9.81l-1.128.583 6.305 6.452 1.128-.582Z M10.42 17.15l6.305-6.452-1.128-.582-6.305 6.452 1.128.582ZM9.265 1.68l-8.95 17.304 1.128.582 8.95-17.304-1.128-.582Z" />
                      <path d="M8.093 17.737a.75.75 0 0 1-1.06 0l-6.306-6.452a.75.75 0 0 1 1.06-1.06l6.306 6.452a.75.75 0 0 1 0 1.06Z" />
                      <path d="M9.521 2.262a.75.75 0 0 1 1.06 0l8.95 17.304a.75.75 0 0 1-1.06 1.06l-8.95-17.304a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                    Generate
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
