export const LANGUAGES = [
  { id: 'en', label: 'English', locale: 'en-GB' },
  { id: 'es', label: 'Español', locale: 'es-ES' },
  { id: 'fr', label: 'Français', locale: 'fr-FR' },
  { id: 'ru', label: 'Русский', locale: 'ru-RU' },
  { id: 'de', label: 'Deutsch', locale: 'de-DE' },
  { id: 'ro', label: 'Română', locale: 'ro-RO' },
] as const;

export type AppLanguage = typeof LANGUAGES[number]['id'];
export const DEFAULT_LANGUAGE: AppLanguage = 'ro';
export function isLanguage(value: unknown): value is AppLanguage {
  return LANGUAGES.some((language) => language.id === value);
}
export function restoreLanguage(value: unknown): AppLanguage {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}
