import React from 'react';
import PieChart from './PieChart'; // PieChart 컴포넌트 import

const AnalysisModal = ({ show, onClose, results, calculatorType }) => {
    if (!show) return null;

    const formatCurrency = (value) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value || 0);
    
    let chartData = [];
    let title = '';

    if (calculatorType === 'import') {
        title = '수입가 상세 분석';
        chartData = [
            { label: '상품 원가 (환산액)', value: results.totalCostKRW, color: '#34d399' },
            { label: '통관비', value: results.customsFeeKRW, color: '#fbbf24' },
        ];
    } else if (calculatorType === 'customs') {
        title = '통관비 상세 분석';
        chartData = [
            { label: '총 상품가', value: results.totalProductPriceKRW, color: '#34d399' },
            { label: '해운비', value: results.oceanFreightKRW, color: '#60a5fa' },
            { label: '수수료', value: results.commissionAmountKRW, color: '#c084fc' },
            { label: '관세', value: results.tariffAmount, color: '#fbbf24' },
            { label: '부가가치세', value: results.vatAmount, color: '#f87171' },
            { label: '기타 고정 수수료', value: results.docsFee + results.coFee, color: '#a78bfa' },
        ];
        chartData = chartData.filter(item => item.value > 0);
    }

    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-fade-in-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <PieChart data={chartData} />
                <div className="mt-6 pt-4 border-t">
                    <ul className="space-y-2">
                        {chartData.map(item => (
                             <li key={item.label} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{item.label}</span>
                                <span className="font-semibold text-gray-800">{formatCurrency(item.value)}</span>
                            </li>
                        ))}
                        <li className="flex justify-between items-center font-bold text-base pt-2 border-t mt-2">
                            <span>총합계</span>
                            <span>{formatCurrency(total)}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AnalysisModal;