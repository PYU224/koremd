# KoreMD / これＭＤ（マジ）？

<div align="center">

<img src="public/icon.png" width="360">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Android-green.svg)](https://www.android.com/)

**A Markdown Editor with Wi-Fi Direct Sharing for Android**

**Wi-Fi Direct機能を搭載したAndroid用Markdownエディタ**

[English](#english) | [日本語](#japanese)

</div>

---

## English

### Overview

KoreMD is a Markdown editor for Android that features Wi-Fi Direct file sharing capabilities. Edit Markdown files offline and share them directly with nearby devices without an internet connection.

### ✨ Features

#### ✍️ Markdown Editing
- Real-time preview
- Syntax highlighting
- Easy markup insertion with toolbar
- Auto-save functionality
- Keyword search

#### 📡 Wi-Fi Direct Sharing
- No internet connection required
- High-speed transfer to nearby Android devices
- 10-50x faster than Bluetooth
- Supports large Markdown files
- Autonomous Group Owner for reliable connections

#### 📁 File Management
- Manage multiple Markdown files
- Import/Export files
- File sharing functionality

#### 🌍 Multi-language Support
- Japanese
- English

### 🛠️ Tech Stack

- **Framework**: Vue 3 + Ionic Framework 8
- **Build Tool**: Vite
- **Mobile Framework**: Capacitor 8
- **Language**: TypeScript
- **State Management**: Pinia
- **Markdown Processing**: marked + highlight.js

### 📦 Installation

#### Prerequisites

- Node.js 18+ (Recommended 24.13.0+)
- npm 9+
- Android Studio (for Android development)

#### Setup

```bash
# Install Node
wget -q -O /tmp/nodejs.tar.xz https://nodejs.org/dist/v24.13.0/node-v24.13.0-linux-x64.tar.xz
sha256sum -c <<< 'e798599612f4bb71333a3397ab0d095fd62214e115aea45aa858a145fc72d67e  /tmp/nodejs.tar.xz'
tar xf /tmp/nodejs.tar.xz -C /opt
export PATH="${PATH}:/opt/node-v24.13.0-linux-x64/bin"

# Install dependencies
npm install

# Build Wi-Fi Direct plugin
cd wifi-direct-plugin
npm install
npm run build
cd ..

# Build web assets (重要!)
npm run build

# Sync Capacitor
npx cap sync android
```

### 🚀 Development

#### Start Development Server

```bash
npm run dev
```

#### Build

```bash
# Web build
npm run build

# Sync for Android build
npx cap sync android

# Open in Android Studio
npx cap open android

# Without Android Studio
cd android
./gradlew assembleRelease
```

### 📱 Using Wi-Fi Direct Sharing

#### Basic Flow

1. **Start sharing on both sender and receiver devices**
   - Tap the Wi-Fi icon at the bottom left of the editor
   - Tap "Start Sharing" in the modal

2. **Device Discovery**
   - Ensure both devices are nearby
   - Wait for devices to appear in the list

3. **Connection**
   - Sender: Tap to select the target device
   - Wait for connection to establish

4. **File Transfer**
   - Sender: Tap "Send Markdown"
   - Receiver: File is automatically received and saved

#### Important Notes

- **Android Only**: Wi-Fi Direct is only available on Android devices
- **Permissions Required**:
  - Android 12 and below: Location permission
  - Android 13 and above: Nearby Wi-Fi devices permission
- **Wi-Fi Enabled**: Wi-Fi must be turned on
- **Proximity**: Devices must be close to each other (typically within 10m)

### 🔧 Troubleshooting

#### Devices Not Detected

1. Check if Wi-Fi is enabled on both devices
2. Check if location services are enabled (Android 12 and below)
3. Verify app permissions are granted
4. Try "Stop Sharing" and start again

#### Connection Fails

1. Restart devices
2. Turn Wi-Fi off and on again
3. Restart the app

### 📄 License

MIT License

### 👤 Author

PYU

### 🙏 Acknowledgments

- [Ionic Framework](https://ionicframework.com/)
- [Vue.js](https://vuejs.org/)
- [Capacitor](https://capacitorjs.com/)
- [marked](https://marked.js.org/)
- [highlight.js](https://highlightjs.org/)

---

## Japanese

### 概要

KoreMDは、Wi-Fi Direct機能を搭載したAndroid用のMarkdownエディタです。オフラインでMarkdownファイルを編集し、インターネット接続なしで近くのデバイスと直接共有できます。

### ✨ 主な機能

#### ✍️ Markdown編集
- リアルタイムプレビュー
- シンタックスハイライト
- ツールバーによる簡単な記法挿入
- 自動保存機能
- キーワード検索機能

#### 📡 Wi-Fi Direct共有
- インターネット接続不要
- 近くのAndroidデバイスへ高速転送
- Bluetoothの10〜50倍の転送速度
- 大きなMarkdownファイルも転送可能
- Autonomous Group Owner機能による確実な接続

#### 📁 ファイル管理
- 複数のMarkdownファイルを管理
- ファイルのインポート/エクスポート
- ファイル共有機能

#### 🌍 多言語対応
- 日本語
- 英語

### 🛠️ 技術スタック

- **フレームワーク**: Vue 3 + Ionic Framework 8
- **ビルドツール**: Vite
- **モバイルフレームワーク**: Capacitor 8
- **言語**: TypeScript
- **状態管理**: Pinia
- **Markdown処理**: marked + highlight.js

### 📦 インストール

#### 前提条件

- Node.js 18以上 （24.13.0以上推奨）
- npm 9以上
- Android Studio（Android開発用）

#### セットアップ

```bash
# Install Node
wget -q -O /tmp/nodejs.tar.xz https://nodejs.org/dist/v24.13.0/node-v24.13.0-linux-x64.tar.xz
sha256sum -c <<< 'e798599612f4bb71333a3397ab0d095fd62214e115aea45aa858a145fc72d67e  /tmp/nodejs.tar.xz'
tar xf /tmp/nodejs.tar.xz -C /opt
export PATH="${PATH}:/opt/node-v24.13.0-linux-x64/bin"

# Install dependencies
npm install

# Build Wi-Fi Direct plugin
cd wifi-direct-plugin
npm install
npm run build
cd ..

# Build web assets (重要!)
npm run build

# Sync Capacitor
npx cap sync android
```

### 🚀 開発

#### 開発サーバーの起動

```bash
npm run dev
```

#### ビルド

```bash
# Webビルド
npm run build

# Androidビルド用に同期
npx cap sync android

# Android Studioを開く
npx cap open android

# Android Studio無しの場合
cd android
./gradlew assembleRelease
```

### 📱 Wi-Fi Direct機能の使い方

#### 基本的な流れ

1. **送信側と受信側の両方で「共有を開始」をタップ**
   - エディタ画面左下のWi-Fiアイコンをタップ
   - モーダルで「共有を開始」をタップ

2. **デバイスの検出**
   - 両方のデバイスが近くにあることを確認
   - デバイスリストに相手のデバイスが表示されるまで待機

3. **接続**
   - 送信側でデバイスを選択してタップ
   - 接続が確立されるまで待機

4. **ファイル転送**
   - 送信側: 「Markdownを送信」をタップ
   - 受信側: 自動的にファイルを受信・保存

#### 注意事項

- **Android専用機能**: Wi-Fi DirectはAndroidデバイスのみで利用可能
- **権限が必要**:
  - Android 12以下: 位置情報権限
  - Android 13以上: 近くのWi-Fiデバイス権限
- **Wi-Fi接続**: Wi-FiがONになっている必要があります
- **近距離**: デバイス同士が近くにある必要があります（一般的に10m以内）

### 🔧 トラブルシューティング

#### デバイスが検出されない

1. 両方のデバイスでWi-FiがONになっているか確認
2. 位置情報サービスがONになっているか確認（Android 12以下）
3. アプリに必要な権限が付与されているか確認
4. 「共有を停止」してから再度「共有を開始」を試す

#### 接続に失敗する

1. デバイスを再起動
2. Wi-Fiを一度OFFにしてから再度ONにする
3. アプリを再起動

### 📄 ライセンス

MIT License

### 👤 作者

PYU

### 🙏 謝辞

- [Ionic Framework](https://ionicframework.com/)
- [Vue.js](https://vuejs.org/)
- [Capacitor](https://capacitorjs.com/)
- [marked](https://marked.js.org/)
- [highlight.js](https://highlightjs.org/)

---

<div align="center">

**Made with ❤️ by PYU**

Supporting Moldova 🇲🇩 | モルドバを支援 🇲🇩

Links<br>
https://linksta.cc/@pyu224

</div>