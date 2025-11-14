import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
// 1. 오타 수정: 'DEFAULT_SETTINGS}S' -> 'DEFAULT_SETTINGS'
import { DEFAULT_SETTINGS } from '../constants.js'; 

// 1. 설정 보관함(Context) 생성
const SettingsContext = createContext(null);

// 2. 설정값을 제공하는 Provider 컴포넌트 생성
export const SettingsProvider = ({ children }) => {
    // 3. 설정을 state로 관리 (localStorage에서 불러오거나, 없으면 기본값 사용)
    const [settings, setSettings] = useState(() => {
        try {
            const savedSettings = localStorage.getItem('calculatorSettings');
            if (savedSettings) {
                // 저장된 설정과 기본 설정을 합쳐서, 나중에 기본 설정에 새 값이 추가되어도 앱이 깨지지 않게 함
                const parsedSettings = JSON.parse(savedSettings);
                return { ...DEFAULT_SETTINGS, ...parsedSettings };
            }
        } catch (e) {
            console.error("Failed to load settings from localStorage", e);
        }
        return DEFAULT_SETTINGS;
    });

    // 4. 설정이 변경될 때마다 localStorage에 자동 저장
    useEffect(() => {
        try {
            localStorage.setItem('calculatorSettings', JSON.stringify(settings));
        } catch (e) {
            console.error("Failed to save settings to localStorage", e);
        }
    }, [settings]);

    // 5. 설정을 업데이트하는 함수
    const saveSettings = (newSettings) => {
        setSettings(prevSettings => ({
            ...prevSettings,
            ...newSettings,
        }));
    };

    // 6. 설정을 기본값으로 되돌리는 함수
    const resetSettings = () => {
        if (window.confirm("모든 설정을 기본값으로 되돌리시겠습니까?")) {
            setSettings(DEFAULT_SETTINGS);
            localStorage.setItem('calculatorSettings', JSON.stringify(DEFAULT_SETTINGS));
        }
    };

    // 7. Context로 전달할 값들을 memoization
    const value = useMemo(() => ({
        settings,
        saveSettings,
        resetSettings,
    }), [settings]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

// 8. 설정을 쉽게 가져다 쓸 수 있는 custom hook
export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};