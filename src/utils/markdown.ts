import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

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

// ⚠️ セキュリティ: marked() の出力には受信/インポートされたファイルの内容が
// そのまま含まれる可能性があり、生HTML(onerror属性やjavascript:リンク等)が
// 混入し得る。v-html に渡す前に必ず DOMPurify でサニタイズすること。
// (Wi-Fi Direct受信ファイル・ファイルインポートはどちらも中身を検証しないため、
//  ここでの無害化が唯一の防衛線になる)
export function renderMarkdown(content: string): string {
  try {
    const rawHtml = marked(content) as string;
    return DOMPurify.sanitize(rawHtml);
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