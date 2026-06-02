/**
 * Построить безопасную команду записи файла внутри shell
 */
export const buildWriteFileCommand = (
  path: string,
  content: string,
): string => {
  const encoded = Buffer.from(content, "utf-8").toString("base64");

  return `echo '${encoded}' | base64 -d > ${path}`;
};
