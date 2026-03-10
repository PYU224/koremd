import { Capacitor } from '@capacitor/core';
import { alertController } from '@ionic/vue';

/**
 * Wi-Fi Direct に必要な権限をリクエストする
 *
 * @capacitor/geolocation がある場合はそちらを優先。
 * なければ WebView の Geolocation API 経由で Android のシステムダイアログを表示する。
 */
export async function requestWifiDirectPermissions(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') {
    return true;
  }

  try {
    // @capacitor/geolocation がインストールされていれば使う（推奨）
    const { Geolocation } = await import('@capacitor/geolocation');
    const current = await Geolocation.checkPermissions();

    if (current.location === 'granted') {
      console.log('[Permissions] Already granted');
      return true;
    }

    if (current.location === 'denied') {
      console.warn('[Permissions] Permanently denied');
      return false;
    }

    const result = await Geolocation.requestPermissions({ permissions: ['location'] });
    return result.location === 'granted';

  } catch {
    // @capacitor/geolocation がない場合は WebView Geolocation で代替
    console.log('[Permissions] @capacitor/geolocation not found, using WebView Geolocation');
    return requestViaWebViewGeolocation();
  }
}

/**
 * WebView の navigator.geolocation を使ってシステムダイアログを表示する
 * （@capacitor/geolocation 未インストール時の fallback）
 */
function requestViaWebViewGeolocation(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[Permissions] navigator.geolocation not available');
      resolve(true); // ブロックしない
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        console.log('[Permissions] WebView geolocation granted');
        resolve(true);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          console.warn('[Permissions] WebView geolocation denied');
          resolve(false);
        } else {
          // POSITION_UNAVAILABLE / TIMEOUT はダイアログ自体は出た
          console.log('[Permissions] WebView geolocation error (not denial):', err.message);
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
