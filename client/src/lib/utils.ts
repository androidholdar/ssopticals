import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeMobileInput(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    if (digits.startsWith('91')) {
      const phoneDigits = digits.slice(2, 12);
      return `+91${phoneDigits}`;
    } else {
      const phoneDigits = digits.slice(0, 12);
      return `+${phoneDigits}`;
    }
  } else {
    const digits = trimmed.replace(/\D/g, '');
    return digits.slice(0, 10);
  }
}

export function isValidMobile(mobile: string | null | undefined): boolean {
  if (!mobile) return true;
  if (mobile.startsWith('+91')) {
    return /^\+91\d{10}$/.test(mobile);
  }
  return /^\d{10}$/.test(mobile);
}
