#!/usr/bin/env python3
"""OGP画像（sns-image.png等）をセミナーごとの設定JSONから生成する。

新規セミナー用（service/seminar/<slug>/img/ogp-config.json）にも、
過去実績を直接一覧に載せるだけのケース（service/seminar/img/past-seminar-<slug>.png）
にも、同じスクリプトを使う。1200x630のOGP/SNSシェア画像を1枚出力する。

Usage:
    # 通常の新規セミナー（詳細ページ配下の img/ に出力）
    python3 generate_ogp.py --config service/seminar/<slug>/img/ogp-config.json

    # 過去実績として一覧にだけ画像を置きたいケース（詳細ページを作らない）
    python3 generate_ogp.py --config /path/to/tmp-config.json \\
        --outdir service/seminar/img --out-name past-seminar-<slug>.png \\
        --speaker-cutout service/seminar/claude-code-1day/img/speaker_image_cutout.png

依存: ヘッドレスChrome（Google Chrome.app）, Pillow, rembg（初回の講師写真切り抜き時のみ）。
どれかが無い/失敗する環境では画像生成だけが失敗する。SKILL.md の指示どおり、
無理に環境を直そうとせず代替手段（既存画像の流用・ユーザーへの依頼）に切り替えること。
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# 文字数が制限を超えるとレイアウト（顔写真や余白）に被る可能性があるための簡易チェック。
TEXT_LIMITS = {
    "TITLE_LINE_1": 15,
    "TITLE_LINE_2": 15,
    "SMALL_DESC": 35,
}

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        html, body {
            margin: 0;
            padding: 0;
            background: __BG_NAVY__;
            width: 100%;
            height: 100%;
        }

        #canvas {
            position: relative;
            width: 1200px;
            height: 630px;
            background: __BG_NAVY__;
            font-family: 'Noto Sans JP', sans-serif;
            overflow: hidden;
        }

        /* Background Effects */
        .ai-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 1200px;
            height: 630px;
            background-image: url('__BG_EFFECT_IMAGE__');
            background-size: cover;
            background-position: center;
            opacity: 0.2;
            z-index: 0;
        }

        .bg-lines {
            position: absolute;
            top: -200px;
            left: -200px;
            width: 1600px;
            height: 1000px;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 100px,
                rgba(255,255,255,0.03) 100px,
                rgba(255,255,255,0.03) 200px
            );
            z-index: 1;
        }

        /* Top Left Logo (+ 任意の共催ロゴ。例: "bitcraft × SESSION") */
        .logo-row {
            position: absolute;
            top: 40px;
            left: 50px;
            height: 52px;
            z-index: 3;
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .logo-row .logo {
            height: 36px;
            display: block;
        }
        .logo-row .logo-x {
            color: __TEXT_WHITE__;
            font-size: 24px;
            font-weight: 900;
            line-height: 1;
        }
        .logo-row .partner-badge {
            background: #ffffff;
            border-radius: 8px;
            padding: 8px 18px;
            height: 52px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
        }
        .logo-row .partner-badge img {
            height: 100%;
            width: auto;
            display: block;
        }

        /* Small description */
        .small-desc {
            position: absolute;
            top: 125px;
            left: 50px;
            color: __TEXT_WHITE__;
            font-size: 24px;
            font-weight: 700;
            border-bottom: 2px dotted __TEXT_WHITE__;
            padding-bottom: 4px;
            z-index: 3;
            letter-spacing: 1px;
        }

        /* Main Titles */
        .title-1 {
            position: absolute;
            top: 190px;
            left: 50px;
            background: __TEXT_WHITE__;
            color: __TEXT_NAVY__;
            font-size: 50px;
            font-weight: 900;
            padding: 8px 24px;
            z-index: 3;
            letter-spacing: -1px;
        }
        .title-2 {
            position: absolute;
            top: 285px;
            left: 50px;
            background: __TEXT_WHITE__;
            color: __TEXT_NAVY__;
            font-size: 50px;
            font-weight: 900;
            padding: 8px 24px;
            z-index: 3;
            letter-spacing: -1px;
        }

        .sub-desc {
            position: absolute;
            top: 385px;
            left: 50px;
            color: __TEXT_WHITE__;
            font-size: 18px;
            font-weight: 700;
            line-height: 1.6;
            z-index: 3;
        }

        /* Bottom Left Date Area */
        .date-area {
            position: absolute;
            top: 480px; /* Fixed from top to avoid bottom clipping bugs */
            left: 50px;
            z-index: 3;
            color: __TEXT_WHITE__;
        }
        .date-main {
            font-size: 42px;
            font-weight: 900;
            display: flex;
            align-items: baseline;
            gap: 16px;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        .date-main span {
            font-size: 24px;
        }
        .time-badge-row {
            display: flex;
            align-items: center;
            gap: 20px;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .badge-venue {
            background: __TEXT_WHITE__;
            color: __TEXT_NAVY__;
            font-size: 20px;
            font-weight: 900;
            padding: 4px 20px;
            border-radius: 4px;
        }

        /* Speaker Image Area */
        .speaker-area {
            position: absolute;
            right: -320px;
            top: -520px; /* Fixed from top */
            height: 1300px;
            width: 1300px;
            z-index: 2;
            -webkit-mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,0.05) 5%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,1) 30%);
            mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,0.05) 5%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,1) 30%);
        }

        /* Dual Speaker（登壇者が2名で、かつ対等に扱いたい場合だけ描画。
           media.CO_SPEAKER_IMAGE_CUTOUT がある構成では、こちらが1名構成の
           speaker-area / speaker-info-box をまるごと置き換える（create_layout_html
           側で __SPEAKER_SECTION__ に何を差し込むかで分岐する）。
           2枚の写真を右半分に同じ高さで横並びし、各写真の下にプレーンテキストで
           氏名（ルビ）・肩書き・経歴2行を添える。単一講師用の .speaker-silhouette /
           .speaker-img とはクラス名を分け、cascadeの巻き込みを避けている。 */
        .dual-speaker-area {
            position: absolute;
            top: 70px;
            right: 0;
            height: 400px;
            z-index: 2;
            display: flex;
            /* widthは指定しない（shrink-to-fitで2枠の合計に自動フィットさせる）。
               各スロットの実寸は .dual-speaker-slot 側の flex-basis（インライン, px単位）
               で決まる。写真ごとに被写体のアスペクト比が違う（全身/バストアップ等）ため、
               ここを固定幅にすると片方だけ小さく詰まって見える事故が起きる。 */
        }
        .dual-speaker-slot {
            position: relative;
            flex: 0 0 auto;
            height: 100%;
        }
        .ds-silhouette {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(circle, __ACCENT_BLUE__ 3px, rgba(0,163,255,0) 3.5px);
            background-size: 16px 16px;
            -webkit-mask-size: cover;
            mask-size: cover;
            -webkit-mask-position: bottom center;
            mask-position: bottom center;
            -webkit-mask-repeat: no-repeat;
            mask-repeat: no-repeat;
            opacity: 0.8;
        }
        .ds-photo {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            /* containだと枠の横幅が狭い方（等身大のジェスチャー写真等）だけ縦が
               縮んで2人のスケールが揃わないため、coverで枠の高さいっぱいに
               揃える（枠幅がその分だけ左右をわずかにクロップする）。 */
            object-fit: cover;
            object-position: bottom center;
            filter: brightness(1.1) contrast(1.1);
        }

        .dual-speaker-names {
            position: absolute;
            top: 478px;
            right: 0;
            z-index: 3;
            display: flex;
            color: __TEXT_WHITE__;
        }
        .dsn-col {
            flex: 0 0 auto;
            padding-right: 16px;
            box-sizing: border-box;
            /* 枠は2人分の合計幅を date-area の白バッジ（会場表記の長さ次第で
               右端が動く）と衝突しない範囲に収めているため、ここは横に余裕が
               あまりない。折り返し事故を避けるため .speaker-info-box 系より
               ひとまわり小さいフォントサイズにしてある。 */
        }
        .dsn-name {
            font-size: 19px;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
            white-space: nowrap;
        }
        .dsn-ruby {
            font-size: 11px;
            font-weight: 700;
            opacity: 0.75;
            margin-left: 1px;
        }
        .dsn-title {
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 5px;
            opacity: 0.95;
            white-space: nowrap;
        }
        .dsn-bio {
            font-size: 11px;
            font-weight: 400;
            line-height: 1.5;
            opacity: 0.85;
            white-space: nowrap;
        }

        .speaker-silhouette {
            position: absolute;
            bottom: 0;
            right: 0;
            height: 100%;
            width: 100%;
            background-image: radial-gradient(circle, __ACCENT_BLUE__ 3px, rgba(0,163,255,0) 3.5px);
            background-size: 16px 16px;
            -webkit-mask-image: url('speaker_image_cutout.png');
            mask-image: url('speaker_image_cutout.png');
            -webkit-mask-size: contain;
            mask-size: contain;
            -webkit-mask-position: bottom right;
            mask-position: bottom right;
            -webkit-mask-repeat: no-repeat;
            mask-repeat: no-repeat;
            transform: translate(30px, -30px); /* Shift right and up */
            z-index: 1;
            opacity: 0.8;
        }

        .speaker-img {
            position: absolute;
            bottom: 0;
            right: 0;
            height: 100%;
            width: 100%;
            object-fit: contain;
            object-position: bottom right;
            filter: brightness(1.15) contrast(1.15);
            z-index: 2;
        }

        /* Speaker Info Box */
        .speaker-info-box {
            position: absolute;
            top: 480px; /* Fixed from top */
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            padding: 16px 32px 16px 40px;
            color: __TEXT_NAVY__;
            z-index: 4;
            text-align: left;
            clip-path: polygon(20px 0, 100% 0, 100% 100%, 0 100%);
            min-width: 320px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .info-company {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 0px;
            letter-spacing: 1px;
            color: #555;
        }
        .info-role {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 4px;
            letter-spacing: 1px;
            color: #555;
        }
        .info-name {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 2px;
            color: __TEXT_NAVY__;
        }
        .info-name-ruby {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 6px;
            margin-bottom: 2px;
            display: block;
            color: #555;
        }
    </style>
</head>
<body>
    <div id="canvas">
        <div class="ai-bg"></div>
        <div class="bg-lines"></div>

        <div class="logo-row">
            <img src="__LOGO_IMAGE__" class="logo" onerror="this.style.display='none'">__PARTNER_LOGO_BLOCK__
        </div>

        <div class="small-desc">__SMALL_DESC__</div>

        <div class="title-1">__TITLE_LINE_1__</div>
        <div class="title-2">__TITLE_LINE_2__</div>

        <div class="sub-desc">
            __SUB_DESC_LINE_1__<br>
            __SUB_DESC_LINE_2__
        </div>

        <div class="date-area">
            <div class="date-main">__DATE_MAIN__ <span>__DATE_SUB__</span></div>
            <div class="time-badge-row">
                __TIME_RANGE__
                <div class="badge-venue">__VENUE__</div>
            </div>
        </div>

        __SPEAKER_SECTION__
    </div>
</body>
</html>"""

