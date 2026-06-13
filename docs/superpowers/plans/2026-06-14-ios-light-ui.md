# Campus Ledger iOS Light UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ゲームUIを、広い余白、読みやすい文字、システムブルーを備えたiOS標準ライト風UIへ変更する。

**Architecture:** 学習ロジック、進捗スキーマ、オフライン機能は変更しない。`App.tsx`ではゲーム英字と開閉記号を日本語中心の表現へ置き換え、`styles.css`では既存クラスを維持したままデザイントークンと全画面スタイルをライトUIへ変更する。

**Tech Stack:** React 19、TypeScript、CSS、Vitest、Testing Library、Vite PWA

---

### Task 1: Replace Game Language with Native App Language

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing language tests**

Update the status test to require:

```ts
expect(screen.getByText("今日の連絡")).toBeInTheDocument();
expect(screen.getByText("案件 1/3")).toBeInTheDocument();
expect(screen.queryByText("MISSION BRIEFING")).not.toBeInTheDocument();
expect(screen.queryByText("MISSION 1-1")).not.toBeInTheDocument();
```

Update the rank-up test to require:

```ts
expect(
  await screen.findByRole("button", {
    name: "ランクアップ 経費担当"
  })
).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
npm test -- --run src/App.test.tsx
```

Expected: FAIL because the current UI still contains `MISSION` and `RANK UP`.

- [ ] **Step 3: Implement the Japanese labels**

In `src/App.tsx`:

```tsx
<span className="mission-label">今日の連絡</span>
```

```tsx
<span className="paper-kicker">
  {reviewing
    ? "復習案件"
    : `案件 ${questionIndex + 1}/${lesson.questions.length}`}
</span>
```

```tsx
<button className="rank-up-banner" aria-live="polite">
  <span>ランクアップ</span>
  <strong>{rankUp}</strong>
</button>
```

Replace the plus/minus display with text chevrons:

```tsx
<span className="chevron" aria-hidden="true">
  {storyExpanded ? "⌃" : "⌄"}
</span>
```

Use the same chevrons for `takeaway-toggle`.

- [ ] **Step 4: Run the focused test and verify GREEN**

```bash
npm test -- --run src/App.test.tsx
```

Expected: all App tests PASS.

- [ ] **Step 5: Commit the language changes**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "Replace game labels with native app language"
```

### Task 2: Apply the iOS Standard Light Visual System

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Replace design tokens**

Use:

```css
:root {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "Hiragino Sans", "Yu Gothic", sans-serif;
  color: #1c1c1e;
  background: #f2f2f7;
  --background: #f2f2f7;
  --surface: #ffffff;
  --label: #1c1c1e;
  --secondary-label: #636366;
  --separator: #d1d1d6;
  --separator-soft: #e5e5ea;
  --blue: #007aff;
  --blue-soft: #eaf3ff;
  --green: #34c759;
  --green-soft: #effaf2;
  --red: #ff3b30;
  --red-soft: #fff0ef;
  --orange: #ff9500;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
```

- [ ] **Step 2: Restyle the app shell and header**

- Remove grid and radial game backgrounds.
- Use `#f2f2f7` for the app background.
- Use a white masthead with dark labels.
- Use a simple rounded university mark.
- Use a 4px blue progress bar.
- Increase labels to at least 11px.

- [ ] **Step 3: Restyle status and content cards**

- Use 16px horizontal page padding.
- Use white surfaces, 14px radius, and subtle borders or shadows.
- Render rank and streak as two compact white information cards.
- Render offline readiness as a small inline status.
- Remove clipping, neon rails, diagonal decoration, and glow.

- [ ] **Step 4: Restyle the journal and feedback**

- Set problem text to 16px with at least 1.55 line height.
- Use 48px controls with 10px radius.
- Use neutral grouped backgrounds for debit and credit.
- Use blue focus rings.
- Use pale green and pale red feedback backgrounds.
- Replace glow and shake with a short opacity transition.

- [ ] **Step 5: Restyle fixed actions and navigation**

- Use a translucent white fixed action surface.
- Use a flat `#007aff` primary button with 12px radius.
- Use opacity feedback on press.
- Use translucent white bottom navigation.
- Use blue for the selected item and gray for unselected items.

- [ ] **Step 6: Restyle career, records, and exam screens**

- Convert timelines into white list rows.
- Use a white summary card for staff status.
- Separate destructive reset into a red treatment.
- Use white cards for mock exam gate and results.

- [ ] **Step 7: Preserve reduced motion**

Keep:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 8: Run tests and build**

```bash
npm test -- --run
GITHUB_ACTIONS=true npm run build
git diff --check
```

Expected: 37 or more tests PASS, TypeScript and PWA build PASS.

- [ ] **Step 9: Commit the visual redesign**

```bash
git add src/styles.css
git commit -m "Apply iOS light interface design"
```

### Task 3: Verify Mobile, Offline, and Deployment

**Files:**
- Modify only if verification reveals a defect.

- [ ] **Step 1: Verify 360x800**

Run a root-base production preview:

```bash
npm run build
npm exec vite preview -- --host 127.0.0.1
```

Verify:

- no horizontal scroll;
- all input controls are at least 44px;
- supporting text is at least 11px;
- rank and streak appear in small white cards;
- problem text and debit controls are readable;
- fixed submit action sits above navigation;
- the background is light gray, cards are white, and primary action is blue.

- [ ] **Step 2: Verify behavior**

- Expand and collapse `今日の連絡`.
- Expand and collapse `今日の要点`.
- Submit a correct entry and confirm `案件クリア`.
- Submit an incorrect entry and confirm `再確認が必要です`.
- Confirm the streak rules remain unchanged.

- [ ] **Step 3: Verify offline restart**

After loading and saving an answer:

1. stop the preview server;
2. reload;
3. confirm the Service Worker starts the app;
4. confirm rank, streak, answer, and feedback are restored.

- [ ] **Step 4: Run fresh final verification**

```bash
npm test -- --run
GITHUB_ACTIONS=true npm run build
git diff --check
git status --short
```

- [ ] **Step 5: Deploy to GitHub Pages**

```bash
git push origin HEAD:main
run_id=$(gh run list --repo kazu-mita/campus-ledger --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$run_id" --repo kazu-mita/campus-ledger --exit-status
```

- [ ] **Step 6: Verify the live site**

Open `https://kazu-mita.github.io/campus-ledger/`, apply the Service Worker update banner if shown, and verify the iOS light UI at 360px.
