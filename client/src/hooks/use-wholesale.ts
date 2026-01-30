import { create } from 'zustand';

interface WholesaleState {
  isUnlocked: boolean;
  wholesalePassword: string | null;
  unlock: (password: string) => void;
  lock: () => void;
}

export const useWholesale = create<WholesaleState>()((set) => ({
  isUnlocked: false,
  wholesalePassword: null,
  unlock: (password: string) => set({ isUnlocked: true, wholesalePassword: password }),
  lock: () => set({ isUnlocked: false, wholesalePassword: null }),
}));