# 1名構成（既定）。既存セミナー（例: claude-code-1day）はこのブロックのみを使う。
SINGLE_SPEAKER_SECTION = """
        <div class="speaker-area">
            <div class="speaker-silhouette"></div>
            <img src="speaker_image_cutout.png" class="speaker-img">
        </div>

        <div class="speaker-info-box">
            <div class="info-company">__SPEAKER_COMPANY__</div>
            <div class="info-role">__SPEAKER_ROLE__</div>
            <span class="info-name-ruby">__SPEAKER_NAME_RUBY__</span>
            <div class="info-name">__SPEAKER_NAME__</div>
        </div>"""

# 2名対等構成。media.CO_SPEAKER_IMAGE_CUTOUT がある場合に SINGLE_SPEAKER_SECTION の
# 代わりに使われる。トークンは create_layout_html 側の text/media 置換ループでまとめて
# 解決されるので、ここでは文字列を組み立てるだけでよい。
DUAL_SPEAKER_SECTION = """
        <div class="dual-speaker-area">
            <div class="dual-speaker-slot" style="flex-basis: __CO_SPEAKER_SLOT_WIDTH__;">
                <div class="ds-silhouette" style="-webkit-mask-image:url('__CO_SPEAKER_IMAGE_CUTOUT__');mask-image:url('__CO_SPEAKER_IMAGE_CUTOUT__');"></div>
                <img src="__CO_SPEAKER_IMAGE_CUTOUT__" class="ds-photo">
            </div>
            <div class="dual-speaker-slot" style="flex-basis: __SPEAKER_SLOT_WIDTH__;">
                <div class="ds-silhouette" style="-webkit-mask-image:url('speaker_image_cutout.png');mask-image:url('speaker_image_cutout.png');"></div>
                <img src="speaker_image_cutout.png" class="ds-photo">
            </div>
        </div>
        <div class="dual-speaker-names">
            <div class="dsn-col" style="flex-basis: __CO_SPEAKER_SLOT_WIDTH__;">
                <div class="dsn-name">__CO_SPEAKER_NAME__<span class="dsn-ruby">（__CO_SPEAKER_NAME_RUBY__）</span></div>
                <div class="dsn-title">__CO_SPEAKER_TITLE__</div>
                <div class="dsn-bio">__CO_SPEAKER_BIO_LINE_1__<br>__CO_SPEAKER_BIO_LINE_2__</div>
            </div>
            <div class="dsn-col" style="flex-basis: __SPEAKER_SLOT_WIDTH__;">
                <div class="dsn-name">__SPEAKER_NAME__<span class="dsn-ruby">（__SPEAKER_NAME_RUBY__）</span></div>
                <div class="dsn-title">__SPEAKER_TITLE__</div>
                <div class="dsn-bio">__SPEAKER_BIO_LINE_1__<br>__SPEAKER_BIO_LINE_2__</div>
            </div>
        </div>"""


