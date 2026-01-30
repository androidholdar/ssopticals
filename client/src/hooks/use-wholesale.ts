import { create } from 'zustand';

interface WholesaleState {
  isUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

export const useWholesale = create<WholesaleState>()((set) => ({
  isUnlocked: false,
  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false }),
}));
