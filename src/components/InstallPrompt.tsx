import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if dismissed previously
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if it's already installed, dismissed, or we don't have a prompt (not supported or already accepted/rejected)
  if (isInstalled || isDismissed || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-80 bg-surface border border-primary/30 p-4 rounded-xl shadow-2xl z-50 flex items-start gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-primary/20 p-2 rounded-lg text-primary mt-1">
        <Download className="w-6 h-6" />
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-sm mb-1">Install ReaperHub</h3>
        <p className="text-xs text-muted mb-3">
          Add to your home screen for quick access and offline capabilities.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 bg-surface-2 text-text text-xs font-bold rounded-lg hover:bg-surface-3 transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="text-muted hover:text-text p-1 -mt-1 -mr-1"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
