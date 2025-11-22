import React, { useEffect, useState, useRef } from 'react';

export const SelectionMenu: React.FC = () => {
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = window.setTimeout(() => {
                const selection = window.getSelection();
                if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                    setPosition(null);
                    setSelectedText('');
                    return;
                }

                const text = selection.toString().trim();
                setSelectedText(text);

                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                // Calculate position (centered above selection)
                // Using absolute positioning relative to the document
                setPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10 + window.scrollY, // 10px offset above, accounting for scroll
                });
            }, 10); // Small debounce
        };

        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleMarker = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.className = 'bg-yellow-200 dark:bg-yellow-900/50 text-primary';
        try {
            range.surroundContents(span);
            selection.removeAllRanges();
            setPosition(null);
        } catch (e) {
            console.warn("Cannot highlight across block elements", e);
            alert("Cannot highlight across multiple block elements.");
        }
    };

    const handleSearch = (urlTemplate: string) => {
        if (!selectedText) return;
        const url = urlTemplate.replace('{q}', encodeURIComponent(selectedText));
        window.open(url, '_blank');
        setPosition(null);
    };

    if (!position) return null;

    return (
        <div
            ref={menuRef}
            // Prevent clearing selection when clicking the menu
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-50 flex items-center gap-1 p-1 bg-surface border border-white/10 rounded-full shadow-elevation animate-in fade-in zoom-in duration-200"
            style={{
                left: position.x,
                top: position.y - 50, // Adjust to be above the text
                transform: 'translateX(-50%)',
            }}
        >
            <button
                onClick={handleMarker}
                className="p-2 text-secondary hover:text-primary hover:bg-surfaceHighlight rounded-full transition-colors"
                title="Marker"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
                onClick={() => handleSearch('https://grokipedia.com/search?q={q}')}
                className="px-3 py-1 text-xs font-bold text-secondary hover:text-primary hover:bg-surfaceHighlight rounded-full transition-colors"
            >
                Grokipedia
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
                onClick={() => handleSearch('https://grok.com/?q={q}')}
                className="px-3 py-1 text-xs font-bold text-secondary hover:text-primary hover:bg-surfaceHighlight rounded-full transition-colors"
            >
                Grok
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
                onClick={() => handleSearch('https://www.google.com/search?q={q}')}
                className="p-2 text-secondary hover:text-primary hover:bg-surfaceHighlight rounded-full transition-colors"
                title="Google"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>
        </div>
    );
};
