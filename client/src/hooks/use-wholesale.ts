import { create } from 'zustand';

interface WholesaleState {
  isUnlocked: boolean;
  wholesalePassword: string | null;
  unlock: (password: string) => void;
  lock: () => void;
}

export const useWholesale = create<WholesaleState>()((set) => {
  // We keep the structure for compatibility, but the state is now driven by AuthProvider
  return {
    isUnlocked: false,
    wholesalePassword: null,
    unlock: (password: string) => {
      set({ isUnlocked: true, wholesalePassword: password });
    },
    lock: () => {
      set({ isUnlocked: false, wholesalePassword: null });
    },
  };
});
