import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ComparisonModal } from './components/ComparisonModal.js';
import { ImportCalculator } from './calculators/ImportCalculator.js';
import { CustomsCalculator } from './calculators/CustomsCalculator.js';
import { ShippingCalculator } from './calculators/ShippingCalculator.js';

// --- From App.tsx ---
export const App = () => {
    const [activeTabId, setActiveTabId] = useState('import');
     const [exchangeRate, setExchangeRate] = useState(() => localStorage.getItem('exchangeRate') || '1350');
    const [comparisonScenarios, setComparisonScenarios] = useState([]);
    const [isComparisonOpen, setComparisonOpen] = useState(false);

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
    ], [exchangeRate, comparisonScenarios]);

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
            <ComparisonModal show={isComparisonOpen} onClose={() => setComparisonOpen(false)} onClear={handleClearCompare} scenarios={comparisonScenarios} />
            <div className="w-full max-w-6xl mx-auto flex flex-col h-full">
                {/* Header */}
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 pb-2">비용 계산기</h1>
                    <p className="mt-2 text-lg text-slate-600">수입에 필요한 비용을 간편하게 계산해보세요.</p>
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