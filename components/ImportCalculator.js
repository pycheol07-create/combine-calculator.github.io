import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
// 1. constants.js에서 상수를 직접 가져오던 import 구문을 제거합니다.
// import { COMMISSION_RATE_HIGH, ... } from '../constants.js';
import { useSettings } from '../context/SettingsContext.js'; // 2. useSettings 훅을 import
import { InputControl } from './InputControl.js';
import { LiveRateDisplay } from './LiveRateDisplay.js';
import { AnalysisModal } from './AnalysisModal.js';
import { CurrencyYenIcon, TrendingUpIcon } from './Icons.js';

export const ImportCalculator = ({ exchangeRate, onExchangeRateChange, onSaveCompare }) => {
    const formRef = useRef(null);
    const [isAnalysisOpen, setAnalysisOpen] = useState(false);
    const [saveButtonText, setSaveButtonText] = useState('비교용으로 저장');
    const [isSaving, setIsSaving] = useState(false);
    
    const [cnyToUsdRate, setCnyToUsdRate] = useState(null);
    const [liveRates, setLiveRates] = useState({ krw: null, cny: null });
    const [rateStatus, setRateStatus] = useState('loading');

    const { settings } = useSettings(); // 3. 설정 보관함에서 현재 settings 값을 가져옵니다.

    const [formData, setFormData] = useState({
        productCost: '10',
        // 4. 기본값을 settings에서 가져온 옵션 중 첫 번째 값으로 설정
        commissionRate: settings.commissionRateOptions[0]?.value || '0',
        customsFeeRate: settings.customsFeeRateOptions[0]?.value || '0',
        packagingBag: settings.packagingBagOptions[0]?.value || '0',
        label: settings.labelOptions[0]?.value || '0',
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
        // 5. 계산에 필요한 값들을 formData에서 parseFloat으로 변환하여 사용
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
    // 6. 의존성 배열에 settings가 아닌 formData를 사용 (settings 값은 formData의 기본값에만 영향)
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

    const formatKRW = (value) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value || 0);
    const formatUSD = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
    const formatCNY = (value) => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)} ¥`;
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

    // 7. 하드코딩했던 options 객체 정의를 제거합니다.
    // const options = { ... }; // <-- 이 부분을 삭제

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
            <AnalysisModal show={isAnalysisOpen} onClose={() => setAnalysisOpen(false)} results={results} calculatorType="import" />
            <div ref={formRef} className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-slate-200 pb-4">정보 입력</h2>
                <div className="space-y-6">
                    <InputControl label="상품원가" name="productCost" value={formData.productCost} onChange={handleInputChange} unit="위안화" icon={<CurrencyYenIcon />} onKeyDown={handleKeyDown} />
                    
                    {/* 8. ToggleFieldset의 options prop에 settings의 값을 직접 전달 */}
                    <ToggleFieldset 
                        label="수수료" 
                        name="commissionRate" 
                        value={formData.commissionRate} 
                        options={settings.commissionRateOptions} 
                        onChange={handleInputChange} 
                    />
                    <ToggleFieldset 
                        label="통관비" 
                        name="customsFeeRate" 
                        value={formData.customsFeeRate} 
                        options={settings.customsFeeRateOptions} 
                        onChange={handleInputChange} 
                    />
                    <ToggleFieldset 
                        label="포장봉투" 
                        name="packagingBag" 
                        value={formData.packagingBag} 
                        options={settings.packagingBagOptions} 
                        onChange={handleInputChange} 
                    />
                    <ToggleFieldset 
                        label="라벨" 
                        name="label" 
                        value={formData.label} 
                        options={settings.labelOptions} 
                        onChange={handleInputChange} 
                    />
                    
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

            {/* ... Results Area ... */}
            {results ? (
                <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 w-full animate-fade-in-slide-up">
                    {/* ... 결과 표시 ... */}
                     <div className="mt-6 pt-6 border-t border-dashed">
                        {/* ... Gemini Buttons ... */}
                    </div>
                </div>
            ) : (
                <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center justify-center text-center">
                    {/* ... Placeholder ... */}
                </div>
            )}
        </div>
    );
};