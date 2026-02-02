# Wi-Fi Direct Plugin for Capacitor

Capacitor 6/7/8対応のAndroid Wi-Fi Directプラグインです。

## インストール方法

### 1. ローカルプラグインとして配置

プラグインをアプリのルートディレクトリに配置します:

```bash
your-app/
├── wifi-direct-plugin/  # このプラグインフォルダ
├── android/
├── ios/
├── src/
└── package.json
```

### 2. プラグインのビルド

プラグインディレクトリ内で:

```bash
cd wifi-direct-plugin
npm install
npm run build
```

### 3. アプリにインストール

アプリのルートディレクトリで:

```bash
npm install ./wifi-direct-plugin
npx cap sync android
```

または、`package.json`に直接追加:

```json
{
  "dependencies": {
    "@local/wifi-direct": "file:./wifi-direct-plugin"
  }
}
```

その後:

```bash
npm install
npx cap sync android
```

## 使用方法

```typescript
import { WifiDirect } from '@local/wifi-direct';

// 初期化
await WifiDirect.initialize();

// ピア検索を開始
await WifiDirect.discoverPeers();

// イベントリスナーを追加
WifiDirect.addListener('peersChanged', (data) => {
  console.log('Peers found:', data.peers);
});

WifiDirect.addListener('connectionChanged', (data) => {
  console.log('Connection status:', data);
});

// ピアに接続
await WifiDirect.connectToPeer({ 
  deviceAddress: 'aa:bb:cc:dd:ee:ff' 
});

// ファイル送信(クライアント側)
await WifiDirect.sendFile({
  filePath: '/path/to/file.txt',
  hostAddress: '192.168.49.1',  // Group Ownerのアドレス
  port: 8988
});

// ファイル受信サーバー起動(Group Owner側)
await WifiDirect.startFileServer({
  savePath: '/path/to/save/directory',
  port: 8988
});

// 切断
await WifiDirect.disconnect();
```

## API

### Methods

- `initialize()`: Wi-Fi Directを初期化
- `discoverPeers()`: ピア検索を開始
- `stopPeerDiscovery()`: ピア検索を停止
- `connectToPeer(options)`: ピアに接続
- `disconnect()`: 切断
- `sendFile(options)`: ファイルを送信
- `startFileServer(options)`: ファイル受信サーバーを起動
- `stopFileServer()`: ファイル受信サーバーを停止

### Events

- `wifiP2pStateChanged`: Wi-Fi P2Pの状態変化
- `peersChanged`: ピアリストの変更
- `connectionChanged`: 接続状態の変更
- `transferProgress`: ファイル転送の進捗

## 必要な権限

プラグインは以下の権限を自動的にリクエストします:

- Android 13+: `NEARBY_WIFI_DEVICES`
- Android 12以下: `ACCESS_FINE_LOCATION`

## 注意事項

- このプラグインはAndroidのみをサポートしています
- Wi-Fi Directはデバイスがサポートしている必要があります
- ファイル転送時はネットワーク上で適切なポート(デフォルト: 8988)が開いている必要があります
