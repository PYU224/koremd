import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pyu.koremd',
  appName: 'これMD(マジ)?',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Filesystem: {
      publicStorage: true
    }
  }
};

export default config;
