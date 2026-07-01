# Changelog / 変更履歴

All notable changes to KoreMD (これＭＤ（マジ）？) will be documented in this file.

このファイルには、KoreMD（これＭＤ（マジ）？）の注目すべきすべての変更が記録されます。

---

## v1.1.9 (2026-07-01)

### 🔒 Fixed / 修正

#### Markdownプレビューの無害化（サニタイズ）を追加

- **問題**: 受信/インポートしたMarkdown中に生HTML（`<img onerror="...">`等）が含まれていた場合、無害化されずそのまま`v-html`で描画されており、Wi-Fi Direct受信ファイル・ローカルインポートの両経路からXSSが成立し得た
- **原因**: `renderMarkdown()`が`marked()`の出力をそのまま返しており、サニタイズ処理が存在しなかった
- **修正内容**:
  - `dompurify`を導入
  - `renderMarkdown()`の戻り値を`DOMPurify.sanitize()`に通してから返すように変更
- **効果**:
  - ✅ `onerror`/`onload`属性、`javascript:`リンク等の危険な要素を除去
  - ✅ 太字・リスト・シンタックスハイライト用の`class`属性など通常のMarkdown表示には影響なし（実際の悪意あるペイロードで前後比較検証済み）

**影響範囲**: `src/utils/markdown.ts`, `package.json`（dompurify追加）

#### ファイル保存をアトミック化（強制終了時の全ファイル消失リスクを解消）

- **問題**: `files.json`に毎回直接上書きしていたため、書き込み中にアプリが強制終了すると保存中のファイル1件だけでなく、保存済みの全ファイルが破損・消失する可能性があった
- **原因**: 一時ファイルを経由しない直接上書き方式で、かつ書き込みが並行して走ることを防ぐ仕組みもなかった
- **修正内容**:
  - `files.json.tmp`に書き込んでから`Filesystem.rename()`で本体に反映するアトミック書き込みに変更
  - `createFile`/`updateFile`/`deleteFile`等から連続で保存が呼ばれても競合しないよう、保存処理をキューで直列化
  - `files.json`が読めない場合に`files.json.tmp`からの復旧を試みるフォールバックを追加
- **効果**:
  - ✅ 保存の途中でアプリが強制終了しても、`files.json`本体は直前の正常な状態のまま残る
  - ✅ 復旧不能な全ファイル消失のリスクを解消

**影響範囲**: `src/stores/fileStore.ts`

#### `alertController.create()`の戻り値未取得による実行時エラーの可能性を修正

- **問題**: 役割切り替え通知・ファイル受信完了通知・ファイル受信エラー通知の3箇所で、`alertController.create()`の戻り値を変数に代入せず、直後に`alert.present()`を呼んでいた。この`alert`はグローバルの`window.alert`関数を指してしまっており、`.present`メソッドが存在しないため呼び出された瞬間に例外が発生する状態だった
- **原因**: `await alertController.create({...})`の戻り値を受け取らずに次の行で`alert`という変数名を参照していた（ローカルスコープに同名の変数がないため`window.alert`にフォールバックしていた）
- **修正内容**: 3箇所それぞれで戻り値を`roleAlert`/`receivedAlert`/`errorAlert`という変数に格納し、その変数に対して`.present()`を呼ぶように修正
- **効果**: ✅ 役割切り替え時・ファイル受信完了時・ファイル受信失敗時のアラート表示で例外が発生しなくなった

**影響範囲**: `src/composables/useWifiDirectShare.ts`

#### デバッグログに存在しないログレベル`'success'`を渡していた箇所を修正

- **問題**: `debugLogger.addLog('success', 'WiFiDirect', 'Autonomous GO created successfully')`という呼び出しが1箇所あったが、`useDebugLogger.ts`側の`LogEntry['level']`型には`'debug' | 'info' | 'warning' | 'error'`しか定義されておらず、`'success'`は含まれていなかった。実行時はログの絵文字表示が`undefined`になるだけで済んでいたが、型としては不整合だった
- **修正内容**: `'info'`に変更（ローカルの`addLog()`ラッパーが行っている`success → info`のマッピングと整合させた）

