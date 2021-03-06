import dot from 'dot-object';
import { SimpleFile, I18NLanguage } from './models';

export function extractI18nItemsFromLanguageFiles (languageFiles: SimpleFile[]): I18NLanguage {
  return languageFiles.reduce((accumulator, file) => {

    const flattenedObject = dot.dot(file.content);
    const i18nInFile = Object.keys(flattenedObject).map((key, index) => {
      return {
        line: index,
        path: key,
        file: file.fileName,
        value: flattenedObject[key],
      };
    });

    accumulator[file.path] = i18nInFile;
    return accumulator;
  }, {});
}
