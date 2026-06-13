import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { lessons } from "./content/lessons";
import {
  clearProgress,
  createInitialProgress,
  saveProgress
} from "./storage/progressStore";

vi.mock("virtual:pwa-register", () => ({
  registerSW: () => vi.fn()
}));

describe("Campus Ledger app", () => {
  beforeEach(async () => {
    await clearProgress();
  });

  it("opens the first workday and its first bookkeeping case", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("はじめての伝票")).toBeInTheDocument();
    });
    expect(screen.getByText("売上日報")).toBeInTheDocument();
    expect(
      screen.getByText("教科書を現金20,000円で販売した。")
    ).toBeInTheDocument();
  });

  it("shows an offline indicator without blocking study", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("オフライン")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "仕訳を提出" })).toBeEnabled();
  });

  it("keeps the story compact until the learner expands it", async () => {
    render(<App />);

    const storyToggle = await screen.findByRole("button", {
      name: "先輩・佐藤からの連絡"
    });
    expect(storyToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText("経理部の先輩", { exact: true })
    ).not.toBeInTheDocument();

    fireEvent.click(storyToggle);

    expect(storyToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("経理部の先輩")).toBeInTheDocument();
    expect(
      screen.getByText(
        "「入職初日です。まずは、大学書店の現金売上を帳簿に残すところから始めましょう。」"
      )
    ).toBeInTheDocument();
  });

  it("reveals today's takeaway on demand", async () => {
    render(<App />);

    const takeawayToggle = await screen.findByRole("button", {
      name: "今日の要点を表示"
    });
    expect(takeawayToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText(
        "資産と費用の増加は借方、負債・純資産・収益の増加は貸方です。"
      )
    ).not.toBeInTheDocument();

    fireEvent.click(takeawayToggle);

    expect(takeawayToggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(
        "資産と費用の増加は借方、負債・純資産・収益の増加は貸方です。"
      )
    ).toBeInTheDocument();
  });

  it("uses stacked journal sections and a sticky primary action", async () => {
    render(<App />);

    expect(await screen.findByText("借方を入力")).toBeInTheDocument();
    expect(screen.getByText("貸方を入力")).toBeInTheDocument();
    const stickyAction = screen.getByTestId("sticky-action");
    expect(stickyAction).toContainElement(
      screen.getByRole("button", { name: "仕訳を提出" })
    );
  });

  it("shows the staff rank, streak, and mission labels", async () => {
    render(<App />);

    expect(await screen.findByText("研修職員")).toBeInTheDocument();
    expect(screen.getByText("連続正解")).toBeInTheDocument();
    expect(screen.getByText("0", { selector: ".streak-value" })).toBeInTheDocument();
    expect(screen.getByText("MISSION BRIEFING")).toBeInTheDocument();
    expect(screen.getByText("MISSION 1-1")).toBeInTheDocument();
  });

  it("increments the streak after a correct daily answer", async () => {
    render(<App />);

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
  });

  it("resets the streak after an incorrect daily answer", async () => {
    await saveProgress({
      ...createInitialProgress(),
      currentStreak: 3,
      bestStreak: 3
    });
    render(<App />);

    fireEvent.change(await screen.findByLabelText("借方科目1"), {
      target: { value: "現金" }
    });
    fireEvent.change(screen.getByLabelText("借方金額1"), {
      target: { value: "20000" }
    });
    fireEvent.change(screen.getByLabelText("貸方科目1"), {
      target: { value: "現金" }
    });
    fireEvent.change(screen.getByLabelText("貸方金額1"), {
      target: { value: "20000" }
    });
    fireEvent.click(screen.getByRole("button", { name: "仕訳を提出" }));

    expect(await screen.findByText("再確認が必要です")).toBeInTheDocument();
    expect(screen.getByText("0", { selector: ".streak-value" })).toBeInTheDocument();
  });

  it("announces a rank up after completing a threshold day", async () => {
    const dayThree = lessons[2];
    await saveProgress({
      ...createInitialProgress(),
      currentDay: 3,
      completedDays: [1, 2],
      answers: Object.fromEntries(
        dayThree.questions.map((question) => [
          question.id,
          {
            entry: question.answer,
            correct: true,
            attempts: 1
          }
        ])
      )
    });
    render(<App />);

    for (let index = 0; index < dayThree.questions.length - 1; index += 1) {
      fireEvent.click(await screen.findByRole("button", { name: "次の案件へ" }));
    }
    fireEvent.click(
      await screen.findByRole("button", { name: "勤務日を完了" })
    );

    expect(
      await screen.findByRole("button", { name: "RANK UP 経費担当" })
    ).toBeInTheDocument();
  });
});
