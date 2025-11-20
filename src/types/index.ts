export interface MarkdownFile {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  language: 'ja' | 'en';
  fontSize: number;
  fontFamily: string;
  theme: 'light' | 'dark';
}

export type ViewMode = 'list' | 'grid';
export type EditorMode = 'edit' | 'preview';

export interface MarkdownToolbarButton {
  icon: string;
  label: string;
  insertBefore: string;
  insertAfter: string;
  placeholder?: string;
}
