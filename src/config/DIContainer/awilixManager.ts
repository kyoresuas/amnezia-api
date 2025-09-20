import { AwilixManager } from "awilix-manager";
import { AwilixContainer, InjectionMode, createContainer } from "awilix";

class DI {
  static instance: DI;

  public container: AwilixContainer;
  public awilixManager: AwilixManager;

  private constructor() {
    this.container = createContainer({
      injectionMode: InjectionMode.CLASSIC,
    });

    this.awilixManager = new AwilixManager({
      diContainer: this.container,
      asyncInit: true,
      strictBooleanEnforced: true,
    });
  }

  static getInstance(): DI {
    if (!DI.instance) {
      DI.instance = new DI();
    }

    return DI.instance;
  }
}

/**
 * Контейнер внедрения зависимостей
 */
export const di = DI.getInstance();