def find_repo_root(start: Path) -> Path:
    """.git を目印にリポジトリルートを遡って探す。見つからなければ既知の深さにフォールバックする。

    このスクリプトは .claude/skills/add-seminar/scripts/ に置かれる前提。
    以前は生成先フォルダ内に置かれていたため、ロゴ画像パスが実行者のローカル絶対パス
    （file:///Users/ando/...）でハードコードされていたが、スクリプトが複数セミナーで
    共有される場所に移った以上それは崩れる前提になるので、ここで動的に解決する。
    """
    for parent in [start, *start.parents]:
        if (parent / ".git").exists():
            return parent
    return start.parents[3]


def validate_text(text: dict) -> None:
    for key, max_len in TEXT_LIMITS.items():
        value = text.get(key, "")
        if len(value) > max_len:
            print(
                f"⚠️ [警告] {key} の文字数（{len(value)}文字）が制限（{max_len}文字）を"
                "超えています。レイアウトが崩れる可能性があります。"
            )
    print("✅ 設定のバリデーション完了")


def ensure_speaker_cutout(outdir: Path, media: dict, speaker_cutout_arg: str | None) -> None:
    """講師写真の切り抜き（speaker_image_cutout.png）を outdir に用意する。

    優先順位: --speaker-cutout で明示指定 > outdir に既にある（再実行の冪等性） >
    media.SPEAKER_IMAGE_URL からダウンロード＋rembgで新規生成。
    """
    cutout_path = outdir / "speaker_image_cutout.png"

    if speaker_cutout_arg:
        src = Path(speaker_cutout_arg).expanduser().resolve()
        if not src.exists():
            sys.exit(f"Error: --speaker-cutout に指定されたファイルが見つかりません: {src}")
        if src != cutout_path:
            shutil.copy(src, cutout_path)
        print(f"講師写真は既存の切り抜きを再利用します: {src}")
        return

    if cutout_path.exists():
        print("講師写真の切り抜きは既に存在するため再利用します。")
        return

    speaker_url = media.get("SPEAKER_IMAGE_URL")
    if not speaker_url:
        sys.exit(
            "Error: 講師写真の切り抜きがなく、config の media.SPEAKER_IMAGE_URL も"
            "--speaker-cutout も指定されていません。どちらかを指定してください。"
        )

    speaker_image_path = outdir / "speaker_image.png"
    if not speaker_image_path.exists():
        print("Downloading speaker image...")
        subprocess.run(["curl", "-L", speaker_url, "-o", str(speaker_image_path)], check=True)

    print("Removing background (this might take a while)...")
    try:
        from rembg import remove
    except ImportError:
        sys.exit("Error: rembg not installed. Please run 'pip3 install rembg onnxruntime'")

    with open(speaker_image_path, "rb") as f:
        out = remove(f.read())
    with open(cutout_path, "wb") as f:
        f.write(out)


