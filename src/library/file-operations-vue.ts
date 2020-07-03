import { SimpleFile, I18NItem } from './models';

export function extractI18nItemsFromVueFiles (sourceFiles: SimpleFile[]): I18NItem[] {
  return sourceFiles.reduce((accumulator, file) => {
    const methodMatches = extractMethodMatches(file);
    const componentMatches = extractComponentMatches(file);
    const directiveMatches = extractDirectiveMatches(file);
    return [
      ...accumulator,
      ...methodMatches,
      ...componentMatches,
      ...directiveMatches,
    ];
  }, []);
}

function extractMethodMatches(file: SimpleFile): I18NItem[] {
  const methodRegExp: RegExp = /(?:[ .]?(\$t|translate|\$tc))\(\s*?(["'`])(.*?)\2/g;
  return [...getMatches(file, methodRegExp, 3, 3)];
}

function extractComponentMatches(file: SimpleFile): I18NItem[] {
  const componentRegExp: RegExp = /(?:<i18n|<I18N)(?:.|\n)*?(?:[^:]path=(["']))(.*?)\1/g;
  return [...getMatches(file, componentRegExp, 2, 3)];
}

function extractDirectiveMatches(file: SimpleFile): I18NItem[] {
  const directiveRegExp: RegExp = /v-t="'(.*)'"/g;
  return [...getMatches(file, directiveRegExp)];
}

function* getMatches (file: SimpleFile, regExp: RegExp, captureGroupKey: number = 1, captureGroupValue?: number): IterableIterator<I18NItem> {
  while (true) {
    const match: RegExpExecArray = regExp.exec(file.content);
    if (match === null) {
      break;
    }
    const line = (file.content.substring(0, match.index).match(/\n/g) || []).length + 1;
    yield {
      path: match[captureGroupKey],
      line,
      file: file.fileName,
      value: captureGroupValue && match[captureGroupValue],
    };
  }
}
