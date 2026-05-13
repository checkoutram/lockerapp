import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vlocker.app',
  appName: 'vlocker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'always',
    scheme: 'vlocker',
    // Allow loading local files for photos
    allowsLinkPreview: false,
    scrollEnabled: true,
    // Background mode for biometric
    backgroundColor: '#0A1628',
  },
  plugins: {
    Camera: {
      saveToGallery: false,
    },
  },
};

export default config;
