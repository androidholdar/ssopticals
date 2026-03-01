import { create } from 'zustand';

interface WholesaleState {
  isUnlocked: boolean;
  wholesalePassword: string | null;
  unlock: (password: string) => void;
  lock: () => void;
}

export const useWholesale = create<WholesaleState>()((set) => {
  // Try to restore from sessionStorage on initialization
  const savedPassword = sessionStorage.getItem("wholesale_password");

  return {
    isUnlocked: !!savedPassword,
    wholesalePassword: savedPassword,
    unlock: (password: string) => {
      sessionStorage.setItem("wholesale_password", password);
      set({ isUnlocked: true, wholesalePassword: password });
    },
    lock: () => {
      sessionStorage.removeItem("wholesale_password");
      set({ isUnlocked: false, wholesalePassword: null });
    },
  };
});
