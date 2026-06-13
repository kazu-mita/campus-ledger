import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { clearProgress } from "./storage/progressStore";

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
});
