import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cc.pyu224.koremd',
  appName: 'KoreMD',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0066cc',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffd700',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'Light', // ステータスバーのスタイル
      backgroundColor: '#0066cc', // ステータスバーの背景色（青）
    }
  },
  // Androidのナビゲーションバーとステータスバーの設定
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;