# karitonov.github.io

MkDocs で構築したポートフォリオ・サイトです。
GitHub Pages（`gh-pages` ブランチ）で公開しています。

## 構成

```
docs/
├── index.md          # トップページ（ポートフォリオ）
├── about.md          # About ページ
├── stylesheets/
│   └── style.css     # カスタム CSS
└── block/            # ブロック崩しゲーム（静的 HTML/JS）
mkdocs.yml            # MkDocs 設定
```

## ローカルプレビュー

```bash
mkdocs serve
```

## デプロイ

```bash
mkdocs gh-deploy
```

`gh-pages` ブランチへビルド済みファイルを自動で push します。
