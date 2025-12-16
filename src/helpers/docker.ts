import { promisify } from "util";
import { exec } from "child_process";

// Promisify exec
const execAsync = promisify(exec);

/**
 * Получить список запущенных Docker-контейнеров
 * Если Docker недоступен, то возвращаемпустой список
 */
export async function listRunningDockerContainers(): Promise<Set<string>> {
  try {
    const { stdout } = await execAsync("docker ps --format '{{.Names}}'", {
      timeout: 1500,
      maxBuffer: 1024 * 1024,
    });

    const names = stdout
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    return new Set(names);
  } catch {
    return new Set();
  }
}

/**
 * Проверить, запущен ли Docker-контейнер по имени
 */
export async function isDockerContainerRunning(name: string): Promise<boolean> {
  if (!name) return false;

  const containers = await listRunningDockerContainers();

  return containers.has(name);
}
