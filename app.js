// [수정됨] 'import' 구문을 모두 삭제합니다.
// [수정됨] 모든 React 훅(useState, useEffect 등) 앞에 'React.'를 추가합니다.
// [수정됨] Gemini 기능 (비교 모달) 관련 코드 모두 삭제

// --- 2. From App.tsx ---
// 메인 컴포넌트
const App = () => {
    const [activeTabId, setActiveTabId] = React.useState('import');
    const [exchangeRate, setExchangeRate] = React.useState(() => localStorage.getItem('exchangeRate') || '1350');
    // [삭제됨] Gemini 관련 state (comparisonScenarios, isComparisonOpen)

    React.useEffect(() => { localStorage.setItem('exchangeRate', exchangeRate); }, [exchangeRate]);
    // [삭제됨] Gemini 관련 useEffect
    
    // [삭제됨] handleSaveCompare 함수
    // [삭제됨] handleClearCompare 함수

    const tabs = React.useMemo(() => [
        // [수정됨] onSaveCompare 프롭 제거
        { id: 'import', title: '수입가', component: <ImportCalculator exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} /> },
        { id: 'customs', title: '통관비', component: <CustomsCalculator exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} /> },
        { id: 'shipping', title: '선적', component: <ShippingCalculator /> },
    ], [exchangeRate]); // [수정됨] dependency array 변경

    // --- Swipe Logic ---
    const touchStartX = React.useRef(null); const touchDeltaX = React.useRef(0); const [isSwiping, setIsSwiping] = React.useState(false);
    const activeTabIndex = React.useMemo(() => tabs.findIndex(tab => tab.id === activeTabId), [tabs, activeTabId]);
    const handleTouchStart = (e) => { if (['INPUT', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName) || e.target.closest('[role="button"]')) return; touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0; setIsSwiping(true); };
    const handleTouchMove = (e) => { if (!isSwiping || touchStartX.current === null) return; touchDeltaX.current = e.touches[0].clientX - touchStartX.current; };
    const handleTouchEnd = () => { if (!isSwiping) return; const swipeThreshold = 50; if (Math.abs(touchDeltaX.current) > swipeThreshold) { if (touchDeltaX.current < 0) { if (activeTabIndex < tabs.length - 1) setActiveTabId(tabs[activeTabIndex + 1].id); } else { if (activeTabIndex > 0) setActiveTabId(tabs[activeTabIndex - 1].id); } } setIsSwiping(false); touchStartX.current = null; touchDeltaX.current = 0; };
    // --- End Swipe Logic ---

    const tabStyles = "flex-1 py-3 px-4 text-center font-semibold rounded-t-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition-all duration-300";
    const activeTabStyles = "bg-white/80 text-emerald-600 shadow-md";
    const inactiveTabStyles = "bg-white/30 text-slate-600 hover:bg-white/50";
    const dragOffset = isSwiping ? touchDeltaX.current : 0;
    const transformValue = `translateX(calc(-${activeTabIndex * 100}% + ${dragOffset}px))`;

    return (
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
            {/* [삭제됨] ComparisonModal */}
            <div className="w-full max-w-6xl mx-auto flex flex-col h-full">
                {/* Header */}
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 pb-2">비용 계산기</h1>
                    <p className="mt-2 text-lg text-slate-600">수입에 필요한 비용을 간편하게 계산해보세요.</p>
                </header>

                {/* [삭제됨] Compare Button */}

                {/* Tabs */}
                <div className="w-full max-w-4xl mx-auto"><div className="flex mb-[-1px] z-10 relative">{tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTabId(tab.id)} className={`${tabStyles} ${activeTabId === tab.id ? activeTabStyles : inactiveTabStyles}`} aria-selected={activeTabId === tab.id}><span className="sm:hidden">{tab.title}<br />계산기</span><span className="hidden sm:inline">{tab.title} 계산기</span></button>))}</div></div>

                {/* Main Content Area */}
                <main className="w-full overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="flex" style={{ transform: transformValue, transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0.2, 1)' }}>
                        {tabs.map(tab => (<div key={tab.id} className="w-full flex-shrink-0">{tab.component}</div>))}
                    </div>
                </main>
            </div>
        </div>
    );
};

// --- 3. From index.tsx ---
// React 앱을 #root 에 렌더링
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");
const root = ReactDOM.createRoot(rootElement);
root.render(<React.StrictMode><App /></React.StrictMode>);