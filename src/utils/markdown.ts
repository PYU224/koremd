import { marked } from 'marked';
import hljs from 'highlight.js';

// カスタムレンダラーでシンタックスハイライトを追加
const renderer = new marked.Renderer();
renderer.code = function({ text, lang }: { text: string; lang?: string; escaped?: boolean }) {
  // ✅ text を使用（以前の code）
  // ✅ lang を使用（以前の language）
  
  if (lang && hljs.getLanguage(lang)) {
    const highlighted = hljs.highlight(text, { language: lang }).value;
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
  }
  
  const highlighted = hljs.highlightAuto(text).value;
  return `<pre><code class="hljs">${highlighted}</code></pre>`;
};

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
