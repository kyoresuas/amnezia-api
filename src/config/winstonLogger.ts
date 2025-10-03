import chalk from "chalk";
import i18next from "i18next";
import { locale } from "moment";
import { I18n } from "@/types/shared";
import { IRequestLog } from "@/types/shared";
import { format, transports, createLogger, Logger } from "winston";

locale("ru");

export const commonFormat = format.combine(
  format.timestamp({ format: "DD.MM.YYYY HH:mm:ss" }),
  format.colorize({ all: true }),
  format.printf((info) => `[${info.timestamp}] ${info.message}`)
);

export class AppLogger {
  private logger: Logger;

  private constructor() {
    this.logger = createLogger({
      transports: [
        new transports.Console({
          level: "verbose",
          format: commonFormat,
        }),
      ],
    });
  }

  static instance: AppLogger;

  static getInstance(): AppLogger {
    if (!AppLogger.instance) {
      AppLogger.instance = AppLogger.createLogger();
    }

    return AppLogger.instance;
  }

  static createLogger(): AppLogger {
    return new AppLogger();
  }

  info(message: string): void {
    this.logger.info(message);
  }

  verbose(message: string): void {
    this.logger.verbose(chalk.cyanBright(message));
  }

  fatal(message: string, translate = false): void {
    this.logger.error(
      chalk.bgRedBright(
        "FATAL:",
        translate ? i18next.t(message as I18n) : message
      )
    );
  }

  error(message: string): void {
    this.logger.error(message);
  }

  so(message: string): void {
    this.logger.info(chalk.gray(message));
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }

  /**
   * Информация о запросе REST API
   */
  requestInfo(data: IRequestLog): void {
    const { method, statusCode, duration } = data;

    let coloredMethod: string;
    let coloredStatusCode: string;
    let coloredDuration: string;

    switch (method) {
      case "GET":
        coloredMethod = chalk.blueBright(method);
        break;

      case "POST":
        coloredMethod = chalk.greenBright(method);
        break;

      case "PUT":
        coloredMethod = chalk.yellow(method);
        break;

      case "PATCH":
        coloredMethod = chalk.green(method);
        break;

      case "DELETE":
        coloredMethod = chalk.redBright(method);
        break;

      case "OPTIONS":
        coloredMethod = chalk.magenta(method);
        break;

      default:
        coloredMethod = method;
    }

    if (statusCode < 200) {
      coloredStatusCode = chalk.whiteBright(statusCode);
    } else if (statusCode < 300) {
      coloredStatusCode = chalk.green(statusCode);
    } else if (statusCode < 400) {
      coloredStatusCode = chalk.magentaBright(statusCode);
    } else if (statusCode < 500) {
      coloredStatusCode = chalk.yellow(statusCode);
    } else {
      coloredStatusCode = chalk.red(statusCode);
    }

    if (duration < 200) {
      coloredDuration = chalk.green(duration, "мс");
    } else if (duration < 500) {
      coloredDuration = chalk.yellowBright(duration, "мс");
    } else if (duration < 1000) {
      coloredDuration = chalk.red(duration, "мс");
    } else {
      coloredDuration = chalk.black(duration, "мс");
    }

    const prefix = `${coloredMethod} ${coloredStatusCode} ${data.url}`;

    this.logger.info(chalk.cyan(`${prefix} -> ${coloredDuration}`));
  }
}

/**
 * Система логов приложения
 */
export const appLogger = AppLogger.getInstance();
