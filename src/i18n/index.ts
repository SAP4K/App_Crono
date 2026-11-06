import { restoreLanguage } from '../core/language.ts';
import { ro } from './ro.ts';
import { en } from './en.ts';
import { ru } from './ru.ts';
import type { Messages } from './types.ts';

const catalogs = { ro, en, ru };
export function getMessages(language: unknown): Messages {
  return catalogs[restoreLanguage(language)];
}
