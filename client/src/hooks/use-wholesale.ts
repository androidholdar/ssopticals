import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WholesaleState {
  isUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

export const useWholesale = create<WholesaleState>()(
  persist(
    (set) => ({
      isUnlocked: false,
      unlock: () => set({ isUnlocked: true }),
      lock: () => set({ isUnlocked: false }),
    }),
    {
      name: 'wholesale-storage',
    }
  )
);
