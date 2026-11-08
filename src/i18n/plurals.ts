import { de, en, es, fr, ro, ru } from 'make-plural/cardinals';
import type { AppLanguage } from '../core/language.ts';

// Hermes does not provide Intl.PluralRules. These CLDR selectors also keep web/native agreement.
const rules = { de, en, es, fr, ro, ru } satisfies Record<AppLanguage, (count: number) => Intl.LDMLPluralRule>;
const logFix = process.env.EXPO_PUBLIC_DEBUG_FIX === 'true';

export function countPhrase(language: AppLanguage, count: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }): string {
  try {
    const category = rules[language](count);
    if (logFix) console.debug('[FIX:plural-rules] Selected count category', { language, count, category });
    return `${count} ${forms[category] ?? forms.other}`;
  } catch (error) {
    if (logFix) console.error('[FIX:plural-rules] Count phrase failed', { language, count, error });
    throw error;
  }
}
