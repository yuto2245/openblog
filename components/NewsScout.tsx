import React, { useState, useEffect } from 'react';
import { createAIClient, TECH_NEWS_PROMPT, searchTool, extractGroundingUrls } from '../services/gemini';
import { SearchResult } from '../types';

export const NewsScout: React.FC = () => {
  const [news, setNews] = useState<string>('');
  const [sources, setSources] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    setNews('');
    setSources([]);
    
    try {
      const ai = createAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: TECH_NEWS_PROMPT,
        config: {
          tools: [searchTool],
        },
      });

      const text = response.text;
      const urls = extractGroundingUrls(response.candidates?.[0]);

      if (text) setNews(text);
      if (urls) setSources(urls);
    } catch (e) {
      console.error("Error fetching news", e);
      setNews("Failed to fetch news. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="h-full p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
           <div>
             <h2 className="text-3xl font-bold text-white">Tech News Scout</h2>
             <p className="text-gray-400 mt-1">Latest updates from the developer world</p>
           </div>
           <button 
             onClick={fetchNews} 
             disabled={loading}
             className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors border border-gray-700 flex items-center gap-2"
           >
             <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             Refresh
           </button>
        </div>

        {loading && (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-900 rounded-2xl border border-gray-800"></div>
            ))}
          </div>
        )}

        {!loading && news && (
          <div className="grid gap-6">
             <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-lg">
                <div className="prose prose-invert prose-lg max-w-none text-gray-300 whitespace-pre-line leading-relaxed">
                  {news}
                </div>
             </div>

             {sources.length > 0 && (
               <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800/50">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Sources & References</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {sources.map((source, idx) => (
                     <a 
                       key={idx} 
                       href={source.uri} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center p-3 bg-gray-950 hover:bg-gray-800 border border-gray-800 hover:border-primary-500/50 rounded-xl transition-all duration-200 group"
                     >
                       <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center mr-3 group-hover:bg-primary-500/10 group-hover:text-primary-400 transition-colors">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                       </div>
                       <div className="overflow-hidden">
                         <p className="text-sm font-medium text-gray-200 truncate">{source.title}</p>
                         <p className="text-xs text-gray-500 truncate">{source.uri}</p>
                       </div>
                     </a>
                   ))}
                 </div>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};