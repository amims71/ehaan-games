// Thin wiring: Capacitor App 'resume' + document 'visibilitychange'→visible
// both drive AudioService.handleResume, re-acquiring audio after the WKWebView
// suspends the context (call interruption / lock-unlock).
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AudioService } from '../audio/AudioService';

export class AppLifecycle {
  private appResumeHandle: PluginListenerHandle | null = null;
  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      void this.audio.handleResume('visibility-visible');
    }
  };

  constructor(private readonly audio: AudioService) {}

  start(): void {
    void App.addListener('resume', () => {
      void this.audio.handleResume('app-resume');
    }).then((handle) => {
      this.appResumeHandle = handle;
    });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  stop(): void {
    if (this.appResumeHandle) {
      void this.appResumeHandle.remove();
      this.appResumeHandle = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
