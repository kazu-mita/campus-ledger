# Campus Ledger Game-Inspired UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Campus Ledgerを独自の家庭用ゲーム風UIへ刷新し、職員ランクと誤答で0に戻る連続正解を追加する。

**Architecture:** 職員ランクと連続正解の計算は新しい純粋関数モジュールへ分離する。進捗データはスキーマv2へ移行し、IndexedDBとJSONバックアップの両方でv1を自動変換する。画面構造は現在の学習導線を維持し、`App.tsx`へゲームステータス、ミッション表示、短いフィードバック状態を追加し、`styles.css`で独自の濃紺・シアン系UIとモーションを実装する。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Testing Library、IndexedDB (`idb`)、`vite-plugin-pwa`、CSS animations

---

## File Structure

- Create: `src/domain/gamification.ts`
  - 職員ランクの境界、次ランク条件、連続正解更新を扱う純粋関数。
- Create: `src/domain/gamification.test.ts`
  - ランク境界、正解加算、誤答リセット、重複加算防止を検証。
- Create: `src/storage/progressMigration.ts`
  - v1進捗をv2へ変換し、v2入力を正規化する。
- Create: `src/storage/progressMigration.test.ts`
  - 回答、復習、模試を保ったv1からv2への移行を検証。
- Modify: `src/domain/types.ts`
  - `LearnerProgress`をスキーマv2と連続正解フィールドへ更新。
- Modify: `src/storage/progressStore.ts`
  - 初期値をv2化し、読込時に移行を適用。
- Modify: `src/storage/progressStore.test.ts`
  - 初期値と旧データ移行を検証。
- Modify: `src/storage/backup.ts`
  - v2を書き出し、v1・v2を読み込めるようにする。
- Modify: `src/storage/backup.test.ts`
  - v2往復とv1バックアップ移行を検証。
- Modify: `src/App.tsx`
  - ゲームステータス、ミッション表記、連続正解更新、案件クリア、ランクアップ表示を追加。
- Modify: `src/App.test.tsx`
  - ランク、連続正解、誤答リセット、表示通知を検証。
- Modify: `src/styles.css`
  - ゲームUI、フィードバック演出、レスポンシブ、モーション削減を実装。

### Task 1: Add Pure Gamification Rules

**Files:**
- Create: `src/domain/gamification.ts`
- Create: `src/domain/gamification.test.ts`

- [ ] **Step 1: Write failing rank and streak tests**

```ts
import { describe, expect, it } from "vitest";
import { getStaffRank, updateStreak } from "./gamification";

describe("getStaffRank", () => {
  it.each([
    [0, "研修職員"],
    [2, "研修職員"],
    [3, "経費担当"],
    [5, "経費担当"],
    [6, "主任補佐"],
    [9, "主任補佐"],
    [10, "経理主任"],
    [14, "経理主任"]
  ])("%i completed days returns %s", (completedDays, name) => {
    expect(getStaffRank(completedDays).name).toBe(name);
  });
});

describe("updateStreak", () => {
  it("increments after a new correct answer", () => {
    expect(updateStreak(2, 4, false, true)).toEqual({
      currentStreak: 3,
      bestStreak: 4
    });
  });

  it("resets to zero after an incorrect answer", () => {
    expect(updateStreak(5, 7, false, false)).toEqual({
      currentStreak: 0,
      bestStreak: 7
    });
  });

  it("does not count an already-correct answer twice", () => {
    expect(updateStreak(3, 3, true, true)).toEqual({
      currentStreak: 3,
      bestStreak: 3
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --run src/domain/gamification.test.ts
```

Expected: FAIL because `./gamification` does not exist.

- [ ] **Step 3: Implement rank and streak rules**

```ts
export type StaffRank = {
  name: "研修職員" | "経費担当" | "主任補佐" | "経理主任";
  minimumDays: number;
  nextRankAt?: number;
};

const ranks: StaffRank[] = [
  { name: "研修職員", minimumDays: 0, nextRankAt: 3 },
  { name: "経費担当", minimumDays: 3, nextRankAt: 6 },
  { name: "主任補佐", minimumDays: 6, nextRankAt: 10 },
  { name: "経理主任", minimumDays: 10 }
];

export const getStaffRank = (completedDays: number): StaffRank =>
  [...ranks]
    .reverse()
    .find((rank) => completedDays >= rank.minimumDays) ?? ranks[0];

export const updateStreak = (
  currentStreak: number,
  bestStreak: number,
  previouslyCorrect: boolean,
  correct: boolean
) => {
  if (!correct) return { currentStreak: 0, bestStreak };
  if (previouslyCorrect) return { currentStreak, bestStreak };
  const nextCurrent = currentStreak + 1;
  return {
    currentStreak: nextCurrent,
    bestStreak: Math.max(bestStreak, nextCurrent)
  };
};
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm test -- --run src/domain/gamification.test.ts
```

