// 설정 상태를 전역으로 관리하는 Context입니다.

const SettingsContext = React.createContext();

const SettingsProvider = ({ children }) => {
    // localStorage에서 설정을 불러오거나, 없으면 기본값(DEFAULT_SETTINGS)을 사용합니다.
    const [settings, setSettings] = React.useState(() => {
        try {
            const saved = localStorage.getItem('appSettings');
            return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
        } catch (e) {
            console.error("Failed to load settings", e);
            return DEFAULT_SETTINGS;
        }
    });

    // 설정이 변경될 때마다 localStorage에 저장합니다.
    React.useEffect(() => {
        localStorage.setItem('appSettings', JSON.stringify(settings));
    }, [settings]);

    // 설정을 업데이트하는 함수
    const updateSettings = (newSettings) => {
        setSettings(newSettings);
    };

    // 설정을 초기화하는 함수
    const resetSettings = () => {
        if (confirm('모든 설정을 초기값으로 되돌리시겠습니까?')) {
            setSettings(DEFAULT_SETTINGS);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};