def create_layout_html(outdir: Path, text: dict, color: dict, media: dict) -> Path:
    html = HTML_TEMPLATE

    # 共催ロゴ（例: "bitcraft × SESSION"）は media.PARTNER_LOGO_IMAGE がある場合だけ、
    # 「×」＋白バッジに入れたロゴ画像として差し込む。無ければ空文字列でbitcraftロゴ単体のまま。
    partner_logo = media.get("PARTNER_LOGO_IMAGE", "")
    if partner_logo:
        partner_block = (
            '<span class="logo-x">×</span>'
            f'<span class="partner-badge"><img src="{partner_logo}"></span>'
        )
    else:
        partner_block = ""
    html = html.replace("__PARTNER_LOGO_BLOCK__", partner_block)

    # 共同登壇者（例: 吉井さん）は media.CO_SPEAKER_IMAGE_CUTOUT がある場合だけ、
    # メイン講師と対等な大きさの写真＋プレーンテキストのネームプレートを持つ
    # DUAL_SPEAKER_SECTION に切り替える。無ければ従来どおり1名構成のまま
    # （既存configはこのキーを持たないので挙動は変わらない）。
    speaker_section = DUAL_SPEAKER_SECTION if media.get("CO_SPEAKER_IMAGE_CUTOUT") else SINGLE_SPEAKER_SECTION
    html = html.replace("__SPEAKER_SECTION__", speaker_section)

    for key, val in text.items():
        html = html.replace(f"__{key}__", val)
    for key, val in color.items():
        html = html.replace(f"__{key}__", val)
    for key, val in media.items():
        html = html.replace(f"__{key}__", val)

    layout_path = outdir / "layout.html"
    layout_path.write_text(html)
    return layout_path


