# Changelog / 変更履歴

All notable changes to KoreMD (これＭＤ（マジ）？) will be documented in this file.

このファイルには、KoreMD（これＭＤ（マジ）？）の注目すべきすべての変更が記録されます。

---

## [1.0.2] - 2025-11-21

### 🐛 Fixed / 修正

#### Android版で日本語入力（IME）が動作しない問題を修正
- **問題**: Android版アプリで日本語入力（IME変換）が全く動作せず、フリック入力やローマ字入力ができない
- **影響**: エミュレーター・実機の両方で発生、ブラウザ版（npm run dev）では正常に動作
- **原因**: 
  - `capacitor.config.ts` の `android.captureInput: true` 設定がWebViewのIME処理を上書きしていた
  - この設定により、ネイティブレベルでキーボード入力をキャプチャしてしまい、WebViewの通常のIME処理が機能しなくなっていた
  - ブラウザ版では `captureInput` の影響を受けないため、問題に気づきにくかった
- **修正内容**:
  - `capacitor.config.ts` から `captureInput: true` を削除
  - `webContentsDebuggingEnabled` を `true` に変更（開発中のデバッグを容易にするため）
  - WebViewのデフォルトのIME処理を使用するように変更

**影響範囲**: `capacitor.config.ts`

```typescript
// Before (問題のあるコード)
android: {
  allowMixedContent: false,
  captureInput: true,  // ← これがIME入力を妨げていた
  webContentsDebuggingEnabled: false
}

// After (修正後のコード)
android: {
  allowMixedContent: false,
  // captureInput を削除（デフォルト動作を使用）
  webContentsDebuggingEnabled: true  // 開発時のデバッグを有効化
}
```

**技術的な詳細**:
- `captureInput: true` は通常のテキスト入力では不要な設定
- この設定はゲーム開発やカスタムキーボード実装など、特殊な用途でのみ使用すべき
- 通常のテキスト入力アプリでは設定しないことを推奨

**デバッグプロセス**:
1. 当初、コード側のIME対応実装の問題を疑った
2. Gboardの設定やAndroid端末側の問題も調査
3. 新規プロジェクトで同じコードをテストし、同じ問題が再現
4. ビルド環境・設定に問題があると推測
5. capacitor.config.ts の設定を確認し、`captureInput: true` が原因と判明

---

## [1.0.1] - 2024-11-21

### 🐛 Fixed / 修正

#### ファイルインポート機能の改善
- **問題**: Googleドライブ等からダウンロードした`.md`ファイルが正しく認識されない
- **原因**: 
  - 限定的なMIMEタイプのみサポート
  - ファイル名の検証・正規化が不十分
- **修正内容**:
  - より多くのMIMEタイプに対応（`text/markdown`, `text/plain`, `text/x-markdown`, `application/octet-stream`）
  - ファイル拡張子の検証機能を追加
  - サポートされていない拡張子の場合、確認ダイアログを表示
  - ファイル名の自動正規化（`.md`拡張子の自動追加）
  - インポート成功/失敗時のフィードバックメッセージを追加
  - エラーハンドリングの改善

**影響範囲**: `src/views/FileListView.vue`

```typescript
// Before
input.accept = '.md,.markdown,.txt';

// After  
input.accept = '.md,.markdown,.txt,text/markdown,text/plain,text/x-markdown,application/octet-stream';

// ファイル名の正規化処理を追加
if (!fileName.toLowerCase().endsWith('.md') && 
    !fileName.toLowerCase().endsWith('.markdown')) {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex > 0) {
    fileName = fileName.substring(0, lastDotIndex) + '.md';
  } else {
    fileName = fileName + '.md';
  }
}
```

### 🔧 Technical Changes / 技術的な変更

#### FileListView.vue
- `importFile()`関数の完全な書き直し
- `processFileImport()`ヘルパー関数の追加
- ファイル検証ロジックの実装
- ユーザーフィードバックの改善

---

## [1.0.0] - 2024-11-20

### ✨ Features / 機能

- ✨ シンプルでクリーンなMarkdownエディター
- 📝 リアルタイム編集とライブプレビュー
- 👁️ 編集/プレビューモードの切り替え
- 📱 iOS、Android、Web、デスクトップ（Electron）対応
- 🌐 日本語・英語の多言語サポート
- 🎨 フォントサイズ・フォントファミリーのカスタマイズ
- 💾 ファイルのインポート/エクスポート
- 🔒 ローカルストレージによるデータ保存
- 🇲🇩 モルドバ国旗カラーをモチーフにしたデザイン
- 🔍 キーワード検索機能
- ⌨️ Markdownツールバー（H1-H3、太字、斜体、コード、リンク、リスト、引用、画像、区切り線）

### 🛠️ Technical Stack / 技術スタック

- **Framework**: Ionic 7 + Vue 3
- **Language**: TypeScript
- **Build Tool**: Vite
- **Mobile Framework**: Capacitor 7
- **State Management**: Pinia
- **Markdown Parser**: marked
- **Syntax Highlighting**: highlight.js
- **Internationalization**: vue-i18n

---

## Future Plans / 今後の予定

### Planned Features / 予定されている機能

- [ ] ダークモードの実装
- [ ] クラウド同期機能（オプション）
- [ ] Markdownテーブル編集の強化
- [ ] 画像の直接貼り付け
- [ ] ファイルのカテゴリー/タグ管理
- [ ] エクスポート形式の拡張（HTML、PDF）
- [ ] キーボードショートカット
- [ ] 印刷機能
- [ ] 履歴/バージョン管理

### Known Issues / 既知の問題

現在のところ、重大な既知の問題はありません。

**注意事項**:
- Android版で日本語入力を使用する場合、`capacitor.config.ts` に `captureInput: true` を設定しないでください
- ビルド時に Capacitor Filesystem プラグインの警告が表示される場合がありますが、動作に影響はありません

---

## Development Notes / 開発メモ

### Android日本語入力（IME）の注意事項

Capacitor Android アプリで日本語入力を正常に動作させるためには、以下の設定が必要です：

```typescript
// capacitor.config.ts
android: {
  // ⚠️ captureInput: true を設定しない
  // （通常のテキスト入力では不要、IME処理を妨げる）
  webContentsDebuggingEnabled: true
}
```

**captureInput を使用すべき場合**:
- ゲーム開発
- カスタムキーボードの実装
- 特殊な入力制御が必要な場合

**通常のテキスト入力アプリでは使用しないでください。**

---

## Support / サポート

問題を発見した場合や機能リクエストがある場合は、以下のリンクからお知らせください：

- GitHub Repository: https://github.com/PYU224/koremd
- GitHub Issues: https://github.com/PYU224/koremd/issues
- Author: PYU224
- Contact: https://linksta.cc/@pyu224

---

<div align="center">

Made with ❤️ by PYU224

Supporting Moldova 🇲🇩 | モルドバを支援 🇲🇩

**Version 1.0.2 - Android日本語入力完全対応！✅**

</div>