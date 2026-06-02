/**
 * in-process мьютекс
 *
 * Сериализует асинхронные операци, каждая следующая ждет завершения предыдущей
 */
export class Mutex {
  private tail: Promise<unknown> = Promise.resolve();

  /**
   * Выполнить функцию эксклюзивно, дождавшись завершения предыдущих операций
   */
  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    // Запускаем после хвоста очереди игнорируя его результат и ошибки
    const result = this.tail.then(
      () => fn(),
      () => fn(),
    );

    // Сдвигаем хвост проглатывая ошибку, чтобы не рвать цепочку
    this.tail = result.catch(() => undefined);

    return result;
  }
}
