import { Capacitor } from '@capacitor/core';
import type { P2pConnectPlugin } from '@enertrag/p2pconnect';

// 型定義がない場合のためのグローバル宣言
declare global {
  interface Window {
    P2pConnect?: P2pConnectPlugin;
  }
}

/**
 * 必要な権限リストを取得（Androidバージョン別）
 */
export function getRequiredPermissions(apiLevel: number): string[] {
  const permissions: string[] = [];

  if (apiLevel >= 33) {
    // Android 13+
    permissions.push(
      'android.permission.BLUETOOTH_ADVERTISE',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.NEARBY_WIFI_DEVICES'
    );
  } else if (apiLevel >= 31) {
    // Android 12 (API 31-32)
    permissions.push(
      'android.permission.BLUETOOTH_ADVERTISE',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.ACCESS_FINE_LOCATION'
    );
  } else if (apiLevel >= 29) {
    // Android 10-11
    permissions.push('android.permission.ACCESS_FINE_LOCATION');
  } else {
    // Android 9以下
    permissions.push('android.permission.ACCESS_COARSE_LOCATION');
  }

  return permissions;
}

/**
 * プラグインが利用可能かチェック
 * @enertrag/p2pconnectは実際にisAvailable()メソッドを持っている
 */
export async function checkP2pAvailable(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') {
    return true;
  }

  // 注意: @enertrag/p2pconnectのisAvailableは実装されていない可能性がある
  // その場合は常にtrueを返す
  try {
    // プラグインが登録されているかチェック
    if (!window.P2pConnect) {
      console.warn('P2pConnect plugin not found');
      return false;
    }
    return true;
  } catch (e) {
    console.error('P2P availability check failed:', e);
    return false;
  }
}

/**
 * ユーザーに権限ダイアログを表示するガイドメッセージ
 */
export function getPermissionGuideMessage(): string {
  return `
近くのデバイスとの通信には以下の権限が必要です：

1. Bluetooth権限
   - デバイスの検索と接続に使用します
   - 位置情報は取得しません

2. 近くのデバイス権限 (Android 13以降)
   - WiFi経由での高速転送に使用します

アプリ起動時に権限ダイアログが表示されます。
「許可」を選択してください。

権限を拒否した場合は、設定アプリから手動で許可できます：
設定 → アプリ → これMD? → 権限
`.trim();
}

/**
 * 設定アプリへの誘導用URL（Android）
 */
export function getSettingsUrl(packageName: string): string {
  return `android-app-settings:${packageName}`;
}