Expected: all gamification tests PASS.

- [ ] **Step 5: Commit the pure rules**

```bash
git add src/domain/gamification.ts src/domain/gamification.test.ts
git commit -m "Add staff rank and streak rules"
```

### Task 2: Migrate Progress Data to Schema v2

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/storage/progressMigration.ts`
- Create: `src/storage/progressMigration.test.ts`
- Modify: `src/storage/progressStore.ts`
- Modify: `src/storage/progressStore.test.ts`

- [ ] **Step 1: Write a failing v1 migration test**

Create a v1 fixture that includes an answer, review, and mock attempt, then assert that migration preserves each field and adds zeroed streaks:

```ts
import { describe, expect, it } from "vitest";
import { migrateProgress } from "./progressMigration";

describe("migrateProgress", () => {
  it("migrates v1 progress without losing learning records", () => {
    const legacy = {
      schemaVersion: 1,
      currentDay: 4,
      completedDays: [1, 2, 3],
      answers: {
        "day-1-q1": {
          entry: {
            debit: [{ account: "現金", amount: 20000 }],
            credit: [{ account: "売上", amount: 20000 }]
          },
          correct: true,
          attempts: 1
        }
      },
      reviews: [{ topic: "資産", dueDay: 4, completed: false }],
      mockAttempts: []
    };

    expect(migrateProgress(legacy)).toEqual({
      ...legacy,
      schemaVersion: 2,
      currentStreak: 0,
      bestStreak: 0
    });
  });
});
```

- [ ] **Step 2: Run the migration test and verify RED**

Run:

```bash
npm test -- --run src/storage/progressMigration.test.ts
```

Expected: FAIL because migration does not exist.

- [ ] **Step 3: Update the progress type**

Change `LearnerProgress` in `src/domain/types.ts`:

```ts
export type LearnerProgress = {
  schemaVersion: 2;
  currentDay: number;
  completedDays: number[];
  answers: Record<string, StoredAnswer>;
  reviews: ReviewSchedule[];
  mockAttempts: MockExamAttempt[];
  currentStreak: number;
  bestStreak: number;
};
```

- [ ] **Step 4: Implement a validating migration boundary**

`progressMigration.ts` should accept `unknown`, reject malformed data, preserve v1 records, and normalize optional numeric streaks:

```ts
import type { LearnerProgress } from "../domain/types";

type LegacyProgress = Omit<
  LearnerProgress,
  "schemaVersion" | "currentStreak" | "bestStreak"
> & {
  schemaVersion: 1;
};

type ProgressCandidate = Partial<
  Omit<LearnerProgress, "schemaVersion">
> & {
  schemaVersion?: 1 | 2;
};

export const migrateProgress = (value: unknown): LearnerProgress => {
  if (!value || typeof value !== "object") {
    throw new Error("学習記録を読み取れません");
  }

  const progress = value as ProgressCandidate | LegacyProgress;
  if (
    (progress.schemaVersion !== 1 && progress.schemaVersion !== 2) ||
    typeof progress.currentDay !== "number" ||
    !Array.isArray(progress.completedDays) ||
    !progress.answers ||
    !Array.isArray(progress.reviews) ||
    !Array.isArray(progress.mockAttempts)
  ) {
    throw new Error("対応していない学習記録です");
  }

  return {
    schemaVersion: 2,
    currentDay: progress.currentDay,
    completedDays: progress.completedDays,
    answers: progress.answers,
    reviews: progress.reviews,
    mockAttempts: progress.mockAttempts,
    currentStreak:
      typeof progress.currentStreak === "number" ? progress.currentStreak : 0,
    bestStreak:
      typeof progress.bestStreak === "number" ? progress.bestStreak : 0
  };
};
```

- [ ] **Step 5: Apply migration in the IndexedDB store**

Update the initial progress and load path:

```ts
export const createInitialProgress = (): LearnerProgress => ({
  schemaVersion: 2,
  currentDay: 1,
  completedDays: [],
  answers: {},
  reviews: [],
  mockAttempts: [],
  currentStreak: 0,
  bestStreak: 0
});

