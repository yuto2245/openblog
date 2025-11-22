import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    language: string;
    value: string;
    isDarkMode?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value, isDarkMode = true }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-6 rounded-lg overflow-hidden border border-border bg-[#1E1E1E] shadow-sm group">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D] border-b border-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-gray-400 uppercase">{language || 'text'}</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                >
                    {copied ? (
                        <>
                            <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="text-green-400">COPIED</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            <span>COPY</span>
                        </>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="relative">
                <SyntaxHighlighter
                    language={language}
                    style={isDarkMode ? vscDarkPlus : ghcolors}
                    customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '0.9rem', lineHeight: '1.5' }}
                    showLineNumbers={true}
                    lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};
