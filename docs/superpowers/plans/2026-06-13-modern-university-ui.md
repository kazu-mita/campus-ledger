# Modern University UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Campus Ledgerの今日の業務画面を、問題入力を最優先する現代的な大学業務アプリへ刷新する。

**Architecture:** 学習・保存ロジックと教材データは変更せず、`App.tsx`の表示構造とローカルUI状態だけを変更する。スタイルは`styles.css`の既存クラスを整理し、360pxを基準とした単一カラム、折りたたみ、固定アクション領域を実装する。

**Tech Stack:** React 19、TypeScript、CSS、Vitest、Testing Library、Vite PWA

---

### Task 1: UI操作契約をテストで固定

**Files:**
- Modify: `src/App.test.tsx`

- [ ] **Step 1: 会話が初期状態で折りたたまれるテストを追加**

`先輩・佐藤からの連絡`ボタンが`aria-expanded="false"`で表示され、クリックすると全文が表示されることを検証する。

- [ ] **Step 2: 要点が折りたたまれるテストを追加**

`今日の要点`ボタンが初期状態で閉じており、クリック後に既存の要点文が表示されることを検証する。

- [ ] **Step 3: 仕訳入力の上下構造と固定操作領域を検証**

`借方を入力`と`貸方を入力`の見出し、および`data-testid="sticky-action"`内の`仕訳を提出`ボタンを検証する。

- [ ] **Step 4: テストが失敗することを確認**

Run: `npm test -- src/App.test.tsx`

Expected: 新しい見出し、折りたたみ、固定操作領域が未実装のためFAIL。

### Task 2: React表示構造を業務コンソール型へ変更

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: UI開閉状態を追加**

`storyExpanded`と`takeawayExpanded`を追加し、日付や画面変更時に初期状態へ戻す。

- [ ] **Step 2: ヘッダーと進捗を集約**

大学名、アプリ名、通信状態、Day番号、進捗バーを`masthead`内へまとめる。オフライン準備完了は小型バッジ、準備中のみ再試行ボタンを表示する。

- [ ] **Step 3: 会話を折りたたみへ変更**

`button.story-summary`に`aria-expanded`と`aria-controls`を設定し、閉じている時は一行要約、開いた時は役職と全文を表示する。

- [ ] **Step 4: 問題カードの情報階層を変更**

案件番号、配点、書類名、メタ情報、問題文、案件進捗を整理し、問題文を主要情報として配置する。

- [ ] **Step 5: 仕訳入力を上下配置へ変更**

既存`EntrySide`に説明ラベルを追加し、`journal`を単一カラム化する。各行は科目と金額の横並びを維持する。

- [ ] **Step 6: 要点を折りたたみへ変更**

`button.takeaway-toggle`と`aria-expanded`を追加し、開いた時だけ要点文と論点タグを描画する。

- [ ] **Step 7: 提出操作を固定領域へ移動**

問題カード内の主要ボタンを`div.sticky-action[data-testid="sticky-action"]`へ移す。通常学習、復習、模試で既存のイベントハンドラとラベルを維持する。

- [ ] **Step 8: UIテストを通す**

Run: `npm test -- src/App.test.tsx`

Expected: PASS。

### Task 3: 現代的大学業務スタイルを実装

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: デザイントークンを更新**

深緑`#0f3d35`、青緑`#177266`、背景`#f3f6f4`、白、グレー、アクセント橙を定義する。本文は端末内日本語フォントを使用する。

- [ ] **Step 2: コンパクトヘッダーと進捗バーを実装**

ヘッダー全体を約112px以内に収め、通信バッジと14日進捗を同じ領域へ配置する。

- [ ] **Step 3: 問題カードと上下入力を実装**

カード余白、問題文の行間、44px以上のフォーム高さを設定する。`.journal`を1列、`.entry-line`を科目と金額の2列へ変更する。

- [ ] **Step 4: 折りたたみとフィードバックを実装**

会話と要点の開閉状態を明確にし、正解・誤答はアイコン、枠線、背景、文章で区別する。

- [ ] **Step 5: 固定操作領域と下部ナビを実装**

固定操作領域をナビの直上へ配置し、本文下部へ合計160px以上の余白を確保する。主要ボタンの高さを52px以上にする。

- [ ] **Step 6: 360pxと広幅表示を調整**

360pxでは科目欄と金額欄を`minmax(0, 1fr) 116px`にし、狭すぎる場合のみ縦配置へ切り替える。620pxでは過度に横へ伸ばさない。

### Task 4: 回帰検証とブラウザ確認

**Files:**
- Modify only if defects are found: `src/App.tsx`, `src/styles.css`, `src/App.test.tsx`

- [ ] **Step 1: 全テストを実行**

Run: `npm test`

Expected: 全テストPASS。

- [ ] **Step 2: GitHub Pages条件でビルド**

Run: `GITHUB_ACTIONS=true npm run build`

Expected: TypeScriptとViteビルドが成功し、PWA precacheが生成される。

- [ ] **Step 3: 360pxブラウザ検証**

初期表示で問題文と借方入力が見え、会話と要点が開閉し、固定提出ボタンが表示されることを確認する。

- [ ] **Step 4: 仕訳フローを確認**

借方`現金 20,000`、貸方`売上 20,000`を入力し、正解フィードバックと次案件ボタンを確認する。

- [ ] **Step 5: オフライン回帰を確認**

Service Worker登録後にサーバー停止またはオフライン状態で再読込し、アプリと進捗が復元されることを確認する。

### Task 5: コミット・再デプロイ

**Files:**
- Commit all approved UI files and documentation.

- [ ] **Step 1: 差分確認**

Run: `git diff --check && git status --short`

Expected: 空白エラーなし。変更はUI、テスト、仕様・計画文書に限定。

- [ ] **Step 2: コミット**

Run:

```bash
git add src/App.tsx src/styles.css src/App.test.tsx docs/superpowers
git commit -m "Improve mobile study workflow UI"
```

- [ ] **Step 3: mainへpush**

Run: `git push origin HEAD:main`

- [ ] **Step 4: Pages Actionsを監視**

Run: `gh run watch <run-id> --repo kazu-mita/campus-ledger --exit-status`

Expected: build、test、deployがすべて成功。

- [ ] **Step 5: 公開URLを確認**

`https://kazu-mita.github.io/campus-ledger/`で新UI、manifest、Service Workerを確認する。
