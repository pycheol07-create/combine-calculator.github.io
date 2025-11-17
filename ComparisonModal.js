// 'import React'와 'export' 키워드를 모두 삭제합니다.

// --- Gemini Feature: Comparison Modal ---
const ComparisonModal = ({ show, onClose, onClear, scenarios }) => {
    if (!show) return null;

    const formatCurrency = (value, currency = 'KRW') => {
         return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
    };

    const renderScenario = (scenario, index) => {
        const title = `시나리오 ${index + 1}`;
        if (!scenario) return <div className="p-4 border rounded-lg bg-gray-50"><h4 className="font-bold text-center text-gray-500 mb-2">{title}</h4><div className="text-center text-gray-400 mt-8">비교할<br/>항목 없음</div></div>;
        
        if (scenario.type === 'import') {
            return (
                <div className="p-4 border rounded-lg bg-white">
                    <h4 className="font-bold text-center text-gray-700 mb-2">{title}: <span className="text-emerald-600">수입가 계산</span></h4>
                    <ul className="space-y-1 text-sm">
                        <li className="flex justify-between"><span>상품 원가(CNY):</span><span className="font-mono">{scenario.data.results.baseCostCNY.toFixed(2)} ¥</span></li>
                        <li className="flex justify-between"><span>수수료(CNY):</span><span className="font-mono">{scenario.data.results.commissionCNY.toFixed(2)} ¥</span></li>
                        <li className="flex justify-between"><span>통관비(KRW):</span><span className="font-mono">{formatCurrency(scenario.data.results.customsFeeKRW)}</span></li>
                        <li className="flex justify-between font-bold text-base mt-2 pt-2 border-t"><span>최종 수입가:</span><span>{formatCurrency(scenario.data.results.finalImportCost)}</span></li>
                    </ul>
                </div>
            );
        }
        if (scenario.type === 'customs') {
             return (
                <div className="p-4 border rounded-lg bg-white">
                    <h4 className="font-bold text-center text-gray-700 mb-2">{title}: <span className="text-emerald-600">통관비 계산 ({scenario.data.shippingType})</span></h4>
                    <ul className="space-y-1 text-sm">
                        <li className="flex justify-between"><span>총 상품가:</span><span className="font-mono">{formatCurrency(scenario.data.results.totalProductPriceKRW)}</span></li>
                        <li className="flex justify-between"><span>해운비:</span><span className="font-mono">{formatCurrency(scenario.data.results.oceanFreightKRW)}</span></li>
                        {/* Added Commission to comparison if available */}
                        {scenario.data.results.commissionAmountKRW > 0 && (
                          <li className="flex justify-between"><span>수수료:</span><span className="font-mono">{formatCurrency(scenario.data.results.commissionAmountKRW)}</span></li>
                        )}
                        <li className="flex justify-between"><span>총 세금:</span><span className="font-mono">{formatCurrency(scenario.data.results.totalTaxes)}</span></li>
                        <li className="flex justify-between font-bold text-base mt-2 pt-2 border-t"><span>최종 통관비:</span><span>{formatCurrency(scenario.data.results.totalCost)}</span></li>
                    </ul>
                </div>
            );
        }
        return null;
    }

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 animate-fade-in-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-xl font-bold text-gray-800">시나리오 비교</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderScenario(scenarios[0], 0)}
                    {renderScenario(scenarios[1], 1)}
                </div>

                <div className="mt-6">
                    {scenarios.length === 2 && (() => {
                        const getCost = (scenario) => scenario.type === 'import' 
                            ? scenario.data.results.finalImportCost 
                            : scenario.data.results.totalCost;

                        const cost1 = getCost(scenarios[0]);
                        const cost2 = getCost(scenarios[1]);

                        if (cost1 === cost2) {
                            return <p className="text-center text-gray-700 font-semibold p-4 bg-gray-100 rounded-lg">두 시나리오의 비용이 동일합니다.</p>;
                        }

                        const cheaperIndex = cost1 < cost2 ? 0 : 1;
                        const difference = Math.abs(cost1 - cost2);
                        
                        const getScenarioName = (scenario) => {
                            if (scenario.type === 'customs' && scenario.data.shippingType) {
                                return `(${scenario.data.shippingType})`;
                            }
                            return '';
                        }

                        return (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                                <p className="text-emerald-800 font-semibold">
                                    <span className="font-bold text-blue-600">시나리오 {cheaperIndex + 1}번{getScenarioName(scenarios[cheaperIndex])}</span>이(가) 
                                    <span className="text-emerald-600 font-bold"> {formatCurrency(difference)} </span> 
                                    더 저렴하여 이익입니다.
                                </p>
                            </div>
                        );
                    })()}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClear} className="px-4 py-2 text-sm font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200">비교 지우기</button>
                </div>
            </div>
        </div>
    )
};