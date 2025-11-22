import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { fetchArticleList, fetchRawContent, parseZennArticle, resolveImagePaths } from '../services/github';
import { ZennArticle, TocItem } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { SelectionMenu } from './SelectionMenu';
import { Playground } from './Playground';

// --- Constants & Helpers ---

const getArticleImage = (article: ZennArticle) => {
  if (article.thumbnail) return article.thumbnail;
  return `https://picsum.photos/seed/${article.slug}/600/400`;
};

// --- UI Components ---

const SkeletonCard = () => (
  <div className="bg-surface h-[450px] w-full animate-pulse border border-white/10"></div>
);

const Breadcrumb: React.FC<{ items: { label: string; onClick?: () => void }[] }> = ({ items }) => (
  <nav className="flex items-center space-x-3 text-sm font-medium text-secondary mb-10 font-mono uppercase tracking-wider">
    {items.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && <span className="text-gray-700">/</span>}
        <button
          onClick={item.onClick}
          disabled={!item.onClick}
          className={`transition-all duration-300 ${item.onClick
            ? 'hover:text-primary cursor-pointer'
            : 'text-primary cursor-default'
            }`}
        >
          {item.label}
        </button>
      </React.Fragment>
    ))}
  </nav>
);

// --- Main Blog Component ---

