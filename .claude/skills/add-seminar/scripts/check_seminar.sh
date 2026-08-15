#!/usr/bin/env bash
# 新規セミナーページの機械的な整合性チェック。
# Usage: check_seminar.sh <slug>
# 例:    check_seminar.sh ai-writing-1day
set -uo pipefail

SLUG="${1:?Usage: check_seminar.sh <slug>}"
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
SEMINAR_DIR="$ROOT/service/seminar/$SLUG"
FAIL=0

fail() { echo "[NG] $1"; FAIL=1; }
ok()   { echo "[OK] $1"; }

if [ ! -d "$SEMINAR_DIR" ]; then
    fail "セミナーフォルダが見つかりません: $SEMINAR_DIR"
    exit 1
fi

DETAIL_HTML="$SEMINAR_DIR/index.html"
APPLY_HTML="$SEMINAR_DIR/apply/index.html"
LIST_HTML="$ROOT/service/seminar/index.html"

# --- event-date meta の一致確認 ---
if [ -f "$DETAIL_HTML" ] && [ -f "$APPLY_HTML" ]; then
    DETAIL_DATE=$(grep -o 'name="event-date" content="[^"]*"' "$DETAIL_HTML" | head -1 | sed -E 's/.*content="([^"]*)"/\1/')
    APPLY_DATE=$(grep -o 'name="event-date" content="[^"]*"' "$APPLY_HTML" | head -1 | sed -E 's/.*content="([^"]*)"/\1/')
    if [ -z "$DETAIL_DATE" ]; then
        fail "詳細ページに <meta name=\"event-date\"> がありません"
    elif [ -z "$APPLY_DATE" ]; then
        fail "申込ページに <meta name=\"event-date\"> がありません"
    elif [ "$DETAIL_DATE" != "$APPLY_DATE" ]; then
        fail "event-date が詳細ページ($DETAIL_DATE)と申込ページ($APPLY_DATE)で一致しません"
    else
        ok "event-date が一致しています ($DETAIL_DATE)"
    fi
else
    fail "詳細ページ or 申込ページが見つかりません"
fi

# --- コピー元テンプレートの文言が残っていないか ---
for f in "$DETAIL_HTML" "$APPLY_HTML"; do
    [ -f "$f" ] || continue
    if grep -qE 'Claude Code|claude-code-1day|松石|安藤.*仕事を渡せる' "$f"; then
        fail "$(basename "$(dirname "$f")")/$(basename "$f") にコピー元テンプレートの文言が残っている可能性があります（Claude Code / claude-code-1day / 松石 など）"
    fi
done
[ $FAIL -eq 0 ] && ok "コピー元テンプレートの文言の消し忘れは見つかりませんでした（誤検知の可能性もあるため目視でも確認してください）"

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

for f in "$DETAIL_HTML" "$APPLY_HTML" "$LIST_HTML"; do
    [ -f "$f" ] && check_local_paths "$f"
done
ok "相対リンクの実在チェックを実行しました（[NG] 行が無ければ問題ありません）"

# --- 一覧ページに新セミナーへのリンクがあるか ---
if grep -q "href=\"./$SLUG/\"" "$LIST_HTML"; then
    ok "一覧ページに ./$SLUG/ へのカードリンクがあります"
else
    fail "一覧ページ($LIST_HTML)に ./$SLUG/ へのカードリンクが見つかりません"
fi

exit $FAIL
