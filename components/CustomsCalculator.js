import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    DOCS_FEE, CO_FEE, OCEAN_FREIGHT_RATE_PER_CBM, CBM_WEIGHT_DIVISOR, VAT_RATE
} from '../constants.js'; // 경로 수정 (components 폴더 밖에 있으므로)
import { InputControl } from './InputControl.js';
import { LiveRateDisplay } from './LiveRateDisplay.js';
import { ResultCard } from './ResultCard.js';
import { AnalysisModal } from './AnalysisModal.js';
import {
    CalculatorIcon, CurrencyDollarIcon, CurrencyWonIcon, BoxIcon,
    ScaleIcon, PercentageIcon, TrendingUpIcon
} from './Icons.js';

// --- From components/CustomsCalculator.tsx ---
export const CustomsCalculator = ({ exchangeRate, onExchangeRateChange, onSaveCompare }) => {
    const formRef = useRef(null);
    const [isAnalysisOpen, setAnalysisOpen] = useState(false);
    const [saveButtonText, setSaveButtonText] = useState('비교용으로 저장');
    const [isSaving, setIsSaving] = useState(false);
    const [calculationMode, setCalculationMode] = useState('product');
    
    const [liveRates, setLiveRates] = useState({ krw: null, cny: null });
    const [rateStatus, setRateStatus] = useState('loading');
    
    const [formData, setFormData] = useState({
      productQuantity: '1000',
      unitPrice: '10',
      quantityPerBox: '50',
      boxQuantity: '',
      totalProductPrice: '',
      weightPerBox: '12',
      tariffRate: '8',
      shippingType: 'LCL',
      containerCost: '',
      // --- NEW FORM STATES ---
      commissionType: 'percentage', // 'percentage' or 'perItem'
      commissionValue: '0', // Stored as string like other inputs
    });

    useEffect(() => {
      const fetchLiveRates = async () => {
          setRateStatus('loading');
          try {
              const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
              if (!response.ok) throw new Error('API response was not ok');
              const data = await response.json();
              if (data && data.rates && data.rates.KRW && data.rates.CNY) {
                  setLiveRates({ krw: data.rates.KRW, cny: data.rates.CNY });
                  setRateStatus('success');
              } else {
                  throw new Error('Invalid data format');
              }
          } catch (error) {
              console.error("Failed to fetch live rates:", error);
              setRateStatus('error');
          }
      };
      fetchLiveRates();
    }, []);
    
      const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
      }, []);

      const handleModeChange = useCallback((e) => {
        setCalculationMode(e.target.value);
      }, []);
    
      const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const form = formRef.current;
          if (!form) return;
      
          const focusable = Array.from(
            form.querySelectorAll('input:not([type="radio"]), select')
          );
          
          const index = focusable.indexOf(e.target);
      
          if (index > -1 && index < focusable.length - 1) {
            focusable[index + 1].focus();
          } else if (index === focusable.length - 1) {
            document.activeElement?.blur();
          }
        }
      }, []);

      const results = useMemo(() => {
        const exchangeRateValue = parseFloat(exchangeRate) || 1;
        const tariffRateValue = parseFloat(formData.tariffRate) / 100;
        const { shippingType, containerCost, commissionType, commissionValue } = formData; // Added commission fields
        const weightPerBox = parseFloat(formData.weightPerBox) || 0;
        
        let totalBoxes;
        let totalProductPriceUSD;
        let totalWeight;
        let productQuantity = 0;
        let costPerItem = 0;
        let commissionAmountKRW = 0; // --- NEW ---

        if (exchangeRateValue === 0) return null;

        if (calculationMode === 'product') {
            productQuantity = parseFloat(formData.productQuantity) || 0;
            const unitPrice = parseFloat(formData.unitPrice) || 0;
            const quantityPerBox = parseFloat(formData.quantityPerBox) || 1;
            
            if (productQuantity === 0 || unitPrice === 0 || quantityPerBox === 0) return null;

            totalBoxes = Math.ceil(productQuantity / quantityPerBox);
            totalProductPriceUSD = productQuantity * unitPrice;
        } else { // box mode
            totalBoxes = parseFloat(formData.boxQuantity) || 0;
            totalProductPriceUSD = parseFloat(formData.totalProductPrice) || 0;

            if (totalBoxes === 0 || totalProductPriceUSD === 0) return null;
            // Note: Per-item commission cannot be calculated in box mode
            if (commissionType === 'perItem') {
                // Optionally, show a warning or disable per-item in box mode
                // For now, commission will be 0 in this case
            }
        }

        totalWeight = totalBoxes * weightPerBox;
        const cbm = totalWeight / CBM_WEIGHT_DIVISOR;
        
        let oceanFreightKRW;
        if (shippingType === 'FCL') {
            oceanFreightKRW = parseFloat(containerCost) || 0;
        } else { // LCL
            oceanFreightKRW = cbm * OCEAN_FREIGHT_RATE_PER_CBM;
        }

        const oceanFreightUSD = oceanFreightKRW / exchangeRateValue;
        const taxableBaseUSD = totalProductPriceUSD + oceanFreightUSD;
        const tariffAmountUSD = taxableBaseUSD * tariffRateValue;
        const vatBaseUSD = taxableBaseUSD + tariffAmountUSD;
        const vatAmountUSD = vatBaseUSD * VAT_RATE;
      
        const totalProductPriceKRW = totalProductPriceUSD * exchangeRateValue;
        const tariffAmount = tariffAmountUSD * exchangeRateValue;
        const vatAmount = vatAmountUSD * exchangeRateValue;
        const totalTaxes = tariffAmount + vatAmount;
      
        // --- Calculate Commission ---
        const commissionValueNum = parseFloat(commissionValue) || 0;
        if (commissionType === 'percentage') {
            commissionAmountKRW = totalProductPriceKRW * (commissionValueNum / 100);
        } else if (commissionType === 'perItem' && calculationMode === 'product' && productQuantity > 0) {
            commissionAmountKRW = commissionValueNum * productQuantity;
        }
        // --- End Commission Calc ---
        
        const taxableBase = totalProductPriceKRW + oceanFreightKRW;
        // --- Add commission to total cost ---
        const totalCost = DOCS_FEE + CO_FEE + oceanFreightKRW + totalTaxes + commissionAmountKRW; 
        
        if (calculationMode === 'product' && productQuantity > 0) {
            // --- Include commission in per-item cost ---
            costPerItem = (totalProductPriceKRW + totalCost) / productQuantity; 
        }
      
        return {
          totalProductPriceUSD,
          totalProductPriceKRW,
          totalBoxes,
          totalWeight,
          cbm,
          oceanFreightKRW,
          taxableBase,
          tariffAmount,
          vatAmount,
          totalTaxes,
          docsFee: DOCS_FEE,
          coFee: CO_FEE,
          commissionAmountKRW, // --- NEW ---
          totalCost,
          costPerItem,
        };
      }, [formData, calculationMode, exchangeRate]); // Added commission fields to dependency array
    
    const handleSave = () => {
        if (isSaving) return;
        // Pass results including commission to save function
        onSaveCompare('customs', { results, shippingType: formData.shippingType }); 
        setSaveButtonText('✅ 저장됨!');
        setIsSaving(true);
        setTimeout(() => {
            setSaveButtonText('비교용으로 저장');
            setIsSaving(false);
        }, 1500);
    };

    // --- Field Definitions ---
    const productModeFields = [
      { label: "상품 수량", name: "productQuantity", unit: "개", icon: <CalculatorIcon /> },
      { label: "상품 단가", name: "unitPrice", unit: "USD/개", icon: <CurrencyDollarIcon /> },
      { label: "박스당 수량", name: "quantityPerBox", unit: "개/박스", icon: <BoxIcon /> },
    ];
    const boxModeFields = [
      { label: "총 박스 수량", name: "boxQuantity", unit: "박스", icon: <BoxIcon /> },
      { label: "총 상품 금액", name: "totalProductPrice", unit: "USD", icon: <CurrencyDollarIcon /> },
    ];
    const calculationModeOptions = [{ label: '상품기준', value: 'product' }, { label: '박스기준', value: 'box' }];
    const shippingOptions = [{ label: 'LCL', value: 'LCL' }, { label: 'FCL', value: 'FCL' }];
    const tariffOptions = [{ label: '0%', value: '0' }, { label: '8%', value: '8' }];
    // --- NEW: Commission Options ---
    const commissionTypeOptions = [{ label: '퍼센트(%)', value: 'percentage' }, { label: '개당(원)', value: 'perItem' }];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
          <AnalysisModal show={isAnalysisOpen} onClose={() => setAnalysisOpen(false)} results={results} calculatorType="customs" />
          <div ref={formRef} className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
            {/* Calculation Mode & Shipping Type */}
            <div className="grid grid-cols-2 gap-x-4 mb-8">
                <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-3 text-center">계산 기준</h3>
                    <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60">
                        {calculationModeOptions.map(option => (
                        <label key={option.value} className={`relative flex-1 cursor-pointer py-2.5 px-4 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${calculationMode === option.value ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80'} transition-all duration-300 ease-in-out`}>
                            <input type="radio" name="calculationMode" value={option.value} checked={calculationMode === option.value} onChange={handleModeChange} className="sr-only" aria-labelledby={`mode-label-${option.value}`} />
                            <span id={`mode-label-${option.value}`}>{option.label}</span>
                        </label>
                        ))}
                    </fieldset>
                </div>
                <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-3 text-center">운송 형태</h3>
                    <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60">
                        {shippingOptions.map((option) => (
                        <label key={option.value} className={`relative flex-1 cursor-pointer py-2.5 px-4 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${formData.shippingType === option.value ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80' } transition-all duration-300 ease-in-out`}>
                            <input type="radio" name="shippingType" value={option.value} checked={formData.shippingType === option.value} onChange={handleInputChange} className="sr-only" aria-labelledby={`shipping-label-${option.value}`} />
                            <span id={`shipping-label-${option.value}`}>{option.label}</span>
                        </label>
                        ))}
                    </fieldset>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-slate-200 pb-4">상세 정보 입력</h2>
            
            {/* --- Input Fields --- */}
            <div className="space-y-6">
              {/* Product/Box Details */}
              {(calculationMode === 'product' ? productModeFields : boxModeFields).map(field => (
                <InputControl key={field.name} {...field} value={formData[field.name]} onChange={handleInputChange} onKeyDown={handleKeyDown} />
              ))}

              {/* Weight */}
              <InputControl label="박스당 무게" name="weightPerBox" value={formData.weightPerBox} onChange={handleInputChange} unit="kg/박스" icon={<ScaleIcon />} onKeyDown={handleKeyDown} />

              {/* Exchange Rate */}
              <div>
                  <InputControl label="고시환율" name="exchangeRate" value={exchangeRate} onChange={(e) => onExchangeRateChange(e.target.value)} unit="원-달러" icon={<TrendingUpIcon />} onKeyDown={handleKeyDown} />
                  <p className="text-xs text-gray-500 mt-1 px-1">정확한 계산을 위해 <a href="https://unipass.customs.go.kr/csp/index.do?tgMenuId=MYC_EXIM_005" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-medium">관세청 고시환율</a>을 직접 입력해주세요.</p>
              </div>
              
              {/* --- NEW: Commission Section --- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">수수료</label>
                <div className="grid grid-cols-2 gap-x-2">
                    {/* Commission Type Selection */}
                    <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60 h-full">
                        {commissionTypeOptions.map((option) => (
                            <label key={option.value} className={`relative flex-1 cursor-pointer py-2.5 px-3 text-center text-xs sm:text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${
                                formData.commissionType === option.value ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80'
                            } transition-all duration-300 ease-in-out`}>
                                <input type="radio" name="commissionType" value={option.value} checked={formData.commissionType === option.value} onChange={handleInputChange} className="sr-only" aria-labelledby={`commission-label-${option.value}`} 
                                  // Disable 'perItem' if in 'box' calculation mode
                                  disabled={calculationMode === 'box' && option.value === 'perItem'} />
                                <span id={`commission-label-${option.value}`} className={calculationMode === 'box' && option.value === 'perItem' ? 'opacity-50 cursor-not-allowed' : ''}>{option.label}</span>
                            </label>
                        ))}
                    </fieldset>
                    {/* Commission Value Input */}
                    <InputControl 
                      label="" // No label needed here as it's part of the section
                      name="commissionValue" 
                      value={formData.commissionValue} 
                      onChange={handleInputChange} 
                      unit={formData.commissionType === 'percentage' ? '%' : '원/개'} 
                      icon={formData.commissionType === 'percentage' ? <PercentageIcon /> : <CurrencyWonIcon />} 
                      onKeyDown={handleKeyDown} 
                      placeholder="0"
                      // Disable if 'perItem' is selected in 'box' mode
                      disabled={calculationMode === 'box' && formData.commissionType === 'perItem'}
                    />
                </div>
                 {/* Warning for 'perItem' in 'box' mode */}
                 {calculationMode === 'box' && formData.commissionType === 'perItem' && (
                     <p className="text-xs text-red-600 mt-1 px-1">박스 기준 계산 시 개당 수수료는 적용되지 않습니다.</p>
                 )}
              </div>
              {/* --- END NEW --- */}
              
              {/* Tariff */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">관세</label>
                <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60">
                  {tariffOptions.map((option) => (
                    <label key={option.value} className={`relative flex-1 cursor-pointer py-2.5 px-4 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${formData.tariffRate === option.value ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80'} transition-all duration-300 ease-in-out`}>
                      <input type="radio" name="tariffRate" value={option.value} checked={formData.tariffRate === option.value} onChange={handleInputChange} className="sr-only" aria-labelledby={`tariff-label-${option.value}`} />
                      <span id={`tariff-label-${option.value}`}>{option.label}</span>
                    </label>
                  ))}
                </fieldset>
              </div>

              {/* Live Rates */}
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">현재 환율 (참고용)</label>
                  <LiveRateDisplay rates={liveRates} status={rateStatus} />
              </div>

              {/* Container Cost (Conditional) */}
              <div className={`grid transition-all duration-300 ease-in-out ${formData.shippingType === 'FCL' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <InputControl label="컨테이너 비용" name="containerCost" value={formData.containerCost} onChange={handleInputChange} unit="원" icon={<CurrencyWonIcon />} onKeyDown={handleKeyDown} />
                </div>
              </div>
              
            </div> 
          </div>
          
          {/* Results Area */}
          {results ? (
            <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 w-full animate-fade-in-slide-up">
                  <ResultCard results={results} />
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
                <p className="text-gray-500 mt-2">좌측에 정보를 입력하면<br /> 예상 통관 비용이 자동으로 계산됩니다.</p>
            </div>
          )}
        </div>
    );
};