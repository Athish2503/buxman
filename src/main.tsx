import { createRoot } from 'react-dom/client'
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import App from './App.tsx'
import './index.css'

// Initialize Capacitor PWA elements
defineCustomElements(window);

createRoot(document.getElementById("root")!).render(<App />);