**影響範囲**: `src/composables/useWifiDirectShare.ts`

#### `error.value`（`string | null`）を`progress.value.message`（`string`）に渡す際の型不整合を修正

- **問題**: `startSharing`/`sendMarkdown`のエラーハンドリングで、`error.value = err?.message || '...'`で代入した直後の値をそのまま`progress.value.message`に渡していたが、`error`が`Ref<string | null>`型のためTypeScriptの型チェックが通らなかった
- **修正内容**: エラーメッセージをローカル変数（`startErrorMessage`/`sendErrorMessage`）に一度だけ格納し、`error.value`と`progress.value.message`の両方にそれを使うよう整理

**影響範囲**: `src/composables/useWifiDirectShare.ts`

#### `Intl.DateTimeFormatOptions`の`fractionalSecondDigits`が型エラーになっていた問題を修正

- **問題**: `useDebugLogger.ts`で使用している`fractionalSecondDigits`オプションの型定義が、`tsconfig.json`の`lib`設定（`ES2020`まで）に含まれておらず型エラーになっていた
- **原因**: `fractionalSecondDigits`はTypeScriptの`lib.es2021.intl.d.ts`で定義されており、`ES2021.Intl`が`lib`に含まれていなかった
- **修正内容**: `tsconfig.json`の`lib`に`"ES2021.Intl"`を追加

**影響範囲**: `tsconfig.json`

#### 未使用importの削除

- `src/utils/permissions.ts`で未使用だった`alertController`のimportを削除

**影響範囲**: `src/utils/permissions.ts`

---

**検証**: `npx vue-tsc --noEmit` および `npm run build` がいずれも0エラーで完了することを確認済み。

**Note**: `package.json`のバージョン表記（`1.1.8.3`）および`SettingsView.vue`の表示バージョンは今回更新していません。リリースのタイミングで別途更新してください。

---

## v1.1.8 (2026-03-10)

### ✨ Improved / 改善

#### ランタイム権限リクエストの実装
- **問題**: アプリ起動時または送受信機能使用時に、位置情報・付近のデバイスの権限許可ダイアログが表示されていなかった
- **原因**:
  - `showPermissionAlert()`関数で `alertController.create()` の戻り値を `await` しておらず、`alert.present()` が未定義のオブジェクトに対して呼ばれていた
  - `requestWifiDirectPermissions()` 関数が定義されていたが、`startSharing()` から呼ばれていなかった
- **修正内容**:
  - `permissions.ts` を書き直し、`@capacitor/geolocation` がある場合はそちら、ない場合は `navigator.geolocation` を fallback として使う2段階権限リクエストを実装
  - `useWifiDirectShare.ts` の `startSharing()` 冒頭で権限リクエストを実行するように変更
  - 権限が永久拒否された場合は設定アプリへの誘導メッセージを表示
- **効果**:
  - ✅ 送受信機能を初めて使ったタイミングでシステムダイアログが表示される
  - ✅ 「位置情報」「付近のデバイス」の両権限をまとめてリクエスト
  - ✅ 永久拒否済みの場合は設定画面への誘導メッセージを表示

**影響範囲**: `src/utils/permissions.ts`, `src/composables/useWifiDirectShare.ts`

#### 受信モードの安定性向上（discoverPeers 競合解消）
- **問題**: 受信モード開始直後に `discoverPeers()` が「System is busy」エラーで失敗し、接続が切断される
- **原因**: `createGroup()`（Autonomous Group Owner）成功直後に即座に `discoverPeers()` を呼んでいたため、前セッションの後処理イベントが大量に流れている間に競合が発生していた
- **修正内容**:
  - 受信モードでは `discoverPeers()` をスキップ（GO として待機するだけで不要）
  - 送信モードでは「System is busy」エラー時に 1秒・2秒間隔で最大3回リトライ
  - `initialize()` 後処理が完了するまで 800ms 待機を追加

