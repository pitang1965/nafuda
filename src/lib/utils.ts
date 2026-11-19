import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// LINE のアプリ内ブラウザか（UA 末尾に " Line/x.y.z" が付く）
export const isLineUa = (ua: string) => / Line\//i.test(ua);
