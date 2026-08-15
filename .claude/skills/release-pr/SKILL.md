---
name: release-pr
description: bitcraft-site リポジトリで、レビュー可能な状態のPull Requestをsquash mergeしてmainに取り込み、本番公開（GitHub Pages, https://bitcraft.work/）へリリースする。ユーザーが「PRをリリースして」「PRをマージして」「このPRを本番に反映して」「公開して」のように言った時、または[[create-pr]]スキルで作ったPRの後続作業として次に進みたい場面で必ず使用すること。このリポジトリはCIを持たず、mainブランチへのマージがそのままGitHub Pagesの本番公開に直結するため、通常の「PRをマージする」以上の重みを持つ操作である。
---

# bitcraft-site の PR リリース

## なぜこの手順が必要か

このリポジトリの GitHub Pages は `main` ブランチの内容を直接ビルドして `https://bitcraft.work/` に配信する（legacy build、Actionsなし）。つまり `main` へのマージ＝本番公開であり、途中に承認ステップやCIチェックは存在しない。だからこそ「マージしていいPRか」をこのスキル自身が機械的に確認してから実行することが重要になる。

## 手順

### 1. 対象のPRを特定する

- ユーザーがPR番号やURLを指定していれば、それを使う。
- 指定がなければ、現在のブランチに対応するPRを確認する:
  ```bash
  gh pr view --json number,title,state,isDraft,mergeable,baseRefName,url
  ```
- 現在のブランチにPRが無い、または複数の候補がありうる場合は `gh pr list` で開いているPRを一覧し、どれを指すか判断する（曖昧なら選択肢をユーザーに聞く）。

### 2. マージ可能かを確認する

以下のいずれかに該当する場合は、マージを実行せずユーザーに状況を伝えて止まる。ここは「確認なしで進めてよい」フローの中でも唯一踏みとどまるべき安全弁で、理由は本番公開に直結する操作だから：

- `isDraft` が true（Draft PRはまだレビュー準備ができていない）
- `mergeable` が `CONFLICTING`（コンフリクトを解消しないと安全にマージできない）
- `state` が `OPEN` 以外（既にマージ済み/クローズ済み）
- `baseRefName` が `main` 以外（想定外のブランチへのマージは意図を確認する）

問題なければ、diffの概要を一度見ておく（何を本番に出すのかを把握しておく）:
```bash
gh pr diff <number> --stat
```

### 3. squash mergeする

CIが無いリポジトリなので、承認待ちで止める理由がない限りそのまま実行してよい:
```bash
gh pr merge <number> --squash --delete-branch
```
- `--delete-branch` でリモートのfeatureブランチも片付ける。
- コミットメッセージ（squashの要約）はデフォルトのままでよい（PRタイトル・本文が使われる）。

### 4. ローカルを追従させる

マージ後、ローカルの `main` を最新化し、マージ元のローカルブランチが残っていれば掃除する。マージ済みブランチをローカルに残したままにしないのは、次に新しい変更を始めるときに誤って古いブランチから作業してしまうのを防ぐため:
```bash
git checkout main
git pull origin main
git branch -d <merged-branch>   # ローカルにブランチが残っている場合のみ
```

### 5. 結果を報告する

マージしたPRのURLと、本番URL（`https://bitcraft.work/`）を伝える。GitHub Pages（legacy build）の反映には数十秒〜数分かかることがあるため、「すぐには反映されないことがある」旨も添える。反映確認が必要そうであれば、以下でビルド状況を見てもよい:
```bash
gh api repos/TaisukeAndo/bitcraft-site/pages/builds/latest
```