**影響範囲**: `src/composables/useWifiDirectShare.ts`

#### デバッグログUIの削除
- 開発用のログ表示パネルおよびエクスポートボタンを UI から削除
- 内部ログ記録（`useDebugLogger`）は引き続き動作（将来の診断用）

**影響範囲**: `src/components/NearbyShare.vue`

### 🔒 Fixed / 修正

#### FABボタンのスタイル修正
- ファイル一覧の「＋」ボタンが金色・グロー表示になっていた問題を修正
- `color="tertiary"` → `color="primary"` に変更し、不要な `box-shadow` CSS を削除

**影響範囲**: `src/views/FileListView.vue`

#### 「ファイルがありません」の表示位置を修正
- 空のファイル一覧で「ファイルがありません」テキストが垂直中央ではなく上寄りに表示されていた問題を修正
- `height: 100%` は `ion-content` 内では機能しないため `position: absolute` による中央揃えに変更

**影響範囲**: `src/views/FileListView.vue`


---

## v1.1.7 (2026-02-07)

### 🔒 Fixed / 修正

####
- **問題**: APKのサイズが5MB→25MBに膨れ上がっていた
- **解決策**: `AndroidManifest`の`application`内に`android:extractNativeLibs="true"`を追加し、`@fontsource/noto-sans-jp`のフォントを削除

---

## v1.1.4 (2026-02-04)

### 🔒 Fixed / 修正

#### Google Fontsへの外部接続を完全に排除
- **問題**: アプリ起動時に`App.vue`から`/assets/fonts.css`を読み込んでしまい`fonts.googleapis.com`と`fonts.gstatic.com`へ接続していた
- **原因**: `variables.css`に"Noto Sans JP"が指定されていたが、システムにフォントがない環境でフォールバック処理がGoogle Fontsに接続
- **解決策**: npmパッケージ`@fontsource/noto-sans-jp`を使用してフォントを直接アプリに組み込み
- **実装内容**:
  - `package.json`に`@fontsource/noto-sans-jp`を追加
  - `main.ts`でNoto Sans JP（400/700）をimport
  - `fonts.css`から外部のフォントを読み込む処理があったのでファイルそのものを削除、`App.vue`からもimportの記述を削除
  - フォントファイルがビルドに含まれ、外部接続が不要に
- **効果**:
  - ✅ Google Fontsへの接続ゼロ
  - ✅ 完全オフライン動作
  - ✅ プライバシー保護
  - ✅ IzzyOnDroid/F-Droidの基準に準拠

**影響範囲**: `package.json`, `src/main.ts`, `asset/fonts.css`（削除）, `App.vue`

**APKサイズへの影響**: 約500KB増加（Noto Sans JP 2ウェイト）

**技術的な詳細**:

Fontsourceは、Google Fontsのフォントをnpmパッケージとして提供するサービスです。これにより：

1. **ビルド時にバンドル**: フォントファイルがアプリのビルドに含まれる
2. **外部接続不要**: すべてのリソースがローカルに存在
3. **確実な利用**: ネットワーク状態やシステム環境に依存しない

```typescript
// main.ts で import
import '@fontsource/noto-sans-jp/400.css';  // Regular
import '@fontsource/noto-sans-jp/500.css';  // Regular
import '@fontsource/noto-sans-jp/700.css';  // Bold
```

**IzzyOnDroidからのフィードバックへの対応**:
PCAPdroid（ https://github.com/emanuele-f/PCAPdroid ）を使用したテストで、Google Fontsへの接続が検出されていた問題を完全に解決しました。

---

## v1.1.3 (2026-02-04)

### 🌍 Improved / 改善

#### Wi-Fi Direct共有画面の完全な英語対応
- **改善内容**: すべてのテキストに英語翻訳を追加し、言語設定に応じて自動的に切り替わるようになりました
- **対象画面**: Wi-Fi Direct共有機能のすべてのUI要素
- **実装内容**:
  - `src/locales/en.ts`に`nearbyShare`セクションを追加
  - `src/locales/ja.ts`に`nearbyShare`セクションを追加
  - ボタン、ラベル、メッセージ、説明文、デバイスステータスなど全要素を翻訳