export const loadProgress = async (): Promise<LearnerProgress> => {
  const database = await dbPromise;
  const stored = await database.get(STORE_NAME, PROGRESS_KEY);
  if (!stored) return createInitialProgress();
  const migrated = migrateProgress(stored);
  if ((stored as { schemaVersion?: number }).schemaVersion !== 2) {
    await database.put(STORE_NAME, migrated, PROGRESS_KEY);
  }
  return migrated;
};
```

Add a progress-store test that writes a raw v1 object through the exported test-safe save boundary or a dedicated `migrateProgress` test; the public `saveProgress` remains v2-only.

- [ ] **Step 6: Run storage tests**

Run:

```bash
npm test -- --run src/storage/progressMigration.test.ts src/storage/progressStore.test.ts
```

Expected: all migration and store tests PASS.

- [ ] **Step 7: Commit the schema migration**

```bash
git add src/domain/types.ts src/storage/progressMigration.ts src/storage/progressMigration.test.ts src/storage/progressStore.ts src/storage/progressStore.test.ts
git commit -m "Migrate learner progress to streak schema"
```

### Task 3: Make Backups Backward Compatible

**Files:**
- Modify: `src/storage/backup.ts`
- Modify: `src/storage/backup.test.ts`

- [ ] **Step 1: Write failing v2 and legacy backup tests**

Update the round-trip fixture to schema v2 and add:

```ts
it("imports a legacy v1 backup as v2 progress", () => {
  const restored = importProgress(
    JSON.stringify({
      kind: "campus-ledger-backup",
      schemaVersion: 1,
      exportedAt: "2026-06-13T00:00:00.000Z",
      progress: {
        schemaVersion: 1,
        currentDay: 3,
        completedDays: [1, 2],
        answers: {},
        reviews: [],
        mockAttempts: []
      }
    })
  );

  expect(restored).toMatchObject({
    schemaVersion: 2,
    currentDay: 3,
    currentStreak: 0,
    bestStreak: 0
  });
});
```

- [ ] **Step 2: Run backup tests and verify RED**

Run:

```bash
npm test -- --run src/storage/backup.test.ts
```

Expected: FAIL because the v1 progress is rejected or returned without streak fields.

- [ ] **Step 3: Export v2 and import both envelope versions**

Use envelope schema v2 for new exports and accept v1/v2 envelopes:

```ts
type BackupEnvelope = {
  kind: "campus-ledger-backup";
  schemaVersion: 1 | 2;
  exportedAt: string;
  progress: unknown;
};

export const exportProgress = (progress: LearnerProgress) =>
  JSON.stringify(
    {
      kind: "campus-ledger-backup",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      progress
    } satisfies BackupEnvelope,
    null,
    2
  );

export const importProgress = (raw: string): LearnerProgress => {
  let parsed: Partial<BackupEnvelope>;
  try {
    parsed = JSON.parse(raw) as Partial<BackupEnvelope>;
  } catch {
    throw new Error("バックアップファイルを読み取れません");
  }

  if (
    parsed.kind !== "campus-ledger-backup" ||
    (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) ||
    !parsed.progress
  ) {
    throw new Error("対応していないバックアップ形式です");
  }

  return migrateProgress(parsed.progress);
};
```

- [ ] **Step 4: Run backup tests and verify GREEN**

Run:

```bash
npm test -- --run src/storage/backup.test.ts
```

Expected: v2 round-trip, v1 import, and invalid backup tests PASS.

- [ ] **Step 5: Commit backup compatibility**

```bash
git add src/storage/backup.ts src/storage/backup.test.ts
git commit -m "Support legacy progress backups"
```

### Task 4: Integrate Rank and Streak into the Learning Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add failing status display tests**

After initial render, assert:

```ts
expect(await screen.findByText("研修職員")).toBeInTheDocument();
expect(screen.getByText("連続正解")).toBeInTheDocument();
expect(screen.getByText("0", { selector: ".streak-value" })).toBeInTheDocument();
expect(screen.getByText("MISSION BRIEFING")).toBeInTheDocument();
expect(screen.getByText("MISSION 1-1")).toBeInTheDocument();
```

- [ ] **Step 2: Add failing correct and incorrect streak tests**

Use Testing Library to select `現金` and `売上`, enter `20000`, submit, and assert `案件クリア` plus streak `1`. In a separate test, submit an incorrect balanced entry and assert `再確認が必要です` plus streak `0`.

The correct flow uses:

```ts
fireEvent.change(await screen.findByLabelText("借方科目1"), {
  target: { value: "現金" }
});
fireEvent.change(screen.getByLabelText("借方金額1"), {
  target: { value: "20000" }
});
fireEvent.change(screen.getByLabelText("貸方科目1"), {
  target: { value: "売上" }
});
fireEvent.change(screen.getByLabelText("貸方金額1"), {
  target: { value: "20000" }
});
fireEvent.click(screen.getByRole("button", { name: "仕訳を提出" }));

