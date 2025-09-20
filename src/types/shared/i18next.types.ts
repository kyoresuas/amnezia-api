import i18next from "i18next";
import ru from "@/locales/ru/ru.json";
import us from "@/locales/en/us.json";
import { ArgumentsType } from "./common.types";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "ru";
    resources: {
      us: typeof us;
      ru: typeof ru;
    };
  }
}

export type I18n = Exclude<
  Exclude<
    ArgumentsType<typeof i18next.t>[0],
    string | TemplateStringsArray | string[]
  >[0],
  TemplateStringsArray
>;

export type I18nArgs = { [x: string]: I18nArgs | boolean | number | string };