export const Blog: React.FC = () => {
  const [articles, setArticles] = useState<ZennArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ZennArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toc, setToc] = useState<TocItem[]>([]);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);

  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [isContentCopied, setIsContentCopied] = useState(false);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        setLoading(true);
        const files = await fetchArticleList();
        if (files.length === 0) console.warn("No articles found.");

        const articlePromises = files.map(async (file) => {
          const raw = await fetchRawContent(file.download_url);
          return parseZennArticle(raw, file.name, file.download_url, file.html_url);
        });

        const loadedArticles = await Promise.all(articlePromises);
        setArticles(loadedArticles);
      } catch (err) {
        console.error("Error loading blog:", err);
      } finally {
        setLoading(false);
      }
    };
    loadArticles();
  }, []);

  // --- Actions ---
  const handleShare = async () => {
    if (!selectedArticle) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: selectedArticle.title, url });
      } catch (err) { console.log('Share failed', err); }
    } else {
      await navigator.clipboard.writeText(url);
      setIsUrlCopied(true);
      setTimeout(() => setIsUrlCopied(false), 2000);
    }
  };

  const handleCopyContent = async () => {
    if (!selectedArticle) return;
    try {
      await navigator.clipboard.writeText(selectedArticle.content);
      setIsContentCopied(true);
      setTimeout(() => setIsContentCopied(false), 2000);
    } catch (err) { console.error('Failed to copy', err); }
  };

  useEffect(() => {
    const handleCopy = async (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.copy-btn');
      if (!target) return;
      const container = target.closest('.zenn-code-block');
      if (!container) return;
      const codeEl = container.querySelector('code');
      if (!codeEl) return;
      try {
        await navigator.clipboard.writeText(codeEl.innerText || codeEl.textContent || '');
        const text = target.querySelector('.copy-text');
        if (text) text.textContent = 'Copied';
        setTimeout(() => { if (text) text.textContent = 'Copy'; }, 2000);
      } catch (err) { console.error('Failed to copy', err); }
    };
    document.addEventListener('click', handleCopy);
    return () => document.removeEventListener('click', handleCopy);
  }, []);

  // --- Markdown Rendering ---
  const safeString = (input: any): string => {
    if (typeof input === 'string') return input;
    if (typeof input === 'number') return String(input);
    if (input && typeof input === 'object' && input.text) return String(input.text);
    return '';
  };
  const generateId = (text: any) => safeString(text).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/(^-|-$)/g, '');

  const processContent = (article: ZennArticle) => {
    let content = resolveImagePaths(article.content, article.baseUrl);
    // 1. Auto-convert standalone URLs to card syntax
    content = content.replace(/(^|\n)(https?:\/\/[^\s]+)(?=\n|$)/g, '$1@[card]($2)');

    // 2. Replace cards with HTML (with newlines to prevent p-in-p nesting)
    content = content.replace(/@\[card\]\(([^)]+)\)/g, (match, url) => {
      const cleanUrl = url.trim();
      let domain = 'link';
      try { domain = new URL(cleanUrl).hostname; } catch (e) { }
      return `

<div className="zenn-link-card my-4">
  <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" className="block p-4 border border-border rounded-lg hover:bg-surfaceHighlight transition-colors">
    <div className="font-bold text-primary truncate">${domain}</div>
    <div className="text-xs text-secondary truncate mt-1">${cleanUrl}</div>
  </a>
</div>

`;
    });

    return content;
  };

  // --- TOC Extraction ---
  useEffect(() => {
    if (selectedArticle) {
      const tokens = marked.lexer(selectedArticle.content);
      const headings: TocItem[] = [];
      tokens.forEach(token => {
        if (token.type === 'heading') {
          headings.push({ id: generateId(token.text), text: token.text, level: token.depth });
        }
      });
      setToc(headings);
    }
  }, [selectedArticle]);

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // === Views ===
  if (selectedArticle) {
    return (
      <div className="min-h-screen font-sans pb-32">
        <SelectionMenu />
        {/* Navbar Detail */}
        <div className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background">
          <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={() => setSelectedArticle(null)} className="font-display font-bold text-xl tracking-tight hover:text-accent transition-colors">
                OpenBLog
              </button>
            </div>
            <div class="flex items-center gap-3">
              <ThemeToggle />
              <button onClick={handleShare} className="p-2 hover:bg-surfaceHighlight transition-colors text-secondary hover:text-primary rounded-full">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
              <a href={selectedArticle.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-surfaceHighlight transition-colors text-secondary hover:text-primary rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
            </div>
          </nav>
        </div>

        <main className="max-w-7xl mx-auto px-6 pt-32 grid grid-cols-1 lg:grid-cols-12 gap-16">
          <article className="lg:col-span-8">
            <header className="mb-16 text-left relative border-b border-white/10 pb-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="bg-surface text-secondary px-3 py-1 text-xs font-bold tracking-wide uppercase border border-white/10">{selectedArticle.type}</span>
                {selectedArticle.topics?.map(t => (
                  <span key={t} className="text-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider">#{t}</span>
                ))}
              </div>
              <h1 className="text-5xl md:text-6xl font-display font-bold leading-tight tracking-tight mb-8 text-primary">
                {selectedArticle.title}
              </h1>

              <div className="flex items-center gap-4 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface rounded-full overflow-hidden border border-white/10">
                    <img src={`https://ui-avatars.com/api/?name=TD&background=121212&color=fff`} alt="Author" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-primary uppercase tracking-wide">TechDev Team</p>
                    <p className="text-[10px] text-secondary uppercase tracking-wider">Published on 2025.11.21</p>
                  </div>
                </div>
              </div>

              <div className="w-full aspect-[21/9] overflow-hidden border border-white/10 relative group">
                <img src={getArticleImage(selectedArticle)} alt="Hero" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
              </div>
            </header>

            <div className="prose prose-lg prose-invert max-w-none">
              <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ node, children, ...props }: any) => {
                    // Return children directly to avoid double wrapping
                    return <>{children}</>;
                  },
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match) {
                      return (
                        <CodeBlock
                          language={match[1]}
                          value={String(children).replace(/\n$/, '')}
                        />
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  div: ({ node, className, children, ...props }: any) => {
                    // Handle link cards
                    if (className === 'zenn-link-card my-4') {
                      return (
                        <div className="my-6 border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-all">
                          {children}
                        </div>
                      );
                    }
                    return <div className={className} {...props}>{children}</div>;
                  },
                  h1: ({ node, children, ...props }: any) => {
                    const text = String(children);
                    const id = generateId(text);
                    return (
                      <h1 id={id} className="text-4xl md:text-5xl mt-16 mb-8 font-display font-bold text-primary tracking-tight scroll-mt-32 group relative border-b border-border pb-4" {...props}>
                        <span className="absolute -left-6 top-1 text-accent opacity-0 group-hover:opacity-100 transition-opacity text-lg">#</span>
                        {children}
                      </h1>
                    );
                  },
                  h2: ({ node, children, ...props }: any) => {
                    const text = String(children);
                    const id = generateId(text);
                    return (
                      <h2 id={id} className="text-2xl md:text-3xl mt-12 mb-6 font-display font-bold text-primary tracking-tight scroll-mt-32 group relative border-b border-border pb-4" {...props}>
                        <span className="absolute -left-6 top-1 text-accent opacity-0 group-hover:opacity-100 transition-opacity text-lg">#</span>
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ node, children, ...props }: any) => {
                    const text = String(children);
                    const id = generateId(text);
                    return (
                      <h3 id={id} className="text-xl md:text-2xl mt-8 mb-4 font-display font-bold text-primary tracking-tight scroll-mt-32 group relative" {...props}>
                        <span className="absolute -left-6 top-1 text-accent opacity-0 group-hover:opacity-100 transition-opacity text-lg">#</span>
                        {children}
                      </h3>
                    );
                  },
                  img: ({ node, src, alt, title, ...props }: any) => (
                    <div className="my-12 border border-border relative group rounded-2xl overflow-hidden bg-surface">
                      <img
                        src={src}
                        alt={alt}
                        loading="lazy"
                        className="w-full h-auto block object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/assets/tech.png'; }}
                        {...props}
                      />
                      {title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2">
                          <p className="text-center text-xs text-white/90 font-mono uppercase tracking-wider">{title}</p>
                        </div>
                      )}
                    </div>
                  ),
                  a: ({ node, href, children, ...props }: any) => {
                    // Check if parent is link card
                    const isLinkCard = props.className?.includes('block p-4');
                    return (
                      <a
                        href={href}
                        className={isLinkCard ? props.className : "text-accent no-underline hover:text-accentHover transition-colors"}
                        target={isLinkCard ? "_blank" : undefined}
                        rel={isLinkCard ? "noopener noreferrer" : undefined}
                        {...(isLinkCard ? {} : props)}
                      >
                        {children}
                      </a>
                    );
                  },
                  blockquote: ({ node, children, ...props }: any) => (
                    <blockquote className="border-l-2 border-accent bg-surface py-4 px-6 not-italic text-secondary" {...props}>
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {processContent(selectedArticle)}
              </ReactMarkdown>
            </div>
          </article>

          {/* Sidebar Column - Mobile floating button + Desktop sidebar */}
          <aside className="lg:col-span-4">
            {/* Mobile Floating Button */}
            <div className="lg:hidden fixed bottom-4 right-4 z-[9999]">
              <button
                onClick={() => setIsPlaygroundOpen(true)}
                className="bg-[#1E1E1E] hover:bg-[#2D2D2D] text-gray-300 hover:text-white border border-white/10 p-2.5 rounded-lg shadow-lg transition-all hover:shadow-xl flex items-center justify-center backdrop-blur-sm"
                title="Open Playground"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              </button>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block sticky top-32 space-y-6">
              <div className="bg-surface p-8 border border-white/10">
                <h4 className="font-display font-bold text-xs uppercase tracking-[0.2em] text-secondary mb-6">Contents</h4>
                <nav className="flex flex-col space-y-3">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`text-sm py-1 transition-all block truncate hover:translate-x-1 ${item.level === 1 ? 'font-bold text-primary' :
                        item.level === 2 ? 'pl-4 text-secondary hover:text-accent' : 'pl-8 text-gray-500 hover:text-accent'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(item.id);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                          history.pushState(null, '', `#${item.id}`);
                        }
                      }}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Playground Trigger */}
              <div className="bg-surface p-8 border border-white/10">
                <h4 className="font-display font-bold text-xs uppercase tracking-[0.2em] text-secondary mb-6">Tools</h4>
                <button
                  onClick={() => setIsPlaygroundOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accentHover text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-accent/20"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  Open Playground
                </button>
              </div>
            </div>
          </aside>
        </main>
        <Playground isOpen={isPlaygroundOpen} onClose={() => setIsPlaygroundOpen(false)} />
      </div >
    );
  }

  // === Index View ===
  return (
    <div className="min-h-screen font-sans pb-20 overflow-x-hidden relative">
      <SelectionMenu />
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-display font-bold text-xl tracking-tight text-primary">
            AgentAppDocument
          </div>
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <input
                type="text"
                className="w-full bg-surface border border-white/10 text-sm focus:ring-1 focus:ring-accent focus:border-accent text-primary placeholder-secondary font-sans h-10 px-4"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-3 top-2.5 text-secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-secondary hover:text-primary transition-all cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
          </div>
        </nav>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 pt-32">
        {/* Hero Header */}
        <div className="mb-24 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/30 mb-8">
            <span className="w-1.5 h-1.5 bg-accent"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">System Online v2.0</span>
          </div>

          <h1 className="text-6xl md:text-9xl font-display font-bold text-primary mb-8 tracking-tighter leading-[0.9]">
            LIMITLESS<br />
            <span className="text-secondary">KNOWLEDGE</span>
          </h1>
          <p className="text-xl text-secondary max-w-2xl font-light leading-relaxed border-l-2 border-accent pl-6">
            Curated insights for the modern developer. <br />
            Engineering, Design, and Future Tech.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <div
                key={article.slug}
                onClick={() => setSelectedArticle(article)}
                className="rounded-3xl bg-surface border border-border p-6 flex flex-col justify-between group cursor-pointer relative overflow-hidden hover:border-accent/50 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md min-h-[300px]"
              >
                {/* Image & Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/60 to-black/90 z-10"></div>
                <img
                  src={getArticleImage(article)}
                  alt={article.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-100"
                />

                {/* Content */}
                <div className="relative z-20 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 border border-white/20 px-2 py-1 rounded-md backdrop-blur-sm">{article.type}</span>
                    </div>
                    <h3 className="text-xl font-display font-bold text-white leading-snug mb-3 group-hover:text-accent transition-colors drop-shadow-md">
                      {article.title}
                    </h3>
                  </div>
                  <div className="text-xs font-mono text-gray-300 mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    {article.topics?.[0] || 'Tech'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-40 border-t border-white/10 py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <h2 className="font-display font-bold text-2xl text-primary mb-6 md:mb-0">AgentAppDocument</h2>
          <div className="flex gap-8 text-xs font-bold text-secondary uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">Github</a>
            <a href="#" className="hover:text-primary transition-colors">Twitter</a>
            <a href="#" className="hover:text-primary transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
};