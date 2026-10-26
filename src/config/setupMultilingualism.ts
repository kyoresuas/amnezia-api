import i18next from "i18next";
import us from "@/locales/en/us.json";
import ru from "@/locales/ru/ru.json";
import { LanguageDetector } from "i18next-http-middleware";

/**
 * Установить модуль для мультиязычности через i18next
 */
i18next.use(LanguageDetector).init({
  fallbackLng: "ru", // Язык по умолчанию
  defaultNS: "translation", // Общее пространство имен для всех языков
  resources: {
    en: { translation: us },
    ru: { translation: ru },
  },
});
