import { restoreLanguage } from '../core/language.ts';
import { ro } from './ro.ts';
import { en } from './en.ts';
import { ru } from './ru.ts';
import { es } from './es.ts';
import { fr } from './fr.ts';
import { de } from './de.ts';
import type { Messages } from './types.ts';

const catalogs = { ro, en, ru, es, fr, de };
export function getMessages(language: unknown): Messages {
  return catalogs[restoreLanguage(language)];
}
