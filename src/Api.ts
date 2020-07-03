import fs from 'fs';
import _groupBy from 'lodash/groupBy';
import _reduce from 'lodash/reduce';
import _each from 'lodash/each';
import _trim from 'lodash/trim';
import _omit from 'lodash/omit';
import _isArray from 'lodash/isArray';
import _isObject from 'lodash/isObject';
import _map from 'lodash/map';
import jsonfile from 'jsonfile';
import {
  readVueFiles,
  readLangFiles,
  extractI18nItemsFromVueFiles,
  extractI18nItemsFromLanguageFiles,
  logMissingKeys,
  logUnusedKeys,
} from './library/index';

import { SimpleFile, I18NItem, I18NLanguage, I18NReport } from './library/models';

export enum VueI18NExtractReportTypes {
  None = 0,
  Missing = 1 << 0,
  Unused = 1 << 1,
  All = ~(~0 << 2)
};

export default class VueI18NExtract {
  public parseVueFiles(vueFilesPath: string): I18NItem[] {
    const filesList: SimpleFile[] = readVueFiles(vueFilesPath);
    return extractI18nItemsFromVueFiles(filesList);
  }

  public parseLanguageFiles(languageFilesPath: string): I18NLanguage {
    const filesList: SimpleFile[] = readLangFiles(languageFilesPath);
    return extractI18nItemsFromLanguageFiles(filesList);
  }

  public createI18NReport (vueFiles: string, languageFiles: string, reportType: VueI18NExtractReportTypes = VueI18NExtractReportTypes.All): I18NReport {
    const parsedVueFiles: I18NItem[] = this.parseVueFiles(vueFiles);
    const parsedLanguageFiles: I18NLanguage = this.parseLanguageFiles(languageFiles);

    return this.extractI18NReport(parsedVueFiles, parsedLanguageFiles, reportType);
  }

  public extractI18NReport (parsedVueFiles: I18NItem[], parsedLanguageFiles: I18NLanguage, reportType: VueI18NExtractReportTypes = VueI18NExtractReportTypes.All): I18NReport {
    const missingKeys = [];
    const unusedKeys = [];

    Object.keys(parsedLanguageFiles).forEach((languageFilePath) => {
      let languageItems = parsedLanguageFiles[languageFilePath];

      parsedVueFiles.forEach((vueItem) => {
        const usedByVueItem = ({ path }) => path === vueItem.path || path.startsWith(vueItem.path + '.');
        if (!parsedLanguageFiles[languageFilePath].some(usedByVueItem)) {
          missingKeys.push({ ...vueItem, languageFilePath });
        }
        languageItems = languageItems.filter((i) => !usedByVueItem(i));
      });

      unusedKeys.push(...languageItems.map((item) => ({ ...item, languageFilePath })));
    });

    let extracts = {};
    if (reportType & VueI18NExtractReportTypes.Missing) {
      extracts = Object.assign(extracts, { missingKeys });
    }
    if (reportType & VueI18NExtractReportTypes.Unused) {
      extracts = Object.assign(extracts, { unusedKeys });
    }

    return extracts;
  }

  public logI18NReport(report: I18NReport): void {
    Object.keys(report).forEach(key => {
      if (key === 'missingKeys') {
        logMissingKeys(report.missingKeys);
      } else if (key === 'unusedKeys') {
        logUnusedKeys(report.unusedKeys);
      }
    })
  }

  public async writeReportToFile (report: I18NReport, writePath: string): Promise<NodeJS.ErrnoException | void> {
    const reportString = JSON.stringify(report);
    return new Promise((resolve, reject) => {
      fs.writeFile(
        writePath,
        reportString,
        (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  public writeMissingKeysToJsonFilesSync (report: I18NReport): void {
    const { missingKeys } = report;
    const groupByLanguage = _groupBy(missingKeys, 'languageFilePath');

    _each(groupByLanguage, (value, key) => {
      const translationFilePath = key;

      const translationFileContent = jsonfile.readFileSync(translationFilePath);
      const dynamicKeyKeyword = "dynamic.";

      const translationObject = _reduce(
        value,
        (collection, translationDetails) => {
          try {

            if (translationDetails.path.includes(dynamicKeyKeyword)) {
              return collection;
            }

            collection[translationDetails.path] = '';
          } catch (e) {
            return collection;
          }
          return collection;
        },
        {},
      );

      const combinedTranslations = {
        ...translationFileContent,
        ...translationObject,
      };

      jsonfile.writeFileSync(translationFilePath, combinedTranslations, {
        spaces: 2,
      });
    });
  }

  public removeUnusedKeysToJsonFilesSync (report: I18NReport): void {
    const { unusedKeys } = report;
    const groupByLanguage = _groupBy(unusedKeys, 'languageFilePath');

    _each(groupByLanguage, (value, key) => {
      const translationFilePath = key;
      const translationFileContent = jsonfile.readFileSync(translationFilePath);
      const dynamicKeyKeyword = "dynamic.";

      const cleanedTranslationFileContent = _omit(
        translationFileContent,
        value
          .map(unusedKey => unusedKey.path)
          .filter(unusedKeyPath => !unusedKeyPath.includes(dynamicKeyKeyword)),
      );

      jsonfile.writeFileSync(translationFilePath, cleanedTranslationFileContent, {
        spaces: 2,
      });
    });
  }
}