- **効果**: 英語圏のユーザーでも Wi-Fi Direct共有機能を問題なく使用可能

**影響範囲**: `src/locales/en.ts`, `src/locales/ja.ts`

**追加された翻訳**:
- モード選択画面（送信/受信）
- 接続情報
- デバイスリスト
- 使い方の説明
- デバイスステータス（利用可能、接続済み、招待中など）
- エラーメッセージ

#### プライバシー改善: Google Fontsへの接続を完全に削除
- **改善内容**: 外部サーバーへの接続を完全に削除し、システムフォントを使用するように変更
- **削除したもの**: `fonts.googleapis.com`と`fonts.gstatic.com`への接続
- **使用するフォント**:
  - **Android**: Roboto, Noto Sans JP（システム標準）
  - **iOS**: San Francisco（システム標準）
  - **Windows**: Segoe UI（システム標準）
  - **macOS**: San Francisco, Hiragino Sans（システム標準）
- **メリット**:
  - ✅ プライバシー保護（外部サーバーへの接続なし）
  - ✅ オフライン環境で完全に動作
  - ✅ フォント読み込み時間ゼロ
  - ✅ OSネイティブの見た目で自然

**影響範囲**: `index.html`, `src/theme/variables.css`

**技術的な詳細**:

```css
/* システムフォントスタック */
:root {
  --ion-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
                     "Helvetica Neue", Arial, "Noto Sans", sans-serif;
}

html[lang="ja"] {
  --ion-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                     "Hiragino Sans", "Hiragino Kaku Gothic ProN", 
                     "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif;
}
```

**IzzyOnDroidからのフィードバックへの対応**:
このリリースは、IzzyOnDroidからの以下のフィードバックに対応しています：
1. 英訳が不完全（特にWi-Fi Direct共有画面）→ 完全な英語対応を実装
2. Google Fontsへの接続 → システムフォントに変更して外部接続を削除

---

## v1.1.2 (2026-02-02)

### 🐛 Fixed / 修正

#### Wi-Fi Direct共有機能の重複受信問題を修正
- **問題**: 受信モードで「共有を開始」ボタンを連打すると、同じファイルが複数回受信される
- **影響**: ユーザーが誤って連打した場合、不要なファイルが大量に作成される
- **原因**: 
  - `isSharing`フラグの設定タイミングが遅すぎた（非同期処理の後）
  - 非同期処理（`WifiDirect.initialize()`、`WifiDirect.discoverPeers()`）の実行中に2回目のタップが処理され、重複実行が発生
  - JavaScriptの非同期処理の特性により、1回目の処理が完了する前に2回目が開始されていた
- **修正内容**:
  - **useWifiDirectShare.ts**: `isSharing.value = true`をチェック直後に即座に設定するように変更
  - **NearbyShare.vue**: 「共有を開始」ボタンに`:disabled="isSharing"`属性を追加し、UI レベルでも重複実行を防止
  - **エラー時のリセット**: エラー発生時に`isSharing.value = false`に戻す処理を追加
  - **3層防御システム**:
    1. UIレベル: ボタンの`:disabled="isSharing"`属性
    2. コンポーネントレベル: `handleStart`内の重複チェック
    3. Composableレベル: `startSharing`内の重複チェック + 即座のフラグ設定

**影響範囲**: `src/views/NearbyShare.vue`, `src/composables/useWifiDirectShare.ts`

**技術的な詳細**:

```typescript
// Before (問題のあるコード)
async function startSharing(mode: 'send' | 'receive') {
  if (isSharing.value) return false;
  
  // ... 初期化処理
  await WifiDirect.initialize();    // 非同期処理
  await WifiDirect.discoverPeers(); // 非同期処理
  
  isSharing.value = true;  // ← 遅すぎる！❌
  return true;
}

// After (修正後のコード)
async function startSharing(mode: 'send' | 'receive') {
  if (isSharing.value) return false;
  
  // ✅ CRITICAL: 即座にtrueに設定
  isSharing.value = true;
  
  // ... 初期化処理
  await WifiDirect.initialize();    // この時点で既にtrue ✅
  await WifiDirect.discoverPeers();
  
  return true;
}
```

