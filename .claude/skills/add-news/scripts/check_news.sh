#!/usr/bin/env bash
# 新規ニュース記事の機械的な整合性チェック。
# Usage: check_news.sh <slug>
# 例:    check_news.sh ai-agent-1day-open
set -uo pipefail

SLUG="${1:?Usage: check_news.sh <slug>}"
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
NEWS_DIR="$ROOT/news/$SLUG"
FAIL=0

fail() { echo "[NG] $1"; FAIL=1; }
ok()   { echo "[OK] $1"; }

if [ ! -d "$NEWS_DIR" ]; then
    fail "ニュース記事フォルダが見つかりません: $NEWS_DIR"
    exit 1
fi

DETAIL_HTML="$NEWS_DIR/index.html"
LIST_HTML="$ROOT/news/index.html"
HOME_HTML="$ROOT/index.html"

# --- テンプレートの置換漏れ確認 ---
if [ -f "$DETAIL_HTML" ]; then
    if grep -qE '\{\{[A-Z_]+\}\}' "$DETAIL_HTML"; then
        fail "詳細ページに未置換のテンプレート変数 {{...}} が残っています"
    else
        ok "テンプレート変数の置換漏れは見つかりませんでした"
    fi
else
    fail "詳細ページが見つかりません: $DETAIL_HTML"
fi

# --- 相対リンク・画像パスの実在確認 ---
check_local_paths() {
    local file="$1"
    local base
    base="$(dirname "$file")"
    grep -oE '(href|src)="\.\.?/[^"]*"' "$file" | sed -E 's/^(href|src)="//; s/"$//' | while read -r path; do
        # 外部URL・アンカーのみのリンク・メール等は対象外
        case "$path" in
            \#*|http*|mailto:*) continue ;;
        esac
        target="$base/$path"
        # クエリやフラグメントを除去
        target="${target%%\?*}"
        target="${target%%#*}"
        if [ ! -e "$target" ]; then
            echo "[NG] $file: リンク先が存在しません -> $path"
        fi
    done
}

for f in "$DETAIL_HTML" "$LIST_HTML" "$HOME_HTML"; do
    [ -f "$f" ] && check_local_paths "$f"
done
ok "相対リンクの実在チェックを実行しました（[NG] 行が無ければ問題ありません）"

# --- お知らせ一覧ページ(news/index.html)に新記事へのリンクがあるか ---
if grep -q "href=\"./$SLUG/\"" "$LIST_HTML"; then
    ok "news/index.html に ./$SLUG/ へのリンクがあります"
else
    fail "news/index.html に ./$SLUG/ へのリンクが見つかりません"
fi

# --- トップページ(index.html)の#newsセクションに新記事へのリンクがあるか ---
if grep -q "href=\"/news/$SLUG/\"" "$HOME_HTML"; then
    ok "index.html の #news セクションに /news/$SLUG/ へのリンクがあります"
else
    fail "index.html の #news セクションに /news/$SLUG/ へのリンクが見つかりません"
fi

# --- news-empty プレースホルダーの消し忘れ確認（記事が1件以上あるのに残っていないか） ---
for f in "$LIST_HTML" "$HOME_HTML"; do
    if grep -q 'news-empty' "$f"; then
        fail "$f に空状態のプレースホルダー(news-empty)がまだ残っています（記事を追加したなら削除する）"
    fi
done
[ $FAIL -eq 0 ] || true

# --- トップページのコンパクト一覧が想定件数(3件)を超えていないか ---
HOME_COUNT=$(grep -o 'class="news-item"' "$HOME_HTML" | wc -l | tr -d ' ')
if [ "$HOME_COUNT" -gt 3 ]; then
    fail "index.html の #news セクションに news-item が ${HOME_COUNT} 件あります（デフォルト方針は最新3件までなので、古いものをトップページ側からだけ削除したか確認してください。news/index.html 側は全件残してよい）"
else
    ok "トップページのコンパクト一覧は ${HOME_COUNT} 件です（3件以内）"
fi

exit $FAIL
