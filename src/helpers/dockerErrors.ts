/**
 * Набор утилит для распознавания типовых ошибок Docker CLI.
 * Нужен для маппинга низкоуровневых ошибок `docker exec`/`docker restart`
 * в читаемые HTTP-ошибки.
 */

export function isDockerDaemonUnavailableError(err: unknown): boolean {
  const msg = String(err);
  return (
    /Cannot connect to the Docker daemon/i.test(msg) ||
    /docker:\s*not\s*found/i.test(msg) ||
    /\/bin\/sh:\s*\d+:\s*docker:\s*not\s*found/i.test(msg) ||
    /command\s+not\s+found:\s*docker/i.test(msg)
  );
}

export function isDockerContainerUnavailableError(err: unknown): boolean {
  const msg = String(err);
  return (
    /No such container/i.test(msg) ||
    /is not running/i.test(msg) ||
    /docker: Error response from daemon/i.test(msg)
  );
}