**タイミング図**:

```
修正前:
0ms   タップ1回目 → startSharing実行 → isSharing: false
50ms  initialize()実行中...
100ms タップ2回目 → startSharing実行 → isSharing: false ← まだfalse！❌
      → 2つとも実行される

修正後:
0ms   タップ1回目 → startSharing実行 → isSharing: false
1ms   isSharing = true ← 即座に設定！✅
50ms  initialize()実行中...
100ms タップ2回目 → startSharing実行 → isSharing: true ← 既にtrue！
      → ブロックされる ✅
```

**テスト項目**:
- ✅ 受信モードで「共有を開始」を素早く3回タップ
- ✅ ファイルが1回だけ受信されることを確認
- ✅ ボタンが即座に無効化されることを確認
- ✅ 2回目以降のタップがブロックされることを確認

### 🎨 Improved / 改善

#### Wi-Fi Direct Autonomous Group Owner 機能を実装
- **改善内容**:
  - 受信モードで`createGroup()`を使用してAutonomous Group Ownerとして起動
  - ネゴシエーションの不確実性を排除し、受信側が確実にGroup Ownerになるように改善
  - 送信側と受信側の役割が確実に期待通りになるように改善

**影響範囲**: `wifi-direct-plugin/src/definitions.ts`, `wifi-direct-plugin/src/web.ts`, `wifi-direct-plugin/android/.../WifiDirectPlugin.java`, `src/composables/useWifiDirectShare.ts`

---

## v1.1.1 (2026-01-24)
- 送信/受信モード選択機能を追加
- ファイル受信処理を改善（内容を直接イベントで渡す）
- 初期化処理を改善（クリーンアップと待機時間）
- エラーメッセージとログを改善
- UI/UXを改善

## [1.0.4] - 2025-11-23

### 🎨 Improved / 改善

#### グリッド表示でのファイル名表示の改善
- **問題**: グリッド表示で長いファイル名が1行で切り詰められ、ファイル名全体を確認しにくい
- **改善内容**:
  - ファイル名を**2行まで**表示するように変更
  - 2行を超える場合は自動的に「...」で省略
  - 長い単語（ハイフンなし）も適切に折り返すように改善
  - グリッドアイテムの最小高さを140pxに統一し、レイアウトの一貫性を向上

**影響範囲**: `src/views/FileListView.vue`

**技術的な詳細**:

```css
// Before (修正前)
.grid-info h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;  // 1行のみ表示
}

// After (修正後)
.grid-info h3 {
  display: -webkit-box;
  -webkit-line-clamp: 2;  // 2行まで表示
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  word-break: break-word;  // 長い単語も折り返す
  line-height: 1.4;
  max-height: calc(1.4em * 2);
}

.grid-item {
  min-height: 140px;  // 最小高さを追加
}
```

**ユーザー体験の向上**:
- ✅ 長いファイル名でも2行まで表示され、内容が把握しやすくなった
- ✅ グリッドレイアウトがより整然とした見た目に
- ✅ ファイル名の視認性が大幅に向上

---

## [1.0.3] - 2025-11-22

### 🐛 Fixed / 修正

#### Androidバックボタンによるファイル上書き・画面フリーズ問題を修正
- **問題**: Androidで戻るボタンを何度か押して作業を進めた後、ファイル一覧への戻る操作を行うと、別のファイルにファイル名や中身が上書きされたり、真っ白な画面になってアプリが再起動が必要になる
- **影響**: Android版のみで発生、複数のファイルを編集する際に深刻な問題
- **原因**: 
  - Androidのネイティブバックボタンとアプリ内戻るボタンのルーティング履歴が不整合
  - ページ遷移時の自動保存タイミングの問題（別のファイルに遷移した後、古いcontentで保存される）
  - `currentFile`の状態管理が適切にクリアされていない
  - ファイルIDの整合性チェックが不十分
