import React, { useState } from 'react';
import { createAIClient } from '../services/gemini';

export const AssetGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt) return;
    setGenerating(true);
    setImageUrl(null);
    
    try {
      const ai = createAIClient();
      // Using standard gemini-2.5-flash-image for general generation as per prompt guide for "General Image Generation"
      // Note: The prompt recommends 'imagen-4.0-generate-001' for High-Quality, but 'gemini-2.5-flash-image' is also valid for general.
      // I'll use gemini-2.5-flash-image for speed and availability in preview, or imagen if strict.
      // Let's stick to the safest general instruction: 'gemini-2.5-flash-image' usually works well for demos.
      
      // Actually, let's try imagen 3/4 if available, but flash-image is safer for broad key access.
      // The guide says: High-Quality Image Generation Tasks: 'imagen-4.0-generate-001'
      // Let's use Imagen 4 as it's the "world class" option.
      
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
      });

      const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (base64ImageBytes) {
        setImageUrl(`data:image/jpeg;base64,${base64ImageBytes}`);
      }
    } catch (e) {
      console.error("Image generation failed", e);
      alert("Generation failed. Your API key might not support Imagen 4. Try a different prompt.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-full p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Asset Generator</h2>
          <p className="text-gray-400">Generate UI assets and placeholders with Imagen 4.0</p>
        </div>

        <div className="bg-gray-900 p-2 rounded-2xl border border-gray-800 shadow-xl flex items-center gap-2 mb-8">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the UI asset (e.g. 'futuristic dashboard background with neon lines')"
            className="flex-1 bg-transparent border-none focus:ring-0 text-white px-4 py-2 placeholder-gray-600"
            onKeyDown={(e) => e.key === 'Enter' && generateImage()}
          />
          <button 
            onClick={generateImage}
            disabled={generating || !prompt}
            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>

        <div className="aspect-video bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center overflow-hidden relative shadow-2xl">
          {imageUrl ? (
            <img src={imageUrl} alt="Generated asset" className="w-full h-full object-cover animate-in fade-in duration-700" />
          ) : (
            <div className="text-center">
                {generating ? (
                     <div className="flex flex-col items-center space-y-4">
                         <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-gray-500 text-sm animate-pulse">Dreaming up pixels...</p>
                     </div>
                ) : (
                    <div className="text-gray-700 flex flex-col items-center">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p>Preview area</p>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};