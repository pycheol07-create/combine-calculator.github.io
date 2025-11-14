import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ComparisonModal } from './components/ComparisonModal.js';
import { ImportCalculator } from './components/ImportCalculator.js';
import { CustomsCalculator } from './components/CustomsCalculator.js';
import { ShippingCalculator } from './components/ShippingCalculator.js';
import { SettingsModal } from './components/SettingsModal.js'; // 1. SettingsModal import

// --- '설정' 아이콘 컴포넌트 ---
const CogIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const App = () => {
    const [activeTabId, setActiveTabId] = useState('import');
    const [exchangeRate, setExchangeRate] = useState(() => localStorage.getItem('exchangeRate') || '1350');
    const [comparisonScenarios, setComparisonScenarios] = useState([]);
    const [isComparisonOpen, setComparisonOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); // 2. 설정 모달 상태 추가

    useEffect(() => { localStorage.setItem('exchangeRate', exchangeRate); }, [exchangeRate]);
    useEffect(() => { try { const saved = localStorage.getItem('comparisonScenarios'); if(saved) setComparisonScenarios(JSON.parse(saved)); } catch (e) { console.error("Failed to parse scenarios", e) } }, []);
    
    const handleSaveCompare = (type, data) => {
        const newScenario = { type, data, id: Date.now() + Math.random() };
        setComparisonScenarios(prev => {
            const updated = prev.length < 2 ? [...prev, newScenario] : [prev[0], newScenario];
            localStorage.setItem('comparisonScenarios', JSON.stringify(updated));
            return updated;
        });
    };

    const handleClearCompare = () => {
        setComparisonScenarios([]);
        localStorage.removeItem('comparisonScenarios');
        setComparisonOpen(false);
    };

    const tabs = useMemo(() => [
        { id: 'import', title: '수입가', component: <ImportCalculator exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} onSaveCompare={handleSaveCompare} /> },
        { id: 'customs', title: '통관비', component: <CustomsCalculator exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} onSaveCompare={handleSaveCompare} /> },
        { id: 'shipping', title: '선적', component: <ShippingCalculator /> },
    ], [exchangeRate]); // comparisonScenarios는 tabs 렌더링과 직접 관련 없으므로 제거

    // --- Swipe Logic ---
    const touchStartX = useRef(null); const touchDeltaX = useRef(0); const [isSwiping, setIsSwiping] = useState(false);
    const activeTabIndex = useMemo(() => tabs.findIndex(tab => tab.id === activeTabId), [tabs, activeTabId]);
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
            {/* 3. 모달 컴포넌트들 렌더링 */}
            <ComparisonModal show={isComparisonOpen} onClose={() => setComparisonOpen(false)} onClear={handleClearCompare} scenarios={comparisonScenarios} />
            <SettingsModal show={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            
            <div className="w-full max-w-6xl mx-auto flex flex-col h-full">
                {/* Header */}
                <header className="relative text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 pb-2">비용 계산기</h1>
                    <p className="mt-2 text-lg text-slate-600">수입에 필요한 비용을 간편하게 계산해보세요.</p>
                    
                    {/* 4. 설정 버튼 추가 */}
                    <div className="absolute top-0 right-0">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 text-gray-500 hover:text-emerald-600 transition-colors duration-200"
                            title="설정"
                        >
                            <CogIcon />
                        </button>
                    </div>
                </header>

                {/* Compare Button */}
                {comparisonScenarios.length > 0 && (
                    <div className="fixed bottom-5 right-5 z-40">
                        <button onClick={() => setComparisonOpen(true)} className="bg-blue-600 text-white font-bold py-3 px-5 rounded-full shadow-lg hover:bg-blue-700 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg><span>비교하기 ({comparisonScenarios.length}/2)</span></button>
                    </div>
                )}

                {/* Tabs */}
                <div className="w-full max-w-4xl mx-auto"><div className="flex mb-[-1px] z-10 relative">{tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTabId(tab.id)} className={`${tabStyles} ${activeTabId === tab.id ? activeTabStyles : inactiveTabStyles}`} aria-selected={activeTabId === tab.id}><span className="sm:hidden">{tab.title}<br />계산기</span><span className="hidden sm:inline">{tab.title} 계산기</span></button>))}</div></div>

                {/* Main Content Area */}
                <main className="w-full overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="flex" style={{ transform: transformValue, transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        {tabs.map(tab => (<div key={tab.id} className="w-full flex-shrink-0">{tab.component}</div>))}
                    </div>
                </main>
            </div>
        </div>
    );
};