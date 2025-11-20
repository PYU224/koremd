import { marked } from 'marked';
import hljs from 'highlight.js';

// marked v17対応: カスタムレンダラーでシンタックスハイライトを追加
const renderer = new marked.Renderer();

// ✅ marked v17の正しい型定義に対応
renderer.code = function({ text, lang }: { text: string; lang?: string; escaped?: boolean }): string {
  // text を使用（marked v17ではtextプロパティ）
  // lang を使用（marked v17ではlangプロパティ）
  
  if (lang && hljs.getLanguage(lang)) {
    try {
      const highlighted = hljs.highlight(text, { language: lang }).value;
      return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
    } catch (error) {
      console.error('Highlight error:', error);
    }
  }
  
  try {
    const highlighted = hljs.highlightAuto(text).value;
    return `<pre><code class="hljs">${highlighted}</code></pre>`;
  } catch (error) {
    console.error('Highlight auto error:', error);
    return `<pre><code>${text}</code></pre>`;
  }
};

// marked設定
marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: true
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