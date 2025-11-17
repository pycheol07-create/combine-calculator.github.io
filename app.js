// 메인 컴포넌트
const App = () => {
    const [activeTabId, setActiveTabId] = React.useState('import');
    const [exchangeRate, setExchangeRate] = React.useState(() => localStorage.getItem('exchangeRate') || '1350');
    const [isAdminOpen, setIsAdminOpen] = React.useState(false); // [추가] 관리자 페이지 상태

    React.useEffect(() => { localStorage.setItem('exchangeRate', exchangeRate); }, [exchangeRate]);
    
    const tabs = React.useMemo(() => [
        { id: 'import', title: '수입가', component: <ImportCalculator exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} /> },
        { id: 'customs', title: '통관비', component: <CustomsCalculator exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} /> },
        { id: 'shipping', title: '선적', component: <ShippingCalculator /> },
    ], [exchangeRate]);

    // ... (Swipe Logic 동일) ...

    return (
        // [중요] SettingsProvider로 전체를 감싸야 합니다!
        <SettingsProvider>
            {isAdminOpen && <AdminPage onClose={() => setIsAdminOpen(false)} />}
            
            <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
                <div className="w-full max-w-6xl mx-auto flex flex-col h-full relative">
                    {/* [추가] 관리자 설정 버튼 (우측 상단) */}
                    <button 
                        onClick={() => setIsAdminOpen(true)} 
                        className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600"
                        title="설정 관리"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    <header className="text-center mb-10">
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 pb-2">비용 계산기</h1>
                        <p className="mt-2 text-lg text-slate-600">수입에 필요한 비용을 간편하게 계산해보세요.</p>
                    </header>

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
        </SettingsProvider>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");
const root = ReactDOM.createRoot(rootElement);
root.render(<React.StrictMode><App /></React.StrictMode>);