import { LogLevel, LogMetadata } from "./types";

export class QuickSolvLogger {
  private activeLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";

  private readonly LEVEL_WEIGHTS: Record<LogLevel, number> = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40
  };

  /**
   * Safe structured logging method. Redacts all secrets and filters sensitive payloads.
   */
  log(level: LogLevel, message: string, meta?: LogMetadata): void {
    if (this.LEVEL_WEIGHTS[level] < this.LEVEL_WEIGHTS[this.activeLevel]) {
      return;
    }

    const sanitizedMeta = this.sanitizeMetadata(meta);
    const sanitizedMsg = this.sanitizeString(message);

    const payload = {
      level,
      message: sanitizedMsg,
      timestamp: new Date().toISOString(),
      ...sanitizedMeta
    };

    const jsonStr = JSON.stringify(payload);

    switch (level) {
      case "ERROR":
        console.error(jsonStr);
        break;
      case "WARN":
        console.warn(jsonStr);
        break;
      default:
        console.log(jsonStr);
        break;
    }
  }

  debug(message: string, meta?: LogMetadata): void {
    this.log("DEBUG", message, meta);
  }

  info(message: string, meta?: LogMetadata): void {
    this.log("INFO", message, meta);
  }

  warn(message: string, meta?: LogMetadata): void {
    this.log("WARN", message, meta);
  }

  error(message: string, meta?: LogMetadata): void {
    this.log("ERROR", message, meta);
  }

  /**
   * Sanitizes string content, redacting secrets and credentials.
   */
  public sanitizeString(str: string): string {
    if (!str) return "";
    return str
      .replace(/OX_ALPHA_API_KEY[^\s]*/g, "[REDACTED_SECRET]")
      .replace(/GEMINI_API_KEY[^\s]*/g, "[REDACTED_SECRET]")
      .replace(/PATSNAP_API_KEY[^\s]*/g, "[REDACTED_SECRET]")
      .replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED_TOKEN]")
      .replace(/Bearer\s+[a-zA-Z0-9._-]{20,}/g, "Bearer [REDACTED_TOKEN]");
  }

  /**
   * Sanitizes metadata objects, stripping prompt text, answers, and secrets.
   */
  public sanitizeMetadata(meta?: LogMetadata): Record<string, any> {
    if (!meta) return {};

    const cleanMeta: Record<string, any> = {};

    for (const [key, value] of Object.entries(meta)) {
      // Exclude prompt text, answers, and credentials from logs
      if (
        key === "prompt" ||
        key === "answer" ||
        key === "history" ||
        key === "password" ||
        key === "token" ||
        key === "authorization" ||
        key === "image" ||
        key === "pdf"
      ) {
        cleanMeta[key] = "[REDACTED_PAYLOAD]";
        continue;
      }

      if (typeof value === "string") {
        cleanMeta[key] = this.sanitizeString(value);
      } else {
        cleanMeta[key] = value;
      }
    }

    return cleanMeta;
  }
}

export const quickSolvLogger = new QuickSolvLogger();
