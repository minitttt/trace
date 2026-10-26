import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDuration(seconds?: number) {
  if (seconds === undefined) return "";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function getSourceTypeFromFile(file: File) {
  if (file.type === "application/pdf" || getFileExtension(file.name) === "pdf")
    return "pdf" as const;
  return "video" as const;
}

export function isAllowedSource(file: File) {
  const extension = getFileExtension(file.name);
  return (
    ["mp4", "mov", "webm", "pdf"].includes(extension) ||
    ["video/mp4", "video/quicktime", "video/webm", "application/pdf"].includes(file.type)
  );
}

export function truncate(value: string, length = 140) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
