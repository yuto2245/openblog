# OpenBLog

ReactとTypeScriptで構築された、モダンで機能豊富なブログプラットフォーム。Zennスタイルのマークダウン記事をインタラクティブなコードプレイグラウンドとともに表示します。

![Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 主な機能

### 📝 リッチな記事レンダリング
- **マークダウン対応**: Zenn形式のマークダウンとGitHub Flavored Markdown（GFM）に完全対応
- **シンタックスハイライト**: 行番号とコピー機能付きの美しいコードブロック
- **リンクカード**: URLを自動的にスタイリッシュなカードに変換
- **目次**: スムーズスクロールナビゲーション付きの自動生成目次
- **レスポンシブ画像**: スマートな画像解像度と遅延読み込み

### 💻 インタラクティブなコードプレイグラウンド
- **複数言語対応**: HTML、CSS、JavaScript/Reactの編集
- **ライブプレビュー**: コンソール出力付きのリアルタイムコード実行
- **Reactモード**: バニラJSとReact/JSXの切り替え
- **レスポンシブレイアウト**: 
  - デスクトップ: フルスクリーンモード付きリサイズ可能なサイドパネル
  - モバイル: スワイプジェスチャー対応のボトムシート
- **Monaco Editor**: プロフェッショナルなコード編集体験

### 🎨 モダンなデザイン
- **ダーク/ライトモード**: シームレスなテーマ切り替え
- **ミニマルUI**: クリーンで洗練されたインターフェース
- **モバイルファースト**: すべてのデバイスで完全レスポンシブ
- **スムーズなアニメーション**: 洗練されたトランジションとインタラクション

### 🔍 ユーザーエクスペリエンス
- **テキスト選択メニュー**: 選択したテキストに対するクイックアクション
- **検索**: タイトルやスラッグで記事をフィルタリング
- **パンくずナビゲーション**: 簡単な記事ナビゲーション
- **共有とコピー**: 組み込みの共有機能

## 前提条件

- **Node.js** (v16以上)
- **npm** または **yarn**

## ローカル開発

1. **リポジトリをクローン**
   ```bash
   git clone <あなたのリポジトリURL>
   cd zenn-docs-enterprise
   ```

2. **依存関係をインストール**
   ```bash
   npm install
   ```

3. **環境変数を設定**
   
   ルートディレクトリに`.env.local`ファイルを作成:
   ```env
   GEMINI_API_KEY=あなたのGemini APIキー
   VITE_REPO_OWNER=あなたのGitHubユーザー名
   VITE_REPO_NAME=あなたのリポジトリ名
   ```

4. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

5. **ブラウザで開く**
   
   `http://localhost:3000` にアクセス

## デプロイ

### GitHub Pages

このアプリは、リポジトリから自動的に記事を読み込むGitHub Pagesでのデプロイを想定して設計されています。

1. **リポジトリを設定**
   
   マークダウン記事がGitHubリポジトリの`articles/`ディレクトリにあることを確認してください。

2. **環境変数を更新**
   
   デプロイ環境で以下を設定:
   - `VITE_REPO_OWNER`: あなたのGitHubユーザー名
   - `VITE_REPO_NAME`: あなたのリポジトリ名

3. **本番用にビルド**
   ```bash
   npm run build
   ```

4. **デプロイ**
   
   `dist/`フォルダに本番用アプリが含まれています。GitHub Pagesまたは任意の静的ホスティングサービスにデプロイしてください。

### GitHub Pagesへの自動デプロイ（推奨）

`.github/workflows/deploy.yml`を作成:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build
        env:
          VITE_REPO_OWNER: ${{ github.repository_owner }}
          VITE_REPO_NAME: ${{ github.event.repository.name }}
        run: npm run build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

その後、リポジトリ設定でGitHub Pagesのソースを`gh-pages`ブランチに設定してください。

### 記事の構造

記事は`articles/`ディレクトリにマークダウンファイルとして配置し、以下の形式にします:

```markdown
---
title: "記事のタイトル"
emoji: "📝"
type: "tech"
topics: ["react", "typescript"]
published: true
---

# 記事の内容

マークダウンコンテンツをここに記述...
```

## 技術スタック

- **React 19** - UIフレームワーク
- **TypeScript** - 型安全性
- **Vite** - ビルドツールと開発サーバー
- **Tailwind CSS** - スタイリング
- **Monaco Editor** - コード編集
- **React Markdown** - マークダウンレンダリング
- **Prism** - シンタックスハイライト
- **Marked** - マークダウンパース

## プロジェクト構成

```
zenn-docs-enterprise/
├── components/
│   ├── Blog.tsx          # メインブログコンポーネント
│   ├── Playground.tsx    # インタラクティブなコードプレイグラウンド
│   ├── CodeBlock.tsx     # シンタックスハイライト付きコードブロック
│   └── ...
├── services/
│   └── github.ts         # GitHub API統合
├── public/
│   └── index.css         # グローバルスタイル
├── articles/             # マークダウン記事（GitHubリポジトリ内）
└── index.html            # エントリーポイント
```

## 機能の詳細

### コードプレイグラウンド

プレイグラウンドは以下をサポートします:
- **HTML/CSS/JavaScript**: バニラWebコードの記述とプレビュー
- **React/JSX**: モダンなコンポーネント開発のためのReactモード切り替え
- **コンソール出力**: ログ、エラー、警告をリアルタイムで表示
- **レスポンシブ**: モバイル（ボトムシート）とデスクトップ（サイドパネル）に対応

### マークダウン拡張

- **リンクカード**: `@[card](url)`または直接URLを貼り付け
- **コードブロック**: 言語検出付きシンタックスハイライト
- **テーブル**: GitHub Flavored Markdownテーブル
- **画像**: 自動パス解決

## カスタマイズ

自分のブログ用にカスタマイズする場合:

1. `services/github.ts`でリポジトリ情報を更新
2. `index.html`でサイトタイトルと説明を変更
3. `public/index.css`でカラーテーマをカスタマイズ
4. `articles/`ディレクトリに記事を追加

## ライセンス

MIT License - ご自由にお使いください！

## クレジット

最新のWeb技術で ❤️ を込めて構築。
[Zenn](https://zenn.dev/)にインスパイアされました。
