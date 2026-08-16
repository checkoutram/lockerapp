import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { clearPhotoCache } from './utils/photoStorage'

// Global vlocker API for native Android callbacks
declare global {
  interface Window {
    vlocker: {
      triggerAutoLock: () => void;
      clearSensitiveData: () => void;
    };
  }
}

let autoLockCallback: (() => void) | null = null;

window.vlocker = {
  triggerAutoLock: () => {
    // Clear decrypted photo cache
    clearPhotoCache();
    // Notify the app to lock
    if (autoLockCallback) {
      autoLockCallback();
    }
  },
  clearSensitiveData: () => {
    clearPhotoCache();
  },
};

export function setAutoLockCallback(callback: () => void) {
  autoLockCallback = callback;
}

export function removeAutoLockCallback() {
  autoLockCallback = null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
