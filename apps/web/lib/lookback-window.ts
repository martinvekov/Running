import { addDays } from '@crew/engine';

export const LOOK_BACK_BLOCKS = 8;
const BLOCK_DAYS = 21;
const HISTORY_DAYS = 28;

/**
 * The stretch the pre-season look back covers: eight three-week blocks that end on the most
 * recent finished Sunday, plus the four weeks before them, which set the first usual week.
 */
export function lookBackWindow(today: string, blocks = LOOK_BACK_BLOCKS) {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const thisMonday = addDays(today, -((dow + 6) % 7));
  const firstStart = addDays(thisMonday, -blocks * BLOCK_DAYS);
  return {
    firstStart,
    lastSunday: addDays(thisMonday, -1),
    historyFrom: addDays(firstStart, -HISTORY_DAYS),
  };
}
