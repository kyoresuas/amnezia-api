import {
  isDockerDaemonUnavailableError,
  isDockerContainerUnavailableError,
} from "@/utils/dockerErrors";
import {
  parseBytes,
  parseNetIo,
  parseMemUsage,
  parseCpuPercent,
} from "@/helpers/dockerStats";
import { describe, expect, it } from "vitest";
import { buildWriteFileCommand } from "@/utils/shellWrite";

/**
 * Тестирование распознавания ошибок Docker
 */
describe("dockerErrors", () => {
  // Тестирование распознавания недоступного Docker daemon
  it.each([
    "Cannot connect to the Docker daemon at unix:///var/run/docker.sock",
    "/bin/sh: 1: docker: not found",
    "command not found: docker",
  ])("recognizes an unavailable Docker daemon: %s", (message) => {
    expect(isDockerDaemonUnavailableError(new Error(message))).toBe(true);
    expect(isDockerContainerUnavailableError(new Error(message))).toBe(false);
  });

  // Тестирование распознавания отсутствующего контейнера
  it.each([
    "Error: No such container: amnezia-awg",
    "Container amnezia-xray is not running",
    "docker: Error response from daemon",
  ])("recognizes an unavailable container: %s", (message) => {
    expect(isDockerContainerUnavailableError(new Error(message))).toBe(true);
  });

  // Тестирование отклонения неизвестной ошибки
  it("does not classify an unrelated command error", () => {
    const error = new Error("permission denied");

    expect(isDockerDaemonUnavailableError(error)).toBe(false);
    expect(isDockerContainerUnavailableError(error)).toBe(false);
  });
});

/**
 * Тестирование парсеров статистики Docker
 */
describe("dockerStats", () => {
  // Тестирование преобразования десятичных и двоичных единиц
  it("converts Docker byte units", () => {
    expect(parseBytes("1.5kB")).toBe(1_500);
    expect(parseBytes("1.5MiB")).toBe(1_572_864);
    expect(parseBytes("invalid")).toBeNull();
  });

  // Тестирование преобразования CPU, памяти и сети
  it("parses CPU, memory and network stats", () => {
    expect(parseCpuPercent("12.34%")).toBe(12.34);
    expect(parseMemUsage("12MiB / 2GiB")).toEqual({
      usage: 12_582_912,
      limit: 2_147_483_648,
    });
    expect(parseNetIo("1.2kB / 3.4kB")).toEqual({
      rx: 1_200,
      tx: 3_400,
    });
  });
});

/**
 * Тестирование безопасной записи файлов
 */
describe("buildWriteFileCommand", () => {
  // Тестирование кодирования содержимого и атомарного перемещения
  it("builds an atomic command without interpolating raw content", () => {
    const content = "secret ' value\nsecond line";
    const command = buildWriteFileCommand("/tmp/config.json", content);

    expect(command).not.toContain(content);
    expect(command).toContain(Buffer.from(content).toString("base64"));
    expect(command).toContain("'/tmp/config.json.tmp'");
    expect(command).toContain(
      "mv -f '/tmp/config.json.tmp' '/tmp/config.json'",
    );
  });
});
