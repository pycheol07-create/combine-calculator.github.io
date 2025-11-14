import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { SettingsProvider } from './context/SettingsContext.js'; // 1. SettingsProvider import

// --- From index.tsx ---
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");
const root = ReactDOM.createRoot(rootElement);

// 2. <App />을 <SettingsProvider>로 감싸줍니다.
root.render(
    <React.StrictMode>
        <SettingsProvider>
            <App />
        </SettingsProvider>
    </React.StrictMode>
);