import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.telaeris.ehaangames',
  appName: 'Ehaan Games',
  webDir: 'dist',
  // INTENTIONALLY no `server.url`: all assets are bundled (kids-store thin-wrapper
  // avoidance, Guideline 4.2; zero networking). Do not add server.url.
};

export default config;
