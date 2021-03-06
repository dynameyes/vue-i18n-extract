export interface SimpleFile {
  fileName: string;
  path: string;
  content: any;
}

export interface I18NItem {
  line?: number;
  path: string;
  file?: string;
  language?: string;
  value?: string;
}

export interface I18NLanguage {
  [language: string]: I18NItem[];
}

export interface I18NReport {
  missingKeys?: I18NItem[];
  unusedKeys?: I18NItem[];
}
