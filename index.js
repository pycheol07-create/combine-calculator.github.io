// (수정) 'react'와 'react-dom/client'를 importmap 대신 전체 URL로 변경합니다.
import React from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';

import { App } from './App.js';
import { SettingsProvider } from './context/SettingsContext.js';

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