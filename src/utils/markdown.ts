import { marked } from 'marked';
import hljs from 'highlight.js';

// Markedの設定
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        console.error(err);
      }
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

export function renderMarkdown(content: string): string {
  try {
    return marked(content) as string;
  } catch (error) {
    console.error('Failed to render markdown:', error);
    return '<p>Error rendering markdown</p>';
  }
}

export function getWordCount(text: string): number {
  return text.length;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_');
}
