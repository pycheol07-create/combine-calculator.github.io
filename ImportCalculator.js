import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { InputControl } from './InputControl.js';
import { LiveRateDisplay } from './LiveRateDisplay.js';
import { AnalysisModal } from './AnalysisModal.js';
import { TrendingUpIcon } from './Icons.js';
import {
    COMMISSION_RATE_HIGH,
    COMMISSION_RATE_LOW,
    CUSTOMS_FEE_RATE_LOW,
    CUSTOMS_FEE_RATE_HIGH,
    PACKAGING_BAG_DEFAULT,
    PACKAGING_BAG_OUTER,
    PACKAGING_BAG_NONE,
    LABEL_DEFAULT,
    LABEL_NONE
} from './constants.js';

// --- From components/ImportCalculator.tsx ---
export const ImportCalculator = ({ exchangeRate, onExchangeRateChange, onSaveCompare }) => {
    const formRef = useRef(null);
    const [isAnalysisOpen, setAnalysisOpen] = useState(false);
    const [saveButtonText, setSaveButtonText] = useState('비교용으로 저장');
    const [isSaving, setIsSaving] = useState(false);
    
    const [cnyToUsdRate, setCnyToUsdRate] = useState(null);
    const [liveRates, setLiveRates] = useState({ krw: null, cny: null });
    const [rateStatus, setRateStatus] = useState('loading');

    const [formData, setFormData] = useState({
        productCost: '10',
        commissionRate: String(COMMISSION_RATE_HIGH),
        customsFeeRate: String(CUSTOMS_FEE_RATE_LOW),
        packagingBag: String(PACKAGING_BAG_DEFAULT),
        label: String(LABEL_DEFAULT),
    });

    useEffect(() => {
        const fetchRates = async () => {
            setRateStatus('loading');
            try {
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                if (data && data.rates && data.rates.KRW && data.rates.CNY) {
                    setLiveRates({ krw: data.rates.KRW, cny: data.rates.CNY });
                    setCnyToUsdRate(1 / data.rates.CNY);
                    setRateStatus('success');
                } else {
                    throw new Error('Invalid API response format');
                }
            } catch (error) {
                console.error("Failed to fetch exchange rates:", error);
                setRateStatus('error');
            }
        };
        fetchRates();
    }, []);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const form = formRef.current;
          if (!form) return;
          const focusable = Array.from(form.querySelectorAll('input:not([type="radio"]), select'));
          const index = focusable.indexOf(e.target);
          if (index > -1 && index < focusable.length - 1) {
            focusable[index + 1].focus();
          } else if (index === focusable.length - 1) {
            document.activeElement?.blur();
          }
        }
    }, []);

    const results = useMemo(() => {
        const productCost = parseFloat(formData.productCost) || 0;
        const packagingCost = parseFloat(formData.packagingBag) || 0;
        const labelCost = parseFloat(formData.label) || 0;
        const commissionRate = parseFloat(formData.commissionRate) || 0;
        const customsFeeRate = parseFloat(formData.customsFeeRate) || 0;
        const exchangeRateValue = parseFloat(exchangeRate) || 0;

        if (productCost === 0 || !cnyToUsdRate || exchangeRateValue === 0) return null;

        const baseCostCNY = productCost + packagingCost + labelCost;
        const commissionCNY = baseCostCNY * commissionRate;
        const totalCostCNY = baseCostCNY + commissionCNY;

        const totalCostUSD = totalCostCNY * cnyToUsdRate;
        const totalCostKRW = totalCostUSD * exchangeRateValue;
        
        const customsFeeKRW = totalCostKRW * customsFeeRate;
        const finalImportCost = totalCostKRW + customsFeeKRW;

        return { baseCostCNY, commissionCNY, totalCostCNY, totalCostUSD, totalCostKRW, customsFeeKRW, finalImportCost };
    }, [formData, cnyToUsdRate, exchangeRate]);
    
    const handleSave = () => {
        if (isSaving) return;
        onSaveCompare('import', { results });
        setSaveButtonText('✅ 저장됨!');
        setIsSaving(true);
        setTimeout(() => {
            setSaveButtonText('비교용으로 저장');
            setIsSaving(false);
        }, 1500);
    };

    const CurrencyYenIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 4h4m-5 4h5M5 8h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z" /></svg>);

    const formatKRW = (value) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value || 0); // Added fallback
    const formatUSD = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0); // Added fallback
    const formatCNY = (value) => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)} ¥`; // Added fallback
    const AnimatedNumber = ({ value, formatter }) => <>{formatter(value)}</>;

    const ToggleFieldset = ({ label, name, value, options, onChange }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60">
                {options.map((option) => (
                    <label key={option.value} className={`relative flex-1 cursor-pointer py-2.5 px-3 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${ value === option.value ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80'} transition-all duration-300 ease-in-out`}>
                        <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={onChange} className="sr-only" aria-labelledby={`${name}-label-${option.value}`} />
                        <span id={`${name}-label-${option.value}`}>{option.label}</span>
                    </label>
                ))}
            </fieldset>
        </div>
    );

    const options = {
        commissionRate: [{ label: '3.5%', value: String(COMMISSION_RATE_HIGH) }, { label: '0%', value: String(COMMISSION_RATE_LOW) }],
        customsFeeRate: [{ label: '22%', value: String(CUSTOMS_FEE_RATE_LOW) }, { label: '29%', value: String(CUSTOMS_FEE_RATE_HIGH) }],
        packagingBag: [{ label: '4호-기본', value: String(PACKAGING_BAG_DEFAULT) }, { label: '아우터', value: String(PACKAGING_BAG_OUTER) }, { label: '없음', value: String(PACKAGING_BAG_NONE) }],
        label: [{ label: '일반라벨', value: String(LABEL_DEFAULT) }, { label: '없음', value: String(LABEL_NONE) }],
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
            <AnalysisModal show={isAnalysisOpen} onClose={() => setAnalysisOpen(false)} results={results} calculatorType="import" />
            <div ref={formRef} className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-slate-200 pb-4">정보 입력</h2>
                <div className="space-y-6">
                    <InputControl label="상품원가" name="productCost" value={formData.productCost} onChange={handleInputChange} unit="위안화" icon={<CurrencyYenIcon />} onKeyDown={handleKeyDown} />
                    <ToggleFieldset label="수수료" name="commissionRate" value={formData.commissionRate} options={options.commissionRate} onChange={handleInputChange} />
                    <ToggleFieldset label="통관비" name="customsFeeRate" value={formData.customsFeeRate} options={options.customsFeeRate} onChange={handleInputChange} />
                    <ToggleFieldset label="포장봉투" name="packagingBag" value={formData.packagingBag} options={options.packagingBag} onChange={handleInputChange} />
                    <ToggleFieldset label="라벨" name="label" value={formData.label} options={options.label} onChange={handleInputChange} />
                    
                    <div>
                        <InputControl label="관세청 고시환율" name="exchangeRate" value={exchangeRate} onChange={(e) => onExchangeRateChange(e.target.value)} unit="원-달러" icon={<TrendingUpIcon />} onKeyDown={handleKeyDown} />
                        <p className="text-xs text-gray-500 mt-1 px-1">정확한 계산을 위해 <a href="https://unipass.customs.go.kr/csp/index.do?tgMenuId=MYC_EXIM_005" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-medium">관세청 고시환율</a>을 직접 입력해주세요.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">현재 환율 (참고용)</label>
                        <LiveRateDisplay rates={liveRates} status={rateStatus} />
                    </div>
                </div>
            </div>

            {results ? (
                <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 w-full animate-fade-in-slide-up">
                    <div className="text-center mb-6">
                        <p className="text-lg text-gray-600">예상 수입가</p>
                        <p className="text-5xl font-extrabold text-emerald-600 tracking-tight my-2">
                           <AnimatedNumber value={results.finalImportCost} formatter={formatKRW} />
                        </p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">상품원가 + 부자재 (CNY)</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.baseCostCNY} formatter={formatCNY} /></span></div>
                        <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">수수료 (CNY)</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.commissionCNY} formatter={formatCNY} /></span></div>
                        <div className="flex justify-between py-2 border-b border-slate-200 font-bold"><span className="text-gray-700">총 비용 (CNY)</span><span className="text-gray-900"><AnimatedNumber value={results.totalCostCNY} formatter={formatCNY} /></span></div>
                        <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">총 비용 (USD)</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.totalCostUSD} formatter={formatUSD} /></span></div>
                        <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">원화 환산 금액</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.totalCostKRW} formatter={formatKRW} /></span></div>
                        <div className="flex justify-between py-2"><span className="text-gray-600">통관비</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.customsFeeKRW} formatter={formatKRW} /></span></div>
                    </div>
                     <div className="mt-6 pt-6 border-t border-dashed">
                        <h3 className="text-sm font-bold text-center text-emerald-700 mb-3">✨ Gemini 기능</h3>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => setAnalysisOpen(true)} className="flex-1 px-4 py-2 text-sm font-semibold bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200">상세 분석 보기</button>
                            <button onClick={handleSave} disabled={isSaving} className="flex-1 px-4 py-2 text-sm font-semibold bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">{saveButtonText}</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center justify-center text-center">
                    <svg className="w-20 h-20 text-emerald-200 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <h3 className="text-xl font-semibold text-gray-700">결과를 기다리는 중...</h3>
                    <p className="text-gray-500 mt-2">좌측에 정보를 입력하면<br /> 예상 수입가가 자동으로 계산됩니다.</p>
                </div>
            )}
        </div>
    );
};