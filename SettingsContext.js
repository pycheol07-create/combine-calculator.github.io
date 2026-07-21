// 설정 상태를 전역으로 관리하는 Context입니다.
// 통관비 옵션의 상품단가/박스당수량/박스당무게는 구글 스프레드시트에서 자동 fetch합니다.

const SettingsContext = React.createContext();

// 시트 fetch 설정: P1=상품단가, O1=박스당수량, M1=박스당무게
const CUSTOMS_SHEET = {
    id: '1vaQUA4P7fyof4Y3OHynnOMAaRNpMrKyepgXjOZcYNbQ',
    gid: '319984063',
    range: 'M1:P1',
};

// gviz CSV 응답을 파싱해 M1/O1/P1 값 추출 (M1=weight, O1=qtyPerBox, P1=unitPrice)
const parseSheetCsv = (csv) => {
    const line = (csv || '').split('\n')[0] || '';
    // CSV 셀 분리 (따옴표 및 콤마 처리)
    const cells = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
            else inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
            cells.push(cur); cur = '';
        } else {
            cur += c;
        }
    }
    cells.push(cur);
    // M=0, N=1, O=2, P=3
    const stripNum = (s) => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
    return {
        defaultWeightPerBox: stripNum(cells[0]),
        defaultQuantityPerBox: stripNum(cells[2]),
        defaultUnitPrice: stripNum(cells[3]),
    };
};

const fetchCustomsDefaultsFromSheet = async () => {
    const url = `https://docs.google.com/spreadsheets/d/${CUSTOMS_SHEET.id}/gviz/tq?tqx=out:csv&gid=${CUSTOMS_SHEET.gid}&range=${CUSTOMS_SHEET.range}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const values = parseSheetCsv(text);
    if ([values.defaultWeightPerBox, values.defaultQuantityPerBox, values.defaultUnitPrice].some(v => !Number.isFinite(v))) {
        throw new Error('Invalid values from sheet');
    }
    return values;
};

// 저장된 설정과 기본 설정을 머지합니다. 신규 키가 DEFAULT_SETTINGS에 추가된 경우에도 기존 사용자가 누락 없이 사용할 수 있도록 합니다.
const mergeWithDefaults = (saved) => {
    const merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    if (!saved || typeof saved !== 'object') return merged;
    for (const category of Object.keys(merged)) {
        if (saved[category] && typeof saved[category] === 'object') {
            for (const key of Object.keys(saved[category])) {
                merged[category][key] = saved[category][key];
            }
        }
    }
    return merged;
};

const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = React.useState(() => {
        try {
            const saved = localStorage.getItem('appSettings');
            return saved ? mergeWithDefaults(JSON.parse(saved)) : DEFAULT_SETTINGS;
        } catch (e) {
            console.error("Failed to load settings", e);
            return DEFAULT_SETTINGS;
        }
    });

    // 시트 동기화 상태: 'idle' | 'loading' | 'success' | 'error'
    const [sheetSyncStatus, setSheetSyncStatus] = React.useState('idle');
    const [sheetSyncError, setSheetSyncError] = React.useState(null);
    const [sheetSyncedAt, setSheetSyncedAt] = React.useState(null);

    const syncFromSheet = React.useCallback(async () => {
        setSheetSyncStatus('loading');
        setSheetSyncError(null);
        try {
            const values = await fetchCustomsDefaultsFromSheet();
            setSettings(prev => ({
                ...prev,
                customs: {
                    ...prev.customs,
                    defaultUnitPrice: values.defaultUnitPrice,
                    defaultQuantityPerBox: values.defaultQuantityPerBox,
                    defaultWeightPerBox: values.defaultWeightPerBox,
                },
            }));
            setSheetSyncStatus('success');
            setSheetSyncedAt(new Date());
        } catch (e) {
            console.warn('시트 동기화 실패:', e);
            setSheetSyncStatus('error');
            setSheetSyncError(e.message || String(e));
        }
    }, []);

    // 앱 로드 시 자동으로 시트에서 fetch
    React.useEffect(() => {
        syncFromSheet();
    }, [syncFromSheet]);

    // 설정이 변경될 때마다 localStorage에 저장합니다.
    React.useEffect(() => {
        localStorage.setItem('appSettings', JSON.stringify(settings));
    }, [settings]);

    const updateSettings = (newSettings) => {
        setSettings(newSettings);
    };

    const resetSettings = () => {
        if (confirm('모든 설정을 초기값으로 되돌리시겠습니까?')) {
            setSettings(DEFAULT_SETTINGS);
        }
    };

    return (
        <SettingsContext.Provider value={{
            settings, updateSettings, resetSettings,
            sheetSyncStatus, sheetSyncError, sheetSyncedAt, syncFromSheet,
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
