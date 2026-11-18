import { useCallback } from 'react';
import { useCronoActions, useCronoData } from '../context/CronoContext';
import { isLanguage } from '../core/language';
import type { AppLanguage } from '../core/language';
import { getMessages } from '../i18n';

export function useI18n() {
  const { update, feedback } = useCronoActions();
  const language = useCronoData('preferences').language;
  const setLanguage = useCallback((value: AppLanguage) => {
    if (!isLanguage(value)) return;
    const result = update((previous) => previous.preferences.language === value ? previous
      : { ...previous, preferences: { ...previous.preferences, language: value } });
    if (result.changed) feedback();
  }, [update, feedback]);
  return { language, messages: getMessages(language), setLanguage };
}
