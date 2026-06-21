import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Service Worker and Request Notification Permission
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Service Worker Registered successfully:', reg);
        // Request notification permission
        if ('Notification' in window) {
          Notification.requestPermission().then(permission => {
            console.log('Notification permission status:', permission);
          });
        }
      })
      .catch(err => console.error('Service Worker Registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
