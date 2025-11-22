import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface PlaygroundProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info';
  args: any[];
  timestamp: number;
}

export const Playground: React.FC<PlaygroundProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js' | 'preview'>('html');
  const [reactMode, setReactMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(30); // percentage for desktop
  const [panelHeight, setPanelHeight] = useState(80); // percentage for mobile
  const [isResizing, setIsResizing] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchStartHeight, setTouchStartHeight] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const [html, setHtml] = useState('<div id="root"></div>');
  const [css, setCss] = useState(`body {
  font-family: sans-serif;
  padding: 20px;
  color: #333;
}

.container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  width: 200px;
}

.card img {
  width: 100%;
  border-radius: 4px;
}`);
  const [js, setJs] = useState(`const App = () => {
  return (
    <div>
      <h1>Hello React!</h1>
      <p>Start coding with JSX/TSX!</p>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`);
  const [srcDoc, setSrcDoc] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle desktop resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || isFullscreen) return;
      const newWidth = Math.max(30, Math.min(90, ((window.innerWidth - e.clientX) / window.innerWidth) * 100));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isFullscreen]);

  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mobile touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchStartHeight(panelHeight);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY - currentY;
    const deltaHeight = (deltaY / window.innerHeight) * 100;
    const newHeight = Math.max(30, Math.min(95, touchStartHeight + deltaHeight));
    setPanelHeight(newHeight);
  };

  const handleTouchEnd = () => {
    // Auto-close if dragged below threshold
    if (panelHeight < 35) {
      onClose();
      setPanelHeight(80); // Reset for next open
    }
  };

  // Listen to console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'console') {
        setConsoleLogs((prev) => [...prev, {
          type: event.data.method,
          args: event.data.args,
          timestamp: Date.now(),
        }]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Clear console when code changes
    setConsoleLogs([]);

    const timeout = setTimeout(() => {
      const consoleInterceptScript = `
        const originalConsole = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info,
        };

        ['log', 'error', 'warn', 'info'].forEach(method => {
          console[method] = function(...args) {
            originalConsole[method].apply(console, args);
            window.parent.postMessage({
              type: 'console',
              method: method,
              args: args.map(arg => {
                try {
                  return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                } catch (e) {
                  return String(arg);
                }
              }),
            }, '*');
          };
        });

        window.onerror = function(message, source, lineno, colno, error) {
          console.error(\`Error: \${message} at \${source}:\${lineno}:\${colno}\`);
          return true;
        };
      `;

      if (reactMode) {
        setSrcDoc(`
          <html>
            <head>
              <style>${css}</style>
              <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
              <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
              <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            </head>
            <body>
              ${html}
              <script>${consoleInterceptScript}</script>
              <script type="text/babel">${js}</script>
            </body>
          </html>
        `);
      } else {
        setSrcDoc(`
          <html>
            <head>
              <style>${css}</style>
            </head>
            <body>
              ${html}
              <script>${consoleInterceptScript}</script>
              <script>${js}</script>
            </body>
          </html>
        `);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [html, css, js, reactMode]);

  if (!isOpen) return null;

  const getConsoleIcon = (type: string) => {
    switch (type) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getConsoleColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <>
      {/* Backdrop for fullscreen mode (desktop only) */}
      {isFullscreen && (
        <div className="hidden md:block fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={() => setIsFullscreen(false)} />
      )}

      {/* Mobile backdrop */}
      <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={onClose} />

      {/* Panel - Responsive: Side panel (desktop) / Bottom sheet (mobile) */}
      <div
        className={`
          fixed bg-[#1E1E1E] border border-white/10 shadow-2xl z-[100] flex flex-col
          ${isFullscreen ? 'inset-0 w-full h-full' : ''}
          ${!isFullscreen && windowWidth >= 768 ? 'top-0 right-0 h-full border-l' : ''}
          ${windowWidth < 768 ? 'bottom-0 left-0 right-0 border-t rounded-t-2xl' : ''}
        `}
        style={{
          width: windowWidth < 768 ? '100%' : (isFullscreen ? '100%' : `${panelWidth}vw`),
          height: windowWidth < 768 ? `${panelHeight}vh` : (isFullscreen ? '100%' : '100vh'),
          transform: isResizing ? 'none' : (
            windowWidth < 768
              ? (isOpen ? 'translateY(0)' : 'translateY(100%)')
              : (isOpen ? 'translateX(0)' : 'translateX(100%)')
          ),
          transition: isResizing ? 'none' : 'all 300ms ease-out',
        }}
      >
        {/* Desktop Resize Handle */}
        <div
          className={`hidden md:block w-1 hover:w-2 bg-white/5 hover:bg-accent cursor-col-resize transition-all flex-shrink-0 ${isFullscreen ? 'hidden' : ''}`}
          onMouseDown={() => setIsResizing(true)}
        />

        {/* Mobile Drag Handle */}
        <div
          className="md:hidden w-full h-6 flex items-center justify-center cursor-grab active:cursor-grabbing flex-shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3 border-b border-white/5 bg-[#1E1E1E] flex-shrink-0">
            <div className="flex items-center gap-3 md:gap-4">
              <h2 className="text-white font-display font-semibold text-sm md:text-base tracking-tight">Playground</h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#2D2D2D] rounded-md border border-white/5">
                <button
                  onClick={() => setReactMode(!reactMode)}
                  className={`relative inline-flex h-3.5 md:h-4 w-7 md:w-8 items-center rounded-full transition-all duration-200 ${reactMode ? 'bg-accent/80' : 'bg-gray-600/50'}`}
                >
                  <span className={`inline-block h-2.5 md:h-3 w-2.5 md:w-3 transform rounded-full bg-white shadow-sm transition-transform ${reactMode ? 'translate-x-3.5 md:translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-[9px] md:text-[10px] font-medium text-gray-400 uppercase tracking-wide">React</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Fullscreen button - desktop only */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="hidden md:flex text-gray-500 hover:text-gray-300 transition-colors p-1.5 hover:bg-white/5 rounded-md"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1.5 hover:bg-white/5 rounded-md"
              >
                <svg className="w-4 md:w-4.5 h-4 md:h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#1E1E1E] flex-shrink-0 overflow-x-auto border-b border-white/5">
            {(['html', 'css', 'js', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 md:px-5 py-2 md:py-2.5 text-[10px] md:text-xs font-medium uppercase tracking-wide transition-all whitespace-nowrap relative ${activeTab === tab
                  ? 'text-white bg-[#252526]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#252526]/50'
                  }`}
              >
                {tab === 'js' ? (reactMode ? 'JSX' : 'JS') : tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 relative overflow-hidden">
            {/* Editors */}
            <div className={`absolute inset-0 ${activeTab === 'html' ? 'z-10' : 'z-0 hidden'}`}>
              <Editor
                height="100%"
                defaultLanguage="html"
                value={html}
                onChange={(value) => setHtml(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
            <div className={`absolute inset-0 ${activeTab === 'css' ? 'z-10' : 'z-0 hidden'}`}>
              <Editor
                height="100%"
                defaultLanguage="css"
                value={css}
                onChange={(value) => setCss(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
            <div className={`absolute inset-0 ${activeTab === 'js' ? 'z-10' : 'z-0 hidden'}`}>
              <Editor
                height="100%"
                defaultLanguage={reactMode ? 'typescript' : 'javascript'}
                value={js}
                onChange={(value) => setJs(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>

            {/* Preview with Console */}
            <div className={`absolute inset-0 flex flex-col ${activeTab === 'preview' ? 'z-10' : 'z-0 hidden'}`}>
              <div className="flex-1 bg-white overflow-hidden">
                <iframe
                  ref={iframeRef}
                  srcDoc={srcDoc}
                  title="preview"
                  sandbox="allow-scripts"
                  className="w-full h-full border-none"
                />
              </div>
              <div className="h-[150px] md:h-[200px] border-t border-white/10 bg-[#1E1E1E] overflow-y-auto flex-shrink-0">
                <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-white/10 bg-[#252526]">
                  <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Console</span>
                  <button
                    onClick={() => setConsoleLogs([])}
                    className="text-[10px] md:text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="p-2 font-mono text-xs md:text-sm">
                  {consoleLogs.length === 0 ? (
                    <div className="text-gray-500 text-xs">No console output</div>
                  ) : (
                    consoleLogs.map((log, index) => (
                      <div key={index} className={`flex gap-2 py-1 ${getConsoleColor(log.type)}`}>
                        <span className="flex-shrink-0">{getConsoleIcon(log.type)}</span>
                        <span className="flex-1 break-all">{log.args.join(' ')}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