def capture_screenshot(outdir: Path, out_name: str) -> Path:
    print("Capturing screenshot via Headless Chrome...")
    tmp_shot = outdir / f".tmp-{out_name}"
    cmd = [
        CHROME_PATH,
        "--headless",
        "--hide-scrollbars",
        "--allow-file-access-from-files",
        "--virtual-time-budget=5000",
        f"--screenshot={tmp_shot.name}",
        "--window-size=1200,800",
        "layout.html",
    ]
    # layout.html 内の相対パス（speaker_image_cutout.png 等）は、このHTML自身の場所を
    # 基準にブラウザが解決する。Pythonプロセスのcwdは変えず、Chromeサブプロセスの
    # cwdだけ outdir に向けることで、スクリプト自体はどこから呼ばれても動く。
    subprocess.run(cmd, cwd=outdir, check=True)

    out_path = outdir / out_name
    print(f"Cropping image to exact 1200x630 -> {out_path}")
    try:
        from PIL import Image

        img = Image.open(tmp_shot)
        img.crop((0, 0, 1200, 630)).save(out_path)
        tmp_shot.unlink()
    except ImportError:
        print("Pillow not installed. Skipping crop.")
        tmp_shot.rename(out_path)

    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", required=True, help="text/color/media を持つ設定JSONへのパス")
    parser.add_argument(
        "--outdir",
        help="出力先ディレクトリ。省略時は --config ファイルと同じディレクトリ",
    )
    parser.add_argument(
        "--out-name",
        default="sns-image.png",
        help="出力ファイル名（既定: sns-image.png）。過去実績を service/seminar/img/ に"
        "直接置くケースでは past-seminar-<slug>.png のように指定する",
    )
    parser.add_argument(
        "--speaker-cutout",
        help="既存の切り抜き画像（speaker_image_cutout.png相当）を再利用する場合そのパスを指定する。"
        "同じ講師の使い回しや、詳細ページを作らず画像だけ生成したい過去実績ケースで使う",
    )
    args = parser.parse_args()

    config_path = Path(args.config).expanduser().resolve()
    if not config_path.exists():
        sys.exit(f"Error: config file not found: {config_path}")
    config = json.loads(config_path.read_text())

    text = config.get("text", {})
    color = config.get("color", {})
    media = config.get("media", {})

    outdir = Path(args.outdir).expanduser().resolve() if args.outdir else config_path.parent
    outdir.mkdir(parents=True, exist_ok=True)

    media.setdefault("BG_EFFECT_IMAGE", "ai_bg.png")
    # Dual Speaker（2名対等表示）の各写真枠の幅。デフォルトはメイン講師（全身寄りの
    # ジェスチャー写真になりがちで、同じ枠幅だとバストアップ写真より小さく収まって
    # しまう）をやや広めにしてある。被写体のトリミングが違う組み合わせでは
    # ogp-config.json の media.SPEAKER_SLOT_WIDTH / CO_SPEAKER_SLOT_WIDTH で調整する。
    if media.get("CO_SPEAKER_IMAGE_CUTOUT"):
        media.setdefault("SPEAKER_SLOT_WIDTH", "420px")
        media.setdefault("CO_SPEAKER_SLOT_WIDTH", "300px")
    if "LOGO_IMAGE" not in media:
        repo_root = find_repo_root(SCRIPT_DIR)
        logo_path = repo_root / "image" / "bitcraft-logo-white.png"
        media["LOGO_IMAGE"] = logo_path.as_uri() if logo_path.exists() else ""

    validate_text(text)
    ensure_speaker_cutout(outdir, media, args.speaker_cutout)
    create_layout_html(outdir, text, color, media)
    out_path = capture_screenshot(outdir, args.out_name)
    print(f"Saved as {out_path}!")


if __name__ == "__main__":
    main()
