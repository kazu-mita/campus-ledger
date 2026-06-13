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
