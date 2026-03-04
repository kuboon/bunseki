# Lume Architecture

Lume（ルーメ）はDeno向けの静的サイトジェネレーター。このskillではLumeの基本的なアーキテクチャと主要な概念を説明する。

## ディレクトリ構造

```
client/
├── _config.ts          # サイト設定ファイル（必須）
├── _data.ts           # グローバルデータ
├── deno.json          # Denoプロジェクト設定
├── _includes/         # レイアウト・コンポーネント
│   └── layout.tsx
├── _plugins/          # カスタムプラグイン
│   └── bundle.ts
├── _site/             # ビルド出力（.gitignore推奨）
│   └── index.html
├── *.page.tsx         # ページファイル
└── styles/            # 静的アセット
```

## 主要な概念

### 1. サイト設定 (_config.ts)

Lumeサイトの中心となる設定ファイル。プラグインの読み込みと追加ファイルの指定を行う。

```typescript
import lume from "lume/mod.ts";
import jsx from "lume/plugins/jsx.ts";
import esbuild from "lume/plugins/esbuild.ts";

const site = lume();

// プラグインを使用
site.use(jsx());
site.use(esbuild());

// ビルドに含める追加ファイル
site.add("exporter.browser.ts");
site.add("styles");

export default site;
```

### 2. プラグインシステム

Lumeの機能を拡張するプラグイン：

- **jsx** - JSX/TSXページのサポート
- **esbuild** - TypeScript/JavaScriptのバンドル
- **tailwindcss** - Tailwind CSSの処理
- **pagefind** - 全文検索機能
- **source_maps** - ソースマップ生成
- **date** - 日付フォーマット
- カスタムプラグイン - `_plugins/`ディレクトリに配置

### 3. ページファイル (*.page.tsx)

`*.page.tsx`形式のファイルが自動的にHTMLページに変換される。

```tsx
// index.page.tsx
export const title = "Services - Bunseki";

interface IndexProps {
  services: string[];
}

export default function Index({ services }: IndexProps) {
  return (
    <div>
      <h1>{title}</h1>
      {services.map((service) => <div key={service}>{service}</div>)}
    </div>
  );
}
```

**重要な規約：**

- ファイル名が`*.page.tsx`の形式
- デフォルトエクスポートがページコンポーネント
- `export const`でメタデータ（title等）を定義可能
- propsで`_data.ts`のデータを受け取れる

### 4. グローバルデータ (_data.ts)

全ページで利用可能なデータを定義する。

```typescript
// _data.ts
export const layout = "layout.tsx";
export const services = ["service1", "service2"];

// 動的にページデータを生成
export const servicePages = services.map((service) => ({
  url: `/dashboard/${service}/`,
  title: `${service} - Dashboard`,
  serviceName: service,
}));
```

**機能：**

- ビルド時にトップレベルのawaitが実行される
- exportした変数が全ページのpropsで利用可能
- 動的なページ生成も可能

### 5. レイアウト (_includes/)

ページを包むレイアウトコンポーネント。

```tsx
// _includes/layout.tsx
interface LayoutProps {
  title: string;
  children: unknown;
}

export default function Layout({ title, children }: LayoutProps) {
  return (
    <html lang="jp">
      <head>
        <meta charset="UTF-8" />
        <title>{title}</title>
        <link href="/styles/styles.css" rel="stylesheet" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

**使い方：**

- `_data.ts`で`export const layout = "layout.tsx"`と指定
- または個別ページで`export const layout = "layout.tsx"`

### 6. ビルドプロセス

```bash
# 開発サーバー起動（ホットリロード付き）
deno task serve

# 本番用ビルド
deno task build
```

**ビルドの流れ：**

1. `_config.ts`を読み込み
2. `_data.ts`を実行してデータを準備
3. `*.page.tsx`ファイルを検出
4. プラグインが順次処理を実行
5. `_site/`ディレクトリに出力

## デバッグとトラブルシューティング

### インポートパスの設定

`deno.json`でインポートマップを設定：

```json
{
  "imports": {
    "lume/": "https://cdn.jsdelivr.net/gh/lumeland/lume@3.1.4/",
    "lume/jsx-runtime": "https://cdn.jsdelivr.net/gh/oscarotero/ssx@0.1.14/jsx-runtime.ts"
  },
  "compilerOptions": {
    "types": ["lume/types.ts"],
    "jsx": "react-jsx",
    "jsxImportSource": "lume/jsx-runtime"
  }
}
```

### パーミッション設定

Lumeに必要な権限を`deno.json`で定義：

```json
{
  "permissions": {
    "lume": {
      "read": true,
      "write": true,
      "net": ["0.0.0.0", "cdn.jsdelivr.net:443"],
      "env": true,
      "run": true
    }
  }
}
```

## よく使うパターン

### 動的ページ生成

```typescript
// _data.ts
export const pages = items.map((item) => ({
  url: `/items/${item.id}/`,
  layout: "item.tsx",
  ...item,
}));
```

### カスタムプラグイン

```typescript
// _plugins/custom.ts
import type { Site } from "lume/core/site.ts";

export function customPlugin() {
  return (site: Site) => {
    site.preprocess([".tsx"], (pages) => {
      // ページの前処理
    });
  };
}
```

## 参考リンク

- 公式サイト: https://lume.land/
- ドキュメント: https://lume.land/docs/
- GitHub: https://github.com/lumeland/lume
