import { useEffect, useMemo, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { accountOptions, contentManifest, lessons } from "./content/lessons";
import { getRemainingSeconds, startExam } from "./domain/exam";
import { getStaffRank, updateStreak } from "./domain/gamification";
import { reviewsDueOn, scheduleReview } from "./domain/review";
import { gradeJournalEntry, type GradeResult } from "./domain/scoring";
import type {
  JournalEntry,
  LearnerProgress,
  MockExamAttempt,
  Question
} from "./domain/types";
import { exportProgress, importProgress } from "./storage/backup";
import {
  clearProgress,
  loadProgress,
  saveProgress
} from "./storage/progressStore";

type View = "work" | "career" | "records";

const blankEntryFor = (question: Question): JournalEntry => ({
  debit: question.answer.debit.map(() => ({ account: "", amount: 0 })),
  credit: question.answer.credit.map(() => ({ account: "", amount: 0 }))
});

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60
  ).padStart(2, "0")}`;

const downloadText = (contents: string, filename: string) => {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "application/json" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

function EntrySide({
  label,
  lines,
  onChange
}: {
  label: "借方" | "貸方";
  lines: JournalEntry["debit"];
  onChange: (index: number, field: "account" | "amount", value: string) => void;
}) {
  return (
    <div className="entry-side">
      <div className="entry-heading">
        <span>{label === "借方" ? "借方を入力" : "貸方を入力"}</span>
        <small>{label === "借方" ? "増えた資産・費用" : "増えた負債・純資産・収益"}</small>
      </div>
      {lines.map((line, index) => (
        <div className="entry-line" key={`${label}-${index}`}>
          <select
            aria-label={`${label}科目${index + 1}`}
            value={line.account}
            onChange={(event) => onChange(index, "account", event.target.value)}
          >
            <option value="">勘定科目を選択</option>
            {accountOptions.map((account) => (
              <option key={account} value={account}>
                {account}
              </option>
            ))}
          </select>
          <div className="amount-wrap">
            <input
              aria-label={`${label}金額${index + 1}`}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={line.amount || ""}
              onChange={(event) => onChange(index, "amount", event.target.value)}
            />
            <span>円</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [progress, setProgress] = useState<LearnerProgress | null>(null);
  const [view, setView] = useState<View>("work");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [feedback, setFeedback] = useState<GradeResult | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [remaining, setRemaining] = useState(3600);
  const [notice, setNotice] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [takeawayExpanded, setTakeawayExpanded] = useState(false);
  const [rankUp, setRankUp] = useState<string | null>(null);
  const updateSW = useRef<
    ((reloadPage?: boolean) => Promise<void>) | undefined
  >(undefined);

  const lesson = lessons[(progress?.currentDay ?? 1) - 1];
  const currentQuestion = lesson.questions[questionIndex];
  const activeAttempt = progress?.mockAttempts.find(
    (attempt) => attempt.examId === `day-${lesson.day}` && !attempt.submittedAt
  );
  const finishedAttempt = progress?.mockAttempts.find(
    (attempt) => attempt.examId === `day-${lesson.day}` && attempt.submittedAt
  );
  const dueReviews = useMemo(
    () => (progress ? reviewsDueOn(progress.reviews, progress.currentDay) : []),
    [progress]
  );
  const reviewQuestion = useMemo(() => {
    const topic = dueReviews[0]?.topic;
    if (!topic) return undefined;
    return lessons
      .flatMap((item) => item.questions)
      .find((item) => item.topic === topic);
  }, [dueReviews]);
  const activeQuestion =
    reviewing && reviewQuestion ? reviewQuestion : currentQuestion;

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    updateSW.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true)
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => setOfflineReady(true));
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!progress || !activeQuestion) return;
    const stored = progress.answers[activeQuestion.id];
    setEntry(stored?.entry ?? blankEntryFor(activeQuestion));
    setFeedback(
      stored?.correct
        ? {
            correct: true,
            accountCorrect: true,
            amountCorrect: true,
            balanced: true
          }
        : null
    );
  }, [activeQuestion?.id, progress?.currentDay]);

  useEffect(() => {
    setStoryExpanded(false);
    setTakeawayExpanded(false);
  }, [progress?.currentDay, view]);

  useEffect(() => {
    if (!rankUp) return;
    const timer = window.setTimeout(() => setRankUp(null), 2400);
    return () => window.clearTimeout(timer);
  }, [rankUp]);

  useEffect(() => {
    if (!activeAttempt) return;
    const tick = () =>
      setRemaining(getRemainingSeconds(activeAttempt, new Date()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeAttempt?.id]);

  const commit = async (next: LearnerProgress) => {
    setProgress(next);
    await saveProgress(next);
  };

  const changeEntry = (
    side: "debit" | "credit",
    index: number,
    field: "account" | "amount",
    value: string
  ) => {
    if (!entry || !progress) return;
    const nextEntry: JournalEntry = {
      debit: entry.debit.map((line) => ({ ...line })),
      credit: entry.credit.map((line) => ({ ...line }))
    };
    nextEntry[side][index] = {
      ...nextEntry[side][index],
      [field]: field === "amount" ? Number(value.replaceAll(",", "")) : value
    };
    setEntry(nextEntry);

    const previous = progress.answers[activeQuestion.id];
    void commit({
      ...progress,
      answers: {
        ...progress.answers,
        [activeQuestion.id]: {
          entry: nextEntry,
          correct: previous?.correct ?? false,
          attempts: previous?.attempts ?? 0
        }
      }
    });
  };

  const submitDaily = async () => {
    if (!entry || !progress) return;
    const result = gradeJournalEntry(entry, activeQuestion.answer);
    const previousAnswer = progress.answers[activeQuestion.id];
    const previousAttempts = previousAnswer?.attempts ?? 0;
    const streak = updateStreak(
      progress.currentStreak,
      progress.bestStreak,
      previousAnswer?.correct ?? false,
      result.correct
    );
    const next: LearnerProgress = {
      ...progress,
      ...streak,
      answers: {
        ...progress.answers,
        [activeQuestion.id]: {
          entry,
          correct: result.correct,
          attempts: previousAttempts + 1
        }
      },
      reviews: result.correct
        ? progress.reviews
        : scheduleReview(progress.reviews, activeQuestion.topic, lesson.day)
    };
    setFeedback(result);
    await commit(next);
  };

  const moveNext = () => {
    setFeedback(null);
    if (reviewing && progress) {
      const target = dueReviews[0];
      void commit({
        ...progress,
        reviews: progress.reviews.map((item) =>
          item.topic === target?.topic && item.dueDay === target?.dueDay
            ? { ...item, completed: true }
            : item
        )
      });
      setReviewing(false);
      return;
    }
    if (questionIndex < lesson.questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    if (!progress) return;
    const completedDays = Array.from(
      new Set([...progress.completedDays, lesson.day])
    ).sort((a, b) => a - b);
    const previousRank = getStaffRank(progress.completedDays.length);
    const nextRank = getStaffRank(completedDays.length);
    if (previousRank.name !== nextRank.name) {
      setRankUp(nextRank.name);
    }
    const nextDay = Math.min(14, lesson.day + 1);
    void commit({ ...progress, completedDays, currentDay: nextDay });
    setQuestionIndex(0);
    setView("career");
  };

  const beginMock = () => {
    if (!progress) return;
    const attempt = startExam(`day-${lesson.day}`, new Date(), 60);
    void commit({
      ...progress,
      mockAttempts: [
        ...progress.mockAttempts.filter(
          (item) => item.examId !== attempt.examId || item.submittedAt
        ),
        attempt
      ]
    });
    setQuestionIndex(0);
  };

  const saveMockAnswer = () => {
    if (!progress || !entry) return;
    const grade = gradeJournalEntry(entry, activeQuestion.answer);
    void commit({
      ...progress,
      answers: {
        ...progress.answers,
        [activeQuestion.id]: {
          entry,
          correct: grade.correct,
          attempts: 1
        }
      }
    });
    if (questionIndex < lesson.questions.length - 1) {
      setQuestionIndex((index) => index + 1);
    } else {
      finishMock(activeAttempt);
    }
  };

  const finishMock = (attempt?: MockExamAttempt) => {
    if (!progress || !attempt) return;
    const answers = {
      ...progress.answers,
      ...(entry
        ? {
            [activeQuestion.id]: {
              entry,
              correct: gradeJournalEntry(entry, activeQuestion.answer).correct,
              attempts: 1
            }
          }
        : {})
    };
    const score = lesson.questions.reduce((sum, item) => {
      const saved = answers[item.id];
      return (
        sum +
        (saved && gradeJournalEntry(saved.entry, item.answer).correct
          ? item.points
          : 0)
      );
    }, 0);
    const submitted: MockExamAttempt = {
      ...attempt,
      submittedAt: new Date().toISOString(),
      score
    };
    void commit({
      ...progress,
      answers,
      completedDays: Array.from(
        new Set([...progress.completedDays, lesson.day])
      ),
      currentDay: Math.min(14, lesson.day + 1),
      mockAttempts: progress.mockAttempts.map((item) =>
        item.id === attempt.id ? submitted : item
      )
    });
  };

  useEffect(() => {
    if (lesson.isMockExam && activeAttempt && remaining === 0) {
      finishMock(activeAttempt);
    }
  }, [remaining]);

  const restoreBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const restored = importProgress(await file.text());
      await saveProgress(restored);
      setProgress(restored);
      setQuestionIndex(0);
      setNotice("バックアップを復元しました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "復元できませんでした");
    }
  };

  const retryOfflineSetup = async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
    navigator.serviceWorker.ready.then(() => setOfflineReady(true));
  };

  const reset = async () => {
    if (!window.confirm("学習記録をすべて削除しますか？")) return;
    await clearProgress();
    setProgress(await loadProgress());
    setQuestionIndex(0);
    setNotice("学習記録を初期化しました");
  };

  if (!progress || !entry) {
    return (
      <main className="loading-screen">
        <div className="seal">CL</div>
        <p>職員証を準備しています…</p>
      </main>
    );
  }

  const attempts = progress.answers[activeQuestion.id]?.attempts ?? 0;
  const allDailyCorrect = lesson.questions.every(
    (item) => progress.answers[item.id]?.correct
  );
  const answeredMock = lesson.questions.filter(
    (item) => progress.answers[item.id]
  ).length;
  const staffRank = getStaffRank(progress.completedDays.length);
  const showExercise =
    !(
      lesson.isMockExam &&
      ((!activeAttempt && !finishedAttempt) || finishedAttempt)
    );

  const primaryAction = showExercise ? (
    lesson.isMockExam ? (
      <button
        className="primary"
        onClick={saveMockAnswer}
        disabled={remaining === 0}
      >
        {questionIndex === lesson.questions.length - 1
          ? "模試を提出"
          : "回答を保存して次へ"}
      </button>
    ) : feedback?.correct ? (
      <button className="primary" onClick={moveNext}>
        {reviewing
          ? "復習を完了"
          : questionIndex === lesson.questions.length - 1
            ? "勤務日を完了"
            : "次の案件へ"}
      </button>
    ) : (
      <button className="primary" onClick={submitDaily}>
        仕訳を提出
      </button>
    )
  ) : null;

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="brand-row">
          <div className="brand-mark">青</div>
          <div>
            <span className="eyebrow">私立青葉大学 法人本部</span>
            <h1>Campus Ledger</h1>
          </div>
          <div className={`network ${online ? "online" : "offline"}`}>
            <span />
            {online ? "オンライン" : "オフライン"}
          </div>
        </div>
        <div className="course-progress">
          <div className="progress-copy">
            <span>Day {lesson.day} / 14</span>
            <strong>{lesson.title}</strong>
            <small>{lesson.subtitle}</small>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="14日間の学習進捗"
            aria-valuemin={0}
            aria-valuemax={14}
            aria-valuenow={lesson.day}
          >
            <span style={{ width: `${(lesson.day / 14) * 100}%` }} />
          </div>
        </div>
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
      </header>

      {rankUp && (
        <button
          className="rank-up-banner"
          aria-live="polite"
          onClick={() => setRankUp(null)}
        >
          <span>ランクアップ</span>
          <strong>{rankUp}</strong>
        </button>
      )}

      {needRefresh && (
        <button className="update-banner" onClick={() => updateSW.current?.(true)}>
          新しい教材があります。タップして更新
        </button>
      )}

      <main>
        {view === "work" && (
          <>
            <div className="status-row">
              <div className={`offline-card ${offlineReady ? "ready" : ""}`}>
                <span className="status-icon">{offlineReady ? "✓" : "↓"}</span>
                <div>
                  <strong>
                    {offlineReady
                      ? "オフライン準備完了"
                      : "教材を端末に保存中"}
                  </strong>
                  {!offlineReady && (
                    <small>教材 v{contentManifest.contentVersion}</small>
                  )}
                  {!offlineReady && online && (
                    <button
                      className="offline-retry"
                      onClick={retryOfflineSetup}
                    >
                      保存を再試行
                    </button>
                  )}
                </div>
              </div>
              {!lesson.isMockExam && dueReviews.length > 0 && reviewQuestion && (
                <button
                  className="review-chip"
                  onClick={() => {
                    setFeedback(null);
                    setReviewing(true);
                  }}
                >
                  復習 {dueReviews.length}件
                </button>
              )}
            </div>

            {lesson.isMockExam && !activeAttempt && !finishedAttempt ? (
              <section className="exam-gate paper">
                <span className="paper-kicker">昇格試験</span>
                <h3>60分・100点</h3>
                <p>
                  開始後は正誤やヒントを表示しません。通信が切れても、終了時刻と回答は端末内に保存されます。
                </p>
                <button className="primary" onClick={beginMock}>
                  模試を開始する
                </button>
              </section>
            ) : lesson.isMockExam && finishedAttempt ? (
              <section className="result-board paper">
                <span className="paper-kicker">採点結果</span>
                <div className="score">{finishedAttempt.score}<small>/100</small></div>
                <h3>
                  {(finishedAttempt.score ?? 0) >= 70
                    ? "最低合格ライン到達"
                    : "弱点を復習して再挑戦"}
                </h3>
                <p>
                  70点は合格基準ぎりぎりです。安定して合格するには80点以上を目指しましょう。
                </p>
              </section>
            ) : (
              <>
                <section className="briefing">
                  <span className="mission-label">今日の連絡</span>
                  <button
                    className="story-summary"
                    aria-label="先輩・佐藤からの連絡"
                    aria-expanded={storyExpanded}
                    aria-controls="story-detail"
                    onClick={() => setStoryExpanded((expanded) => !expanded)}
                  >
                    <span className="portrait">佐</span>
                    <span className="story-summary-copy">
                      <strong>先輩・佐藤からの連絡</strong>
                      <small>
                        {storyExpanded
                          ? "タップして閉じる"
                          : lesson.briefing.text}
                      </small>
                    </span>
                    <span className="chevron" aria-hidden="true">
                      {storyExpanded ? "⌃" : "⌄"}
                    </span>
                  </button>
                  {storyExpanded && (
                    <div className="story-detail" id="story-detail">
                      <strong>{lesson.briefing.speaker}</strong>
                      <small>{lesson.briefing.role}</small>
                      <p>「{lesson.briefing.text}」</p>
                    </div>
                  )}
                </section>

                {lesson.isMockExam && (
                  <div className="exam-strip">
                    <strong>{formatTime(remaining)}</strong>
                    <span>
                      {answeredMock}/{lesson.questions.length} 回答
                    </span>
                  </div>
                )}

                <section
                  className={`paper case-file ${
                    feedback?.correct
                      ? "mission-cleared"
                      : feedback
                        ? "mission-retry"
                        : ""
                  }`}
                  data-testid="mission-card"
                >
                  <div className="paper-top">
                    <div>
                      <span className="paper-kicker">
                        {reviewing
                          ? "復習案件"
                          : `案件 ${questionIndex + 1}/${lesson.questions.length}`}
                      </span>
                      <h3>{activeQuestion.documentTitle}</h3>
                    </div>
                    <span className="points">{activeQuestion.points}点</span>
                  </div>
                  <div className="case-progress" aria-hidden="true">
                    {lesson.questions.map((question, index) => (
                      <span
                        key={question.id}
                        className={index <= questionIndex ? "active" : ""}
                      />
                    ))}
                  </div>
                  <div className="document-meta">
                    <span>{activeQuestion.documentMeta}</span>
                    <span>{lesson.department}</span>
                  </div>
                  <p className="prompt">{activeQuestion.prompt}</p>

                  <div className="journal">
                    <EntrySide
                      label="借方"
                      lines={entry.debit}
                      onChange={(index, field, value) =>
                        changeEntry("debit", index, field, value)
                      }
                    />
                    <EntrySide
                      label="貸方"
                      lines={entry.credit}
                      onChange={(index, field, value) =>
                        changeEntry("credit", index, field, value)
                      }
                    />
                  </div>

                  {!lesson.isMockExam && feedback && (
                    <div
                      className={`feedback ${
                        feedback.correct ? "correct" : "incorrect"
                      }`}
                      role="status"
                      aria-live="polite"
                    >
                      <strong>
                        {feedback.correct
                          ? "案件クリア"
                          : "再確認が必要です"}
                      </strong>
                      <p>
                        {feedback.correct
                          ? activeQuestion.explanation
                          : attempts >= 2
                            ? activeQuestion.explanation
                            : activeQuestion.hint}
                      </p>
                      {!feedback.correct && !feedback.balanced && (
                        <small>借方と貸方の合計額が一致していません。</small>
                      )}
                    </div>
                  )}
                </section>

                {!lesson.isMockExam && (
                  <aside className="today-note">
                    <button
                      className="takeaway-toggle"
                      aria-expanded={takeawayExpanded}
                      aria-controls="takeaway-detail"
                      aria-label={
                        takeawayExpanded
                          ? "今日の要点を閉じる"
                          : "今日の要点を表示"
                      }
                      onClick={() =>
                        setTakeawayExpanded((expanded) => !expanded)
                      }
                    >
                      <span>
                        <strong>今日の要点</strong>
                        <small>迷ったときに確認</small>
                      </span>
                      <span aria-hidden="true">
                        {takeawayExpanded ? "⌃" : "⌄"}
                      </span>
                    </button>
                    {takeawayExpanded && (
                      <div className="takeaway-detail" id="takeaway-detail">
                        <p>{lesson.takeaway}</p>
                        <div className="topic-list">
                          {lesson.topics.map((topic) => (
                            <em key={topic}>{topic}</em>
                          ))}
                        </div>
                      </div>
                    )}
                  </aside>
                )}

                {primaryAction && (
                  <div className="sticky-action" data-testid="sticky-action">
                    <div className="sticky-action-copy">
                      <span>
                        {reviewing
                          ? "復習中"
                          : `案件 ${questionIndex + 1}/${lesson.questions.length}`}
                      </span>
                      <small>入力内容は端末へ自動保存されます</small>
                    </div>
                    {primaryAction}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {view === "career" && (
          <section className="page-panel">
            <span className="eyebrow">CAREER FILE</span>
            <h2>14日間の配属記録</h2>
            <p className="lead">
              完了 {progress.completedDays.length}/14日 ・ 現在 Day {progress.currentDay}
            </p>
            <div className="career-status">
              <span>現在の職員ランク</span>
              <strong>{staffRank.name}</strong>
              <small>最高連続正解 {progress.bestStreak}</small>
            </div>
            <div className="timeline">
              {lessons.map((item) => {
                const completed = progress.completedDays.includes(item.day);
                const available = item.day <= progress.currentDay;
                return (
                  <button
                    key={item.day}
                    disabled={!available}
                    className={`${completed ? "completed" : ""} ${
                      item.day === progress.currentDay ? "current" : ""
                    }`}
                    onClick={() => {
                      if (available) {
                        void commit({ ...progress, currentDay: item.day });
                        setQuestionIndex(0);
                        setView("work");
                      }
                    }}
                  >
                    <span>{completed ? "済" : item.day}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </div>
                  </button>
                );
              })}
            </div>
            {allDailyCorrect && (
              <p className="muted">現在日の全案件に正解しています。</p>
            )}
          </section>
        )}

        {view === "records" && (
          <section className="page-panel">
            <span className="eyebrow">LOCAL RECORDS</span>
            <h2>端末内の学習記録</h2>
            <div className="record-card">
              <strong>オフライン保存</strong>
              <p>
                学習記録はこの端末だけに保存されています。ブラウザのデータ削除に備えて、定期的にバックアップしてください。
              </p>
            </div>
            <button
              className="secondary"
              onClick={() =>
                downloadText(
                  exportProgress(progress),
                  `campus-ledger-backup-${new Date()
                    .toISOString()
                    .slice(0, 10)}.json`
                )
              }
            >
              学習記録を書き出す
            </button>
            <label className="secondary file-button">
              バックアップを復元
              <input
                type="file"
                accept="application/json"
                onChange={(event) => restoreBackup(event.target.files?.[0])}
              />
            </label>
            <button className="danger-button" onClick={reset}>
              学習記録を初期化
            </button>
            {notice && <p className="notice">{notice}</p>}
            <div className="app-meta">
              <span>教材 {contentManifest.contentVersion}</span>
              <span>進捗スキーマ v{progress.schemaVersion}</span>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="メインメニュー">
        <button
          className={view === "work" ? "active" : ""}
          onClick={() => setView("work")}
        >
          <span>伝</span>今日の業務
        </button>
        <button
          className={view === "career" ? "active" : ""}
          onClick={() => setView("career")}
        >
          <span>歴</span>配属記録
        </button>
        <button
          className={view === "records" ? "active" : ""}
          onClick={() => setView("records")}
        >
          <span>保</span>保存
        </button>
      </nav>
    </div>
  );
}

export default App;
