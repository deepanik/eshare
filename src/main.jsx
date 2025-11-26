import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Polyfills
import { Buffer } from 'buffer'
window.Buffer = Buffer

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Suppress MetaMask connection errors when extension is not installed
  const errorMessage = event.reason?.message || event.reason?.toString() || '';
  if (errorMessage.includes('MetaMask') || 
      errorMessage.includes('ExtensionPortStream') ||
      errorMessage.includes('Failed to connect to MetaMask')) {
    // These are expected when MetaMask is not installed or disconnected
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.debug('MetaMask connection error (expected if extension not installed):', errorMessage);
    }
    event.preventDefault(); // Prevent error from showing in console
    return;
  }
  
  // Log other unhandled rejections
  console.error('Unhandled promise rejection:', event.reason);
});

// Global error handler for errors
window.addEventListener('error', (event) => {
  // Suppress MetaMask-related errors
  const errorMessage = event.message || event.error?.message || '';
  if (errorMessage.includes('MetaMask') || 
      errorMessage.includes('ExtensionPortStream') ||
      errorMessage.includes('inpage.js')) {
    // These are expected when MetaMask is not installed or disconnected
    if (import.meta.env.DEV) {
      console.debug('MetaMask error (expected if extension not installed):', errorMessage);
    }
    event.preventDefault(); // Prevent error from showing in console
    return;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
