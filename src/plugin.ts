import { mkdir, readdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { Plugin } from "vite";
import { diff } from 'ohash';
import { TranslationServiceClient } from '@google-cloud/translate';
import { getProp, list, setProp } from '@caiquecamargo/utils/core';
import { consola } from 'consola';

const createFolderIfNotExists = async (path: string) => {
  try {
    await readdir(path);
  } catch {
    await mkdir(path, { recursive: true });
  }
};

const tryReadFile = async (path: string) => {
  try {
    const file = await readFile(path, "utf-8");

    return file;
  } catch {
    return null;
  }
}

const saveCache = async (folder: string, file: string) => {
  await writeFile(path.join(folder, '__cached__.json'), file, 'utf-8')
}

const diffs = (a: string, b: string) => {
  return diff(JSON.parse(a), JSON.parse(b)).map(d => d.key)
}

const compareWithCached = async (file: string, folder: string) => {
  const cached = await tryReadFile(path.join(folder, '__cached__.json'));

  if (!cached) {
    await saveCache(folder, file);

    return diffs(file, "{}");
  }

  return diffs(cached, file);
}

async function translateText(projectId: string, text: string, sourceLanguageCode: string, targetLanguageCode: string) {
  const translationClient = new TranslationServiceClient({
    projectId
  });

  const location = 'global';

  const request = {
      parent: `projects/${projectId}/locations/${location}`,
      contents: [text],
      mimeType: 'text/plain',
      sourceLanguageCode,
      targetLanguageCode,
  };

  const [response] = await translationClient.translateText(request);

  if (!response.translations || !response.translations.length) return;
  return response.translations[0].translatedText;
}

const translate = async (projectId: string, obj: Record<string, unknown>, ref: Record<string, unknown>, changes: string[], defaultLocale: string, locale: string) => {
  const total = changes.length;
  for (const [_index, key] of Object.entries(changes)) {
    const index = Number(_index);
    process.stdout.write(`\r -> [${index + 1}/${total}] - ${key}`);

    const value = getProp(ref, key) as string | Record<string, unknown> | undefined;

    if (!value) continue;
    if (typeof value !== 'string') {
      setProp(obj, key, await translate(projectId, value, getProp(obj, key) as Record<string, unknown>, Object.keys(value), defaultLocale, locale));

      continue;
    };

    const translated = await translateText(projectId, value, defaultLocale, locale);

    if (!translated) continue;

    process.stdout.write("\r                                                          \r")

    const matchs = value.match(/({.*?}|@:.*?\s|@:.*?$)/g);
    const translatedMatchs = translated?.match(/({.*?}|@:.*?\s|@:.*?$)/g);
    
    if (!matchs || !translatedMatchs) {
      obj[key] = translated;
      continue;
    };

    let resolved = translated;
    for (const index of list(0, matchs.length)) {
      const match = matchs[index];
      const translatedMatch = translatedMatchs[index];

      resolved = resolved.replace(translatedMatch, match);
    }

    obj[key] = resolved;
  }
  return obj;
}

export type I18nConfig = {
  locales: string[];
  defaultLocale: string;
  folder: string;
  projectId: string;
}

export const createTranslations = async (root: string, entry?: I18nConfig) => {
  const {
    locales = ["pt", "en", "es"],
    defaultLocale = "pt",
    folder = "src/locales",
    projectId
  } = entry ?? {};

  consola.start(`Creating translations for ${locales.join(", ")}`);

  if (!projectId) {
    consola.info(`No projectId provided, skipping translations`);

    return;
  };

  await createFolderIfNotExists(path.join(root, folder));
  const file = await tryReadFile(path.join(root, folder, `${defaultLocale}.json`));

  if (!file) {
    consola.error(`No default locale file found, skipping translations`);

    return;
  };
  
  const changes = await compareWithCached(file, path.join(root, folder));

  if (!changes || !changes.length) {
    consola.info(`No changes found, skipping translations`);

    return;
  };

  consola.log(`Found ${changes.length} changes, translating...`)

  for (const locale of locales.filter((locale) => locale !== defaultLocale)) {
    consola.start(`Translating to ${locale}`);
    const localeFile = await tryReadFile(path.join(root, folder, `${locale}.json`));

    const translated = await translate(projectId, JSON.parse(localeFile ?? "{}"), JSON.parse(file), changes, defaultLocale, locale);

    if (!translated) continue;

    consola.success(`Translated to ${locale}`);

    await writeFile(path.join(root, folder, `${locale}.json`), JSON.stringify(translated, null, 2), "utf-8");
  }

  await saveCache(path.join(root, folder), file);
};

export default async function (entry?: I18nConfig): Promise<Plugin> {
  let root = "";

  return {
    name: "vite-plugin-i18n",
    configResolved: (config) => {
      root = config.root;
    },
    buildStart: async () => {
      await createTranslations(root, entry);
    },
    handleHotUpdate: async ({ file }) => {
      if (file.includes("locales")) {
        await createTranslations(root, entry);
      }
    },
  };
}