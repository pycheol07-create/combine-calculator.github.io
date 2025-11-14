import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
// 1. constants.js에서 상수를 직접 가져오던 import 구문을 제거합니다.
// import { DOCS_FEE, CO_FEE, ... } from '../constants.js';
import { useSettings } from '../context/SettingsContext.js'; // 2. useSettings 훅을 import
import { InputControl } from './InputControl.js';
import { LiveRateDisplay } from './LiveRateDisplay.js';
import { ResultCard } from './ResultCard.js';
import { AnalysisModal } from './AnalysisModal.js';
import {
    CalculatorIcon, CurrencyDollarIcon, CurrencyWonIcon, BoxIcon,
    ScaleIcon, PercentageIcon, TrendingUpIcon
} from './Icons.js';

export const CustomsCalculator = ({ exchangeRate, onExchangeRateChange, onSaveCompare }) => {
    const formRef = useRef(null);
    const [isAnalysisOpen, setAnalysisOpen] = useState(false);
    const [saveButtonText, setSaveButtonText] = useState('비교용으로 저장');
    const [isSaving, setIsSaving] = useState(false);
    const [calculationMode, setCalculationMode] = useState('product');
    
    const [liveRates, setLiveRates] = useState({ krw: null, cny: null });
    const [rateStatus, setRateStatus] = useState('loading');
    
    const { settings } = useSettings(); // 3. 설정 보관함에서 현재 settings 값을 가져옵니다.

    const [formData, setFormData] = useState({
      productQuantity: '1000',
      unitPrice: '10',
      quantityPerBox: '50',
      boxQuantity: '',
      totalProductPrice: '',
      weightPerBox: '12',
      // 4. 관세율 기본값을 settings에서 가져온 옵션 중 첫 번째 값으로 설정
      tariffRate: settings.tariffOptions[0]?.value || '8', 
      shippingType: 'LCL',
      containerCost: '',
      commissionType: 'percentage',
      commissionValue: '0',
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
        // 5. 계산에 필요한 모든 상수/설정값을 settings 객체에서 가져옵니다.
        const { 
            CBM_WEIGHT_DIVISOR, 
            OCEAN_FREIGHT_RATE_PER_CBM, 
            VAT_RATE,
            DOCS_FEE,
            CO_FEE
        } = settings;

        const exchangeRateValue = parseFloat(exchangeRate) || 1;
        const tariffRateValue = parseFloat(formData.tariffRate) / 100;
        const { shippingType, containerCost, commissionType, commissionValue } = formData;
        const weightPerBox = parseFloat(formData.weightPerBox) || 0;
        
        let totalBoxes, totalProductPriceUSD, totalWeight, productQuantity = 0, costPerItem = 0, commissionAmountKRW = 0;

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
            if (commissionType === 'perItem') { /* (경고 로직은 생략) */ }
        }

        totalWeight = totalBoxes * weightPerBox;
        const cbm = totalWeight / CBM_WEIGHT_DIVISOR; // settings.CBM_WEIGHT_DIVISOR 사용
        
        let oceanFreightKRW;
        if (shippingType === 'FCL') {
            oceanFreightKRW = parseFloat(containerCost) || 0;
        } else { // LCL
            oceanFreightKRW = cbm * OCEAN_FREIGHT_RATE_PER_CBM; // settings.OCEAN_FREIGHT_RATE_PER_CBM 사용
        }

        const oceanFreightUSD = oceanFreightKRW / exchangeRateValue;
        const taxableBaseUSD = totalProductPriceUSD + oceanFreightUSD;
        const tariffAmountUSD = taxableBaseUSD * tariffRateValue;
        const vatBaseUSD = taxableBaseUSD + tariffAmountUSD;
        const vatAmountUSD = vatBaseUSD * VAT_RATE; // settings.VAT_RATE 사용
      
        const totalProductPriceKRW = totalProductPriceUSD * exchangeRateValue;
        const tariffAmount = tariffAmountUSD * exchangeRateValue;
        const vatAmount = vatAmountUSD * exchangeRateValue;
        const totalTaxes = tariffAmount + vatAmount;
      
        const commissionValueNum = parseFloat(commissionValue) || 0;
        if (commissionType === 'percentage') {
            commissionAmountKRW = totalProductPriceKRW * (commissionValueNum / 100);
        } else if (commissionType === 'perItem' && calculationMode === 'product' && productQuantity > 0) {
            commissionAmountKRW = commissionValueNum * productQuantity;
        }
        
        const taxableBase = totalProductPriceKRW + oceanFreightKRW;
        // settings.DOCS_FEE, settings.CO_FEE 사용
        const totalCost = DOCS_FEE + CO_FEE + oceanFreightKRW + totalTaxes + commissionAmountKRW; 
        
        if (calculationMode === 'product' && productQuantity > 0) {
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
          docsFee: DOCS_FEE, // 결과 표시는 settings 값으로
          coFee: CO_FEE,   // 결과 표시는 settings 값으로
          commissionAmountKRW,
          totalCost,
          costPerItem,
        };
      // 6. useMemo의 의존성 배열에 settings를 추가
      }, [formData, calculationMode, exchangeRate, settings]); 
    
    const handleSave = () => {
        if (isSaving) return;
        onSaveCompare('customs', { results, shippingType: formData.shippingType }); 
        setSaveButtonText('✅ 저장됨!');
        setIsSaving(true);
        setTimeout(() => {
            setSaveButtonText('비교용으로 저장');
            setIsSaving(false);
        }, 1500);
    };

    // 7. 하드코딩했던 옵션 배열들을 제거합니다.
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
    // const tariffOptions = [...]; // <-- 이 줄을 삭제
    const commissionTypeOptions = [{ label: '퍼센트(%)', value: 'percentage' }, { label: '개당(원)', value: 'perItem' }];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
          <AnalysisModal show={isAnalysisOpen} onClose={() => setAnalysisOpen(false)} results={results} calculatorType="customs" />
          <div ref={formRef} className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
            {/* (중간 폼 UI 부분은 변경 없음) ... */}
            
            {/* ... Calculation Mode ... */}
            {/* ... Shipping Type ... */}

            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-slate-200 pb-4">상세 정보 입력</h2>
            
            <div className="space-y-6">
              {/* ... Product/Box Fields ... */}
              {/* ... Weight ... */}
              {/* ... Exchange Rate ... */}
              {/* ... Commission Section ... */}
              
              {/* Tariff */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">관세</label>
                <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60">
                  {/* 8. settings.tariffOptions를 사용하도록 수정 */}
                  {settings.tariffOptions.map((option) => (
                    <label key={option.value} className={`relative flex-1 cursor-pointer py-2.5 px-4 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${formData.tariffRate === option.value ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80'} transition-all duration-300 ease-in-out`}>
                      <input type="radio" name="tariffRate" value={option.value} checked={formData.tariffRate === option.value} onChange={handleInputChange} className="sr-only" aria-labelledby={`tariff-label-${option.value}`} />
                      <span id={`tariff-label-${option.value}`}>{option.label}</span>
                    </label>
                  ))}
                </fieldset>
              </div>

              {/* ... Live Rates ... */}
              {/* ... Container Cost ... */}
              
            </div> 
          </div>
          
          {/* ... Results Area ... */}
          {results ? (
            <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 w-full animate-fade-in-slide-up">
                  <ResultCard results={results} />
                  {/* ... Gemini Buttons ... */}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center justify-center text-center">
                {/* ... Placeholder ... */}
            </div>
          )}
        </div>
    );
};