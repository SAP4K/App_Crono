export const LANGUAGES = [
  { id: 'ro', label: 'Română', locale: 'ro-RO' },
  { id: 'en', label: 'English', locale: 'en-GB' },
  { id: 'ru', label: 'Русский', locale: 'ru-RU' },
] as const;

export type AppLanguage = typeof LANGUAGES[number]['id'];
export const DEFAULT_LANGUAGE: AppLanguage = 'ro';
export function isLanguage(value: unknown): value is AppLanguage {
  return LANGUAGES.some((language) => language.id === value);
}
export function restoreLanguage(value: unknown): AppLanguage {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}
