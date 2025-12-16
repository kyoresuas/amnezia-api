/**
 * Набор утилит для распознавания типовых ошибок Docker CLI,
 * нужен для маппинга низкоуровневых ошибок в читаемые ошибки
 */

export function isDockerDaemonUnavailableError(err: unknown): boolean {
  const msg = String(err);
  return /Cannot connect to the Docker daemon/i.test(msg);
}

export function isDockerContainerUnavailableError(err: unknown): boolean {
  const msg = String(err);
  return (
    /No such container/i.test(msg) ||
    /is not running/i.test(msg) ||
    /docker: Error response from daemon/i.test(msg)
  );
}
