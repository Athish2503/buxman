import { createRoot } from 'react-dom/client'
import { defineCustomElements as defineIonicElements } from '@ionic/pwa-elements/loader';
import { defineCustomElements as defineSqliteElements } from 'jeep-sqlite/loader';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx'
import './index.css'

// Initialize Capacitor PWA elements
defineIonicElements(window);

// Initialize SQLite elements and wait for definition on web
const init = async () => {
  if (Capacitor.getPlatform() === 'web') {
    await defineSqliteElements(window);
  }
  createRoot(document.getElementById("root")!).render(<App />);
};

init();