- **修正内容**:
  - **App.vue**: Androidバックボタンのハンドリング追加
    - `@capacitor/app`のバックボタンリスナーを実装
    - エディター画面でバックボタン押下時にファイル一覧へ適切に遷移
    - アプリ終了の適切なハンドリング
  - **EditorView.vue**: 保存ロジックの大幅改善
    - `currentEditingFileId`でファイルIDを追跡
    - `isNavigating`フラグでナビゲーション中の保存を抑制
    - `onBeforeUnmount`で確実に保存とクリーンアップ
    - `watch(content)`でファイルID整合性チェック
    - `watch(route.params.id)`で別ファイルへの遷移を検知
    - `goBack()`で遅延を入れて安全に遷移
  - **fileStore.ts**: 状態管理の改善
    - `selectFile()`で深いコピー（`{ ...file }`）を作成して参照問題を回避
    - `clearCurrentFile()`関数の追加
    - `createFile()`でも深いコピーを使用

**影響範囲**: `src/App.vue`, `src/views/EditorView.vue`, `src/stores/fileStore.ts`

**技術的な詳細**:

```typescript
// App.vue - Androidバックボタンのハンドリング
if (Capacitor.isNativePlatform()) {
  backButtonListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (router.currentRoute.value.name === 'Editor') {
      router.push('/');  // エディターから一覧へ
    } else if (!canGoBack) {
      CapacitorApp.exitApp();  // アプリ終了
    } else {
      window.history.back();  // 通常の戻る
    }
  });
}

// EditorView.vue - ファイルID整合性チェック
watch(content, () => {
  if (isNavigating) return;  // ナビゲーション中はスキップ
  
  // ファイルIDの整合性チェック
  if (fileStore.currentFile?.id !== currentEditingFileId.value) {
    console.warn('File ID mismatch, skipping auto-save');
    return;
  }
  
  // 自動保存
  saveTimer = setTimeout(() => {
    if (!isNavigating) saveCurrentFile();
  }, 1000);
});

// fileStore.ts - 深いコピーで参照問題を回避
function selectFile(id: string) {
  const file = files.value.find(f => f.id === id);
  if (file) {
    currentFile.value = { ...file };  // 深いコピー
  }
}
```

**デバッグプロセス**:
1. Androidの戻るボタンとアプリ内戻るボタンの動作の違いを確認
2. ページ遷移時のファイル保存タイミングをログで追跡
3. `currentFile`の参照が複数のファイル間で共有されていることを発見
4. ライフサイクルフックでの適切なクリーンアップが不足していることを確認
5. ファイルID追跡とナビゲーションフラグを導入して問題を解決

**テスト項目**:
- ✅ エディター画面でAndroidバックボタンを押してファイル一覧に戻る
- ✅ 複数のファイルを連続して編集
- ✅ ファイル編集中にアプリ内戻るボタンを使用
- ✅ ファイル内容が別のファイルに上書きされないことを確認
- ✅ 画面が真っ白にならないことを確認

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

### Androidバックボタンの注意事項

Capacitor Android アプリでバックボタンを適切に処理するには：

```typescript
// App.vue
import { App as CapacitorApp } from '@capacitor/app';

// バックボタンリスナーの登録
const backButtonListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  // カスタム処理
  if (router.currentRoute.value.name === 'Editor') {
    router.push('/');  // ファイル一覧に戻る
  } else if (!canGoBack) {
    CapacitorApp.exitApp();  // アプリ終了
  } else {
    window.history.back();  // 通常の戻る
  }
});

// クリーンアップ
onUnmounted(() => {
  if (backButtonListener) {
    backButtonListener.remove();
  }
});
```

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

**Version 1.1.8 - 権限リクエスト対応・Wi-Fi Direct安定性向上 ✨**

</div>