import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

export const readJsonFile = <T>(filePath: string, fallback: T): T => {
  mkdirSync(dirname(filePath), { recursive: true });

  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }

  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as T;
    return raw ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeJsonFile = (filePath: string, data: unknown): void => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
};
