import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppStoreProvider } from './store/AppStore';
import { installAudioUnlock } from './lib/audio';
import './styles/global.css';

installAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker registration failed', err));
  });
}
