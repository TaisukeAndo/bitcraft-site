#!/usr/bin/env python3
"""Grade a single add-seminar eval run against objective assertions.

Usage: python3 grade_eval.py <eval_id 1|2|3> <repo_path> > grading.json
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def read(path: Path) -> str:
    try:
        return path.read_text(errors="replace")
    except OSError:
        return ""


def find_new_seminar_dirs(repo: Path) -> list[Path]:
    seminar_root = repo / "service" / "seminar"
    known = {"claude-code-1day", "img"}
    if not seminar_root.is_dir():
        return []
    return [d for d in seminar_root.iterdir() if d.is_dir() and d.name not in known]


def event_date_meta(html: str) -> str | None:
    m = re.search(r'name="event-date"\s+content="([^"]*)"', html)
    return m.group(1) if m else None


def grade_eval1(repo: Path) -> list[dict]:
    results = []
    list_html = read(repo / "service" / "seminar" / "index.html")
    new_dirs = find_new_seminar_dirs(repo)
    detail_html, apply_html, slug = "", "", None
    if new_dirs:
        slug = new_dirs[0].name
        detail_html = read(new_dirs[0] / "index.html")
        apply_html = read(new_dirs[0] / "apply" / "index.html")

    results.append({
        "text": "新しいセミナー用の詳細ページ(index.html)が作成されている",
        "passed": bool(detail_html),
        "evidence": f"検出フォルダ: {[d.name for d in new_dirs]}" if new_dirs else "service/seminar/配下に新規フォルダが見つかりませんでした",
    })
    results.append({
        "text": "新しいセミナー用の申込ページ(apply/index.html)が作成されている",
        "passed": bool(apply_html),
        "evidence": f"{slug}/apply/index.html の有無" if slug else "新規フォルダなし",
    })

    detail_date = event_date_meta(detail_html)
    results.append({
        "text": "詳細ページのevent-dateが2026-09-12になっている",
        "passed": detail_date == "2026-09-12",
        "evidence": f"検出された値: {detail_date!r}",
    })
    apply_date = event_date_meta(apply_html)
    results.append({
        "text": "詳細ページと申込ページのevent-dateが一致している",
        "passed": bool(detail_date) and detail_date == apply_date,
        "evidence": f"detail={detail_date!r}, apply={apply_date!r}",
    })

    has_card_link = bool(slug) and f'href="./{slug}/"' in list_html
    results.append({
        "text": "一覧ページに新セミナーへのカードリンクが追加されている",
        "passed": has_card_link,
        "evidence": f'href="./{slug}/" の有無' if slug else "slug不明のため判定不可",
    })

    # claude-code-1day should no longer show 受付中 in the list page (either removed from upcoming or badge changed)
    cc_upcoming_block = None
    m = re.search(r'claude-code-1day.*?受付中', list_html, re.S)
    still_upcoming = m is not None
    results.append({
        "text": "既存のclaude-code-1dayセミナーが「過去開催」側に移動している(受付中バッジが残っていない)",
        "passed": not still_upcoming,
        "evidence": "claude-code-1dayへのリンクの近くに「受付中」バッジがまだ見つかりました" if still_upcoming else "claude-code-1dayに紐づく「受付中」バッジは見つかりませんでした",
    })

    leftover = bool(re.search(r"Claude Code|松石|松江", detail_html + apply_html))
    results.append({
        "text": "新しいセミナーのページにコピー元(Claude Code関連)の文言が残っていない",
        "passed": not leftover,
        "evidence": "「Claude Code」「松石」「松江」のいずれかが新ページ内に見つかりました" if leftover else "該当なし",
    })

    apply_js = read(repo / "service" / "seminar" / (slug or "") / "apply" / "apply-script.js") if slug else ""
    original_form_id = "1FAIpQLScfh0RytGYaCDME32fxCtmYFTSYOK2axD46jZmSIbyeYiKM0A"
    reused_original = original_form_id in apply_js
    results.append({
        "text": "Googleフォーム未接続であることが分かる状態になっている(元セミナーのフォームURLを黙って使い回していない)",
        "passed": bool(apply_js) and not reused_original,
        "evidence": "apply-script.jsが見つからないか、元のセミナーと同じGoogleフォームIDがそのまま使われています" if (not apply_js or reused_original) else "元セミナーとは異なるURL/プレースホルダーになっています",
    })
    return results


def grade_eval2(repo: Path) -> list[dict]:
    results = []
    list_html = read(repo / "service" / "seminar" / "index.html")
    new_dirs = find_new_seminar_dirs(repo)

    has_card_text = "経理DX入門セミナー" in list_html
    results.append({
        "text": "一覧ページの過去開催セクションに「経理DX入門セミナー」のカードが追加されている",
        "passed": has_card_text,
        "evidence": "テキストの検出結果",
    })

    price_ok = "12,000" in list_html  # site convention uses "¥12,000" rather than "12,000円"
    capacity_ok = "25名" in list_html
    results.append({
        "text": "参加費(12,000円)と定員(25名)がカードに反映されている",
        "passed": price_ok and capacity_ok,
        "evidence": f"price_ok={price_ok}, capacity_ok={capacity_ok}",
    })

    results.append({
        "text": "新しい詳細ページ用フォルダが作成されていない(過剰生成していない)",
        "passed": len(new_dirs) == 0,
        "evidence": f"検出された新規フォルダ: {[d.name for d in new_dirs]}",
    })

    apply_created = any((d / "apply").is_dir() for d in new_dirs)
    results.append({
        "text": "新しい申込ページ用フォルダが作成されていない",
        "passed": not apply_created,
        "evidence": f"apply created: {apply_created}",
    })

    m = re.search(r'経理DX入門セミナー.{0,600}', list_html, re.S)
    context = m.group(0) if m else ""
    past_badge = "終了" in context and "受付中" not in context
    results.append({
        "text": "カードのバッジが過去開催であることを示す表現(「終了」等)になっている",
        "passed": past_badge,
        "evidence": "カード周辺のバッジ表記を確認",
    })
    return results


def grade_eval3(repo: Path) -> list[dict]:
    results = []
    list_html = read(repo / "service" / "seminar" / "index.html")
    new_dirs = find_new_seminar_dirs(repo)
    detail_html, apply_html = "", ""
    if new_dirs:
        detail_html = read(new_dirs[0] / "index.html")
        apply_html = read(new_dirs[0] / "apply" / "index.html")

    results.append({
        "text": "何らかのセミナー詳細ページ(index.html)が新規作成されている",
        "passed": bool(detail_html),
        "evidence": f"検出フォルダ: {[d.name for d in new_dirs]}",
    })

    linked = bool(new_dirs) and any(f'href="./{d.name}/"' in list_html for d in new_dirs)
    results.append({
        "text": "一覧ページが更新され、新セミナーへの参照がある",
        "passed": linked,
        "evidence": f"linked={linked}",
    })

    detail_date = event_date_meta(detail_html)
    date_2027_03 = bool(detail_date) and detail_date.startswith("2027-03")
    results.append({
        "text": "開催日が「来年3月」相当(2027年3月)の日付になっている、または未確定である旨が明記されている",
        "passed": date_2027_03 or "TODO" in detail_html or "未定" in detail_html or "仮" in detail_html,
        "evidence": f"event-date={detail_date!r}",
    })

    placeholder_markers = any(k in (detail_html + apply_html) for k in ["TODO", "未定", "仮", "近日公開", "調整中"])
    results.append({
        "text": "未確定情報がプレースホルダー/TODOとして明示されており、断定的な作り込みをしていない",
        "passed": placeholder_markers,
        "evidence": f"placeholder_markers={placeholder_markers}",
    })
    return results


GRADERS = {1: grade_eval1, 2: grade_eval2, 3: grade_eval3}


def main() -> None:
    eval_id = int(sys.argv[1])
    repo = Path(sys.argv[2])
    grader = GRADERS[eval_id]
    expectations = grader(repo)
    passed = sum(1 for e in expectations if e["passed"])
    total = len(expectations)
    summary = {
        "passed": passed,
        "failed": total - passed,
        "total": total,
        "pass_rate": round(passed / total, 4) if total else 0.0,
    }
    print(json.dumps({"expectations": expectations, "summary": summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
