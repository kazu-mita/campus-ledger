import { render, screen, waitFor } from "@testing-library/react";
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
});

