#!/usr/bin/env python3
"""Manually assemble benchmark.json from grading.json + timing.json for the add-seminar iteration-1 runs."""
import json
import math
from pathlib import Path

WS = Path("/Users/ando/Desktop/bitcraft-site/.claude/skills/add-seminar-workspace/iteration-1")

EVALS = [
    (1, "eval-1-full-scaffold"),
    (2, "eval-2-past-only"),
    (3, "eval-3-ambiguous"),
]


def stats(values):
    n = len(values)
    if n == 0:
        return {"mean": 0.0, "stddev": 0.0, "min": 0.0, "max": 0.0}
    mean = sum(values) / n
    if n > 1:
        variance = sum((x - mean) ** 2 for x in values) / (n - 1)
        stddev = math.sqrt(variance)
    else:
        stddev = 0.0
    return {"mean": round(mean, 4), "stddev": round(stddev, 4), "min": round(min(values), 4), "max": round(max(values), 4)}


runs = []
by_config = {"with_skill": [], "without_skill": []}

for eval_id, eval_dir in EVALS:
    meta = json.loads((WS / eval_dir / "eval_metadata.json").read_text())
    for config in ("with_skill", "without_skill"):
        run_dir = WS / eval_dir / config
        grading = json.loads((run_dir / "grading.json").read_text())
        timing = json.loads((run_dir / "timing.json").read_text())
        summary = grading["summary"]
        result = {
            "pass_rate": summary["pass_rate"],
            "passed": summary["passed"],
            "failed": summary["failed"],
            "total": summary["total"],
            "time_seconds": timing.get("total_duration_seconds", 0.0),
            "tokens": timing.get("total_tokens", 0),
            "tool_calls": 0,
            "errors": 0,
        }
        runs.append({
            "eval_id": eval_id,
            "eval_name": meta["eval_name"],
            "configuration": config,
            "run_number": 1,
            "result": result,
            "expectations": grading["expectations"],
            "notes": [],
        })
        by_config[config].append(result)

run_summary = {}
for config, results in by_config.items():
    run_summary[config] = {
        "pass_rate": stats([r["pass_rate"] for r in results]),
        "time_seconds": stats([r["time_seconds"] for r in results]),
        "tokens": stats([r["tokens"] for r in results]),
    }

delta_pass = run_summary["with_skill"]["pass_rate"]["mean"] - run_summary["without_skill"]["pass_rate"]["mean"]
delta_time = run_summary["with_skill"]["time_seconds"]["mean"] - run_summary["without_skill"]["time_seconds"]["mean"]
delta_tokens = run_summary["with_skill"]["tokens"]["mean"] - run_summary["without_skill"]["tokens"]["mean"]
run_summary["delta"] = {
    "pass_rate": f"{delta_pass:+.2f}",
    "time_seconds": f"{delta_time:+.1f}",
    "tokens": f"{delta_tokens:+.0f}",
}

benchmark = {
    "metadata": {
        "skill_name": "add-seminar",
        "skill_path": "/Users/ando/Desktop/bitcraft-site/.claude/skills/add-seminar",
        "executor_model": "claude-sonnet-5",
        "analyzer_model": "claude-sonnet-5",
        "timestamp": "2026-07-31T00:00:00Z",
        "evals_run": [1, 2, 3],
        "runs_per_configuration": 1,
    },
    "runs": runs,
    "run_summary": run_summary,
    "notes": [
        "全アサーションが with_skill / without_skill の両方で100%成功しており、機械的に検証可能な観点だけでは差がつかなかった。これは今回の3タスクがベースラインのClaude(スキル無し)でもclaude-code-1dayの実例を読めば大筋を再現できるほど手がかりが豊富だったため。",
        "Eval1(フルscaffold)ではトークン数・実行時間ともにwith_skillの方が少なく済んだ(スキルが調査・判断の手戻りを減らした可能性がある)。Eval2/3では両者ほぼ同等かbaselineがやや高コスト。",
        "OGP画像生成(generate_ogp.py)はwith_skill/baselineの両方で試行され、Eval1/Eval3では成功、Eval3のbaselineはrembg依存を避けて簡易版に変更するなど異なるアプローチを取っていた — 生成方法の一貫性は定量評価では見えないため、目視レビューが重要。",
        "定量アサーションが天井(100%)に張り付いているため、次回イテレーションではより厳しい/差がつきやすいアサーション(例: CSS/JSを不必要に書き換えていないか、Googleフォームのentry ID対応表の質、FAQ/VOICESの内容がテーマに即しているか)を追加することを検討する価値がある。",
    ],
}

out_path = WS.parent / "iteration-1-benchmark.json"
out_path.write_text(json.dumps(benchmark, ensure_ascii=False, indent=2) + "\n")
print(f"wrote {out_path}")
