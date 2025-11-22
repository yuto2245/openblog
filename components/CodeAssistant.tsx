import React, { useState, useEffect, useRef } from 'react';
import { createAIClient, CODE_ASSISTANT_SYSTEM_INSTRUCTION } from '../services/gemini';
import { ChatMessage } from '../types';
import { GenerateContentResponse } from '@google/genai';

export const CodeAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your Gemini 2.5 powered coding assistant. How can I help you build today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Keep track of chat session instance
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    const ai = createAIClient();
    chatSessionRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: CODE_ASSISTANT_SYSTEM_INSTRUCTION,
      },
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chatSessionRef.current) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Optimistic update for stream
      const modelMsgPlaceholder: ChatMessage = { role: 'model', text: '', timestamp: new Date() };
      setMessages(prev => [...prev, modelMsgPlaceholder]);

      const result = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      
      let fullText = '';
      
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const text = c.text;
        if (text) {
            fullText += text;
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].text = fullText;
                return newMsgs;
            });
        }
      }
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Error: Could not connect to Gemini.', timestamp: new Date(), isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-4 whitespace-pre-wrap font-mono text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/10'
                  : msg.isError 
                    ? 'bg-red-900/20 text-red-400 border border-red-800'
                    : 'bg-gray-900 text-gray-300 border border-gray-800'
              }`}
            >
              {msg.text || (isLoading && idx === messages.length - 1 ? <span className="animate-pulse">Thinking...</span> : '')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about React, TypeScript, or paste code..."
              className="w-full bg-gray-950 text-gray-200 border border-gray-700 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none h-[52px] scrollbar-none"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-colors shadow-lg shadow-primary-500/20"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};