export interface ZennArticle {
  slug: string;
  title: string;
  emoji: string;
  type: string;
  published?: boolean;
  content: string;
  url: string; // GitHub html_url for viewing
  downloadUrl: string; // Raw content url
  baseUrl: string; // Base url for resolving relative assets
  thumbnail?: string; // Extracted from content
  topics?: string[];
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  BLOG = 'BLOG',
  CODE_ASSISTANT = 'CODE_ASSISTANT',
  LIVE_COMPANION = 'LIVE_COMPANION',
  NEWS_SCOUT = 'NEWS_SCOUT',
  ASSET_GEN = 'ASSET_GEN'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface SearchResult {
  title: string;
  uri: string;
}