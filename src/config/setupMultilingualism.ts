import i18next from "i18next";
import us from "@/locales/en/us.json";
import ru from "@/locales/ru/ru.json";
import { LanguageDetector } from "i18next-http-middleware";

/**
 * Установить модуль для мультиязычности через i18next
 */
i18next.use(LanguageDetector).init({
  fallbackLng: "ru", // Язык по умолчанию
  defaultNS: "ru", // Локализация по умолчанию
  resources: {
    en: { us },
    ru: { ru },
  },
});
