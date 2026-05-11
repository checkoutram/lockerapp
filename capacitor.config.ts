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
  plugins: {
    Camera: {
      // Save photos to gallery
      saveToGallery: false,
    },
  },
};

export default config;
