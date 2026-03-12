import { Capacitor } from '@capacitor/core';
import { alertController } from '@ionic/vue';

/**
 * Wi-Fi Direct に必要な権限をリクエストする
 *
 * @capacitor/geolocation は GMS (Google Mobile Services) を引き込むため使用不可。
 * WebView の navigator.geolocation 経由で Android のシステムダイアログを表示する。
 */
export async function requestWifiDirectPermissions(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') {
    return true;
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[Permissions] navigator.geolocation not available');
      resolve(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        console.log('[Permissions] Location permission granted');
        resolve(true);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          console.warn('[Permissions] Location permission denied');
          resolve(false);
        } else {
          // POSITION_UNAVAILABLE / TIMEOUT はダイアログは出た（拒否ではない）
          console.log('[Permissions] Geolocation error (not denial):', err.message);
          resolve(true);
        }
      },
      { timeout: 5000, maximumAge: 0 }
    );
  });
}

/**
 * 権限が永久拒否された場合の設定画面誘導メッセージ
 */
export function getPermissionDeniedMessage(): string {
  return '位置情報の権限が必要です。\n\n設定 → アプリ → これMD(マジ)? → 権限 → 位置情報\n→「アプリの使用中のみ許可」を選択してください。';
}
