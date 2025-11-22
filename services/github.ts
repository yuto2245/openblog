import { GitHubFile, ZennArticle } from '../types';

const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || 'yuto2245';
const REPO_NAME = import.meta.env.VITE_REPO_NAME || 'zenn-docs';

export const fetchArticleList = async (): Promise<GitHubFile[]> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/articles`);
    if (!response.ok) {
      console.error(`GitHub API Error: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    // API returns object if it's not a directory, or array if it is. We expect array.
    return Array.isArray(data) ? data.filter((file: any) => file.name.endsWith('.md')) : [];
  } catch (error) {
    console.error("Failed to fetch article list:", error);
    return [];
  }
};

export const fetchRawContent = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch content from ${url}`);
  }
  return await response.text();
};

export const resolveImagePaths = (markdown: string, baseUrl: string): string => {
  // Zenn usually stores images in /images at the root of the repo.
  // baseUrl should point to the raw repo root (e.g. https://raw.githubusercontent.com/user/repo/branch)

  return markdown.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
    if (url.startsWith('http') || url.startsWith('https')) {
      return match;
    }

    // Handle absolute path from repo root (e.g. /images/foo.png)
    if (url.startsWith('/')) {
      return `![${alt}](${baseUrl}${url})`;
    }

    // Handle relative path (e.g. images/foo.png or ./images/foo.png)
    // For Zenn, usually images are in /images, so we assume relative paths might need to be anchored to root if they are 'images/...'
    if (url.startsWith('images/')) {
      return `![${alt}](${baseUrl}/${url})`;
    }

    // If it's a relative path in the same dir, we might need the full path. 
    // But for now, let's assume standard Zenn structure.
    return `![${alt}](${baseUrl}/${url})`;
  });
};

const extractThumbnail = (markdown: string, baseUrl: string): string | undefined => {
  const imgRegex = /!\[.*?\]\((.*?)\)/;
  const match = markdown.match(imgRegex);

  if (match && match[1]) {
    let url = match[1];
    if (url.startsWith('http')) return url;

    // Handle Zenn style /images/
    if (url.startsWith('/images/') || url.startsWith('images/')) {
      const cleanPath = url.replace(/^\/?/, '');
      return `${baseUrl}/${cleanPath}`;
    }
  }
  return undefined;
};

export const parseZennArticle = (rawContent: string, filename: string, downloadUrl: string, htmlUrl: string): ZennArticle => {
  const slug = filename.replace('.md', '');

  // Derive base URL for images. 
  // downloadUrl format: https://raw.githubusercontent.com/user/repo/branch/articles/file.md
  // We need: https://raw.githubusercontent.com/user/repo/branch
  let baseUrl = '';
  const segments = downloadUrl.split('/');
  const branchIndex = segments.indexOf('main') !== -1 ? segments.indexOf('main') : segments.indexOf('master');

  if (branchIndex !== -1) {
    baseUrl = segments.slice(0, branchIndex + 1).join('/');
  } else {
    // Fallback: try to find 'articles' or 'books'
    const articlesIndex = segments.indexOf('articles');
    const booksIndex = segments.indexOf('books');
    const cutIndex = articlesIndex !== -1 ? articlesIndex : booksIndex;

    if (cutIndex !== -1) {
      baseUrl = segments.slice(0, cutIndex).join('/');
    } else {
      // Last resort: parent directory
      baseUrl = downloadUrl.substring(0, downloadUrl.lastIndexOf('/'));
    }
  }

  const frontmatterRegex = /^---\n([\s\S]+?)\n---\n([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);

  let meta: any = {};
  let content = rawContent;

  if (match) {
    const metaBlock = match[1];
    content = match[2];

    metaBlock.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join(':').trim();
        value = value.replace(/^['"](.*)['"]$/, '$1');
        if (key === 'topics') {
          meta[key] = value.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        } else {
          meta[key] = value;
        }
      }
    });
  } else {
    meta = { title: slug, emoji: '📄', type: 'tech' };
  }

  return {
    slug,
    title: meta.title || slug,
    emoji: meta.emoji || '📝',
    type: meta.type || 'tech',
    published: meta.published !== 'false',
    content: content,
    url: htmlUrl,
    downloadUrl: downloadUrl,
    baseUrl: baseUrl,
    thumbnail: extractThumbnail(content, baseUrl),
    topics: meta.topics || [],
  };
};
