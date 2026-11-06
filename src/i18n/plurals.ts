import { LANGUAGES } from '../core/language.ts';
import type { AppLanguage } from '../core/language.ts';

const rules = new Map(LANGUAGES.map(({ id, locale }) => [id, new Intl.PluralRules(locale)]));
export function countPhrase(language: AppLanguage, count: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }): string {
  const category = rules.get(language)!.select(count);
  return `${count} ${forms[category] ?? forms.other}`;
}
