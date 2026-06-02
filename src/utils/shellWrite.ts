/**
 * Построить безопасную команду атомарной записи файла внутри shell
 */
export const buildWriteFileCommand = (
  path: string,
  content: string,
): string => {
  const encoded = Buffer.from(content, "utf-8").toString("base64");
  const tmpPath = `${path}.tmp`;

  return (
    `echo '${encoded}' | base64 -d > '${tmpPath}' && ` +
    `mv -f '${tmpPath}' '${path}'`
  );
};