expect(await screen.findByText("案件クリア")).toBeInTheDocument();
expect(screen.getByText("1", { selector: ".streak-value" })).toBeInTheDocument();
```

- [ ] **Step 3: Run App tests and verify RED**

Run:

```bash
npm test -- --run src/App.test.tsx
```

Expected: FAIL because status and feedback labels do not exist.

- [ ] **Step 4: Add game status and feedback state**

Import `getStaffRank` and `updateStreak`. Derive:

```ts
const staffRank = getStaffRank(progress.completedDays.length);
```

In `submitDaily`, capture whether the question was already correct before replacing the answer, and merge the returned streak:

```ts
const previouslyCorrect =
  progress.answers[activeQuestion.id]?.correct ?? false;
const streak = updateStreak(
  progress.currentStreak,
  progress.bestStreak,
  previouslyCorrect,
  result.correct
);

const next: LearnerProgress = {
  ...progress,
  ...streak,
  answers: { /* existing answer update */ },
  reviews: result.correct
    ? progress.reviews
    : scheduleReview(progress.reviews, activeQuestion.topic, lesson.day)
};
```

Do not call `updateStreak` from `saveMockAnswer` or `finishMock`.

- [ ] **Step 5: Add rank-up state without blocking navigation**

Add:

```ts
const [rankUp, setRankUp] = useState<string | null>(null);

useEffect(() => {
  if (!rankUp) return;
  const timer = window.setTimeout(() => setRankUp(null), 2400);
  return () => window.clearTimeout(timer);
}, [rankUp]);
```

In the final daily `moveNext`, compare old and new rank:

```ts
const previousRank = getStaffRank(progress.completedDays.length);
const nextRank = getStaffRank(completedDays.length);
if (previousRank.name !== nextRank.name) setRankUp(nextRank.name);
```

Render the banner outside the view-specific content:

```tsx
{rankUp && (
  <button
    className="rank-up-banner"
    aria-live="polite"
    onClick={() => setRankUp(null)}
  >
    <span>RANK UP</span>
    <strong>{rankUp}</strong>
  </button>
)}
```

- [ ] **Step 6: Add semantic game labels**

Extend the masthead with:

```tsx
<div className="player-status" aria-label="職員ステータス">
  <div className="rank-status">
    <small>職員ランク</small>
    <strong>{staffRank.name}</strong>
  </div>
  <div className="streak-status">
    <small>連続正解</small>
    <strong className="streak-value">{progress.currentStreak}</strong>
  </div>
</div>
```

Add `MISSION BRIEFING`, `MISSION {lesson.day}-{questionIndex + 1}`, and change feedback headings:

- Correct: `案件クリア`
- Incorrect: `再確認が必要です`

Use `role="status"` and `aria-live="polite"` on the feedback container.

- [ ] **Step 7: Run App tests and verify GREEN**

Run:

```bash
npm test -- --run src/App.test.tsx
```

Expected: existing UI tests and new rank/streak tests PASS.

- [ ] **Step 8: Commit the learning-flow integration**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "Add staff progression to learning flow"
```

### Task 5: Apply the Hybrid Game Visual System

**Files:**
- Modify: `src/styles.css`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add stable visual hooks to the UI test**

Assert the game status and mission card carry stable classes or test IDs:

```ts
expect(screen.getByLabelText("職員ステータス")).toBeInTheDocument();
expect(screen.getByTestId("mission-card")).toHaveClass("case-file");
expect(screen.getByTestId("sticky-action")).toBeInTheDocument();
```

Add `data-testid="mission-card"` to the case section if needed.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --run src/App.test.tsx
```

Expected: FAIL until the mission-card hook exists.

- [ ] **Step 3: Replace the visual tokens and background**

Define a deliberate palette:

```css
:root {
  color: #102039;
  background: #07111f;
  --game-950: #07111f;
  --game-900: #0b1830;
  --game-800: #10254b;
  --game-700: #17396e;
  --cyan: #1bd8f2;
  --cyan-soft: #baf7ff;
  --violet: #716dff;
  --lime: #a8ed4f;
  --orange: #ff9a45;
  --paper: #f8fbff;
  --canvas: #eaf0f8;
  --ink: #102039;
  --muted: #65728a;
  --line: #cbd6e6;
  --game-shadow: 0 18px 45px rgba(3, 12, 27, 0.28);
}

