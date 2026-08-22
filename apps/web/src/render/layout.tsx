import type { FC, PropsWithChildren } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";
import { html } from "hono/html";
import { Header } from "./components/header";
import { Footer } from "./components/footer";

export type LayoutProps = PropsWithChildren<{
  title: string;
  description: string;
  keywords?: string;
  canonicalPath: string; // 例: "/news/ai-agent-1day-open/"
  ogType?: "website" | "article";
  ogImage?: string; // 絶対URL
  extraStyles?: string[]; // 追加のページ固有CSS（ルート相対パス）
  bodyScripts?: string[]; // </body>直前に読み込む追加スクリプト（ルート相対パス、deferで読み込む）
  jsonLd?: Record<string, unknown>[];
  isHome?: boolean; // トップページのみtrue（subpage-style.css を外し、Header/Footerのリンクをフラグメントのみにする）
}>;

const SITE_ORIGIN = "https://bitcraft.work";

// 現状8ファイルに個別コピーされているheader/footer・スクリプト読み込み順を
// このレイアウト1箇所に統合する（実装計画3章）。
export const Layout: FC<LayoutProps> = ({
  title,
  description,
  keywords,
  canonicalPath,
  ogType = "website",
  ogImage = `${SITE_ORIGIN}/image/sns-image.png`,
  extraStyles = [],
  bodyScripts = [],
  jsonLd = [],
  isHome = false,
  children,
}) => {
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,shrink-to-fit=no"
        />
        <meta name="description" content={description} />
        {keywords ? <meta name="keywords" content={keywords} /> : null}
        <meta name="format-detection" content="telephone=no,email=no,address=no" />
        <meta property="og:type" content={ogType} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="fb:app_id" content="1382898935938867" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@kuma_progr" />
        <meta name="twitter:creator" content="@kuma_progr" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="icon" type="shortcut icon" href="/image/bitcraft-logo-mini.png" />
        <link rel="stylesheet" href="/css/style.css" />
        {!isHome ? <link rel="stylesheet" href="/css/subpage-style.css" /> : null}
        <link rel="stylesheet" href="/css/animation.css" />
        {extraStyles.map((href) => (
          <link rel="stylesheet" href={href} />
        ))}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
        <title>{title}</title>
        {jsonLd.map((data) => (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
        ))}
      </head>
      <script src="https://cdn.jsdelivr.net/gh/studio-freight/lenis@1.0.19/bundled/lenis.min.js"></script>
      <script src="https://kit.fontawesome.com/88efd4f5df.js" crossorigin="anonymous"></script>
      <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
      <script src="/js/script.js" defer></script>
      {bodyScripts.map((src) => (
        <script src={src} defer></script>
      ))}
      <body>
        <Header isHome={isHome} />
        {children}
        <Footer isHome={isHome} />
      </body>
    </html>
  );
};

// c.html(<Layout>...</Layout>) は "<!DOCTYPE html>" を出力しないため、
// ブラウザがquirksモードで描画してしまい、Lenisのスクロール量計算が崩れて
// マウスホイール/トラックパッドでのスクロールが効かなくなる不具合を実機で確認した
// （矢印キーでのネイティブスクロールは影響を受けないため気づきにくい）。
// 全ルートは c.html(<Layout>...</Layout>) ではなく必ず renderPage(<Layout>...</Layout>)
// を使うこと。
export function renderPage(jsx: JSX.Element) {
  return html`<!DOCTYPE html>${jsx}`;
}
