import { useCallback } from 'react';
import { useCrono } from '../context/CronoContext';
import { isLanguage } from '../core/language';
import type { AppLanguage } from '../core/language';
import { getMessages } from '../i18n';

export function useI18n() {
  const { data, update, feedback } = useCrono();
  const language = data.preferences.language;
  const setLanguage = useCallback((value: AppLanguage) => {
    if (!isLanguage(value)) return;
    const result = update((previous) => previous.preferences.language === value ? previous
      : { ...previous, preferences: { ...previous.preferences, language: value } });
    if (result.changed) feedback();
  }, [update, feedback]);
  return { language, messages: getMessages(language), setLanguage };
}