body {
  background:
    linear-gradient(rgba(27, 216, 242, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(27, 216, 242, 0.04) 1px, transparent 1px),
    radial-gradient(circle at 50% -10%, #17396e, #07111f 56%);
  background-size: 28px 28px, 28px 28px, auto;
}
```

- [ ] **Step 4: Style the game status and mission panels**

Implement:

- dark layered masthead with cyan edge line;
- rank and streak panels with readable labels;
- `MISSION BRIEFING` kicker;
- white mission card with clipped/angled top accent using `::before`;
- cyan debit rail and violet credit rail;
- 46px controls with cyan focus glow;
- no horizontal overflow at 360px.

Use CSS-generated geometry only; do not add logos, character art, or external assets.

- [ ] **Step 5: Add restrained feedback motion**

```css
.feedback.correct {
  animation: mission-clear 560ms ease-out;
}

.feedback.incorrect {
  animation: mission-retry 320ms ease-out;
}

.primary::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-120%);
  background: linear-gradient(100deg, transparent 35%, rgba(255,255,255,.35), transparent 65%);
  transition: transform 360ms ease;
}

.primary:active {
  transform: translateY(2px);
  box-shadow: 0 3px 0 #087f9d;
}

@keyframes mission-clear {
  0% { box-shadow: 0 0 0 rgba(168, 237, 79, 0); }
  45% { box-shadow: 0 0 28px rgba(168, 237, 79, 0.55); }
  100% { box-shadow: 0 0 0 rgba(168, 237, 79, 0); }
}

@keyframes mission-retry {
  0%, 100% { transform: translateX(0); }
  35% { transform: translateX(-4px); }
  70% { transform: translateX(4px); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Restyle secondary screens and navigation**

Apply the same tokens to:

- career timeline, including current/completed states;
- records and destructive reset hierarchy;
- exam gate, timer, score panel;
- bottom navigation with CSS geometric icons and active cyan line;
- sticky action with dark shell and high-contrast primary button.

- [ ] **Step 7: Run tests and build**

Run:

```bash
npm test -- --run
GITHUB_ACTIONS=true npm run build
git diff --check
```

Expected: all tests PASS, TypeScript and PWA build PASS, no whitespace errors.

- [ ] **Step 8: Commit the visual system**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "Apply game-inspired Campus Ledger design"
```

### Task 6: Verify Mobile, Offline, Migration, and Deployment

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: Run the fresh full verification suite**

```bash
npm test -- --run
GITHUB_ACTIONS=true npm run build
git diff --check
git status --short
```

Expected:

- all tests pass;
- PWA output includes `dist/sw.js`;
- precache includes the application assets;
- no unstaged accidental files.

- [ ] **Step 2: Verify at 360x800 in the in-app browser**

Serve a local root-base production build for browser QA:

```bash
npm run build
npm exec vite preview -- --host 127.0.0.1
```

Check:

- rank and streak fit in the masthead;
- problem prompt and debit input remain reachable without horizontal scrolling;
- all controls are at least 44px high;
- sticky action sits above bottom navigation;
- story and takeaway expand and collapse;
- correct answer shows `案件クリア` and streak `1`;
- an incorrect answer resets a previously saved streak to `0`;
- console has no errors.

- [ ] **Step 3: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce` in browser automation and assert the feedback element has effectively zero animation duration.

- [ ] **Step 4: Verify offline restart and persistence**

After loading and answering a question:

1. stop the preview server;
2. reload the page;
3. confirm Service Worker starts the app;
4. confirm rank, streak, answer, and feedback state are restored.

- [ ] **Step 5: Rebuild for GitHub Pages**

```bash
GITHUB_ACTIONS=true npm run build
```

Expected: asset URLs use `/campus-ledger/` and PWA precache generation succeeds.

- [ ] **Step 6: Push and monitor Pages**

```bash
git push origin HEAD:main
run_id=$(gh run list --repo kazu-mita/campus-ledger --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$run_id" --repo kazu-mita/campus-ledger --exit-status
```

Expected: both `build` and `deploy` jobs succeed.

- [ ] **Step 7: Verify the live deployment**

Open:

```text
https://kazu-mita.github.io/campus-ledger/
```

Confirm the live JS contains `職員ランク`, `連続正解`, and `MISSION BRIEFING`; then use the update banner if an older Service Worker is active and verify the modern game UI at 360px.
