// 'import'와 'export' 키워드를 모두 삭제합니다.
// [수정됨] 모든 React 훅(useState, useRef 등) 앞에 'React.'를 추가합니다.
// [수정됨] AnalysisModal, ResultCard 관련 코드 삭제

// --- From components/CustomsCalculator.tsx ---
const CustomsCalculator = ({ exchangeRate, onExchangeRateChange, onSaveCompare }) => {
      const formRef = React.useRef(null);
      // [삭제됨] Gemini 관련 state
      const [calculationMode, setCalculationMode] = React.useState('product');
      
      const [liveRates, setLiveRates] = React.useState({ krw: null, cny: null });
      const [rateStatus, setRateStatus] = React.useState('loading');
      
      const [formData, setFormData] = React.useState({
        productQuantity: '1000',
        unitPrice: '10',
        quantityPerBox: '50',
        boxQuantity: '',
        totalProductPrice: '',
        weightPerBox: '12',
        tariffRate: '8',
        shippingType: 'LCL',
        containerCost: '',
        commissionType: 'percentage',
        commissionValue: '0',
      });

      React.useEffect(() => {
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
      
        const handleInputChange = React.useCallback((e) => {
          const { name, value } = e.target;
          setFormData(prev => ({ ...prev, [name]: value }));
        }, []);

        const handleModeChange = React.useCallback((e) => {
          setCalculationMode(e.target.value);
        }, []);
      
        const handleKeyDown = React.useCallback((e) => {
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

        const results = React.useMemo(() => {
          const exchangeRateValue = parseFloat(exchangeRate) || 1;
          const tariffRateValue = parseFloat(formData.tariffRate) / 100;
          const { shippingType, containerCost, commissionType, commissionValue } = formData;
          const weightPerBox = parseFloat(formData.weightPerBox) || 0;
          
          let totalBoxes;
          let totalProductPriceUSD;
          let totalWeight;
          let productQuantity = 0;
          let costPerItem = 0;
          let commissionAmountKRW = 0;

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
              if (commissionType === 'perItem') {
                  // 박스 모드에서는 개당 수수료 0
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
        
          const commissionValueNum = parseFloat(commissionValue) || 0;
          if (commissionType === 'percentage') {
              commissionAmountKRW = totalProductPriceKRW * (commissionValueNum / 100);
          } else if (commissionType === 'perItem' && calculationMode === 'product' && productQuantity > 0) {
              commissionAmountKRW = commissionValueNum * productQuantity;
          }
          
          const taxableBase = totalProductPriceKRW + oceanFreightKRW;
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
            docsFee: DOCS_FEE,
            coFee: CO_FEE,
            commissionAmountKRW,
            totalCost,
            costPerItem,
          };
        }, [formData, calculationMode, exchangeRate]);
      
      // [삭제됨] handleSave 함수

      // --- [새로 추가됨] ---
      // ResultCard가 없어졌으므로 포맷 함수를 직접 정의합니다.
      const formatCurrency = (value, currency = 'KRW') => {
        const numericValue = typeof value === 'number' && !isNaN(value) ? value : 0;
        return new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: currency === 'USD' ? 2 : 0,
        }).format(numericValue);
      };
      
      const AnimatedNumber = ({ value, formatter }) => {
          const numericValue = typeof value === 'number' && !isNaN(value) ? value : 0;
          return <>{formatter(numericValue)}</>;
      };
      // --- [여기까지 새로 추가됨] ---


      // --- Icons ---
      const CalculatorIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 14h.01M12 11h.01M15 11h.01M9 11h.01M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>);
      const CurrencyDollarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m-3-4H9m6 0h-3m-3-4h3m0 0V6m0 0h-3" /></svg>);
      const CurrencyWonIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4 8 4-8M6 12h12m-12 3h12" /></svg>);
      const BoxIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>);
      const ScaleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l-6-2m6 2l-3 1m-3-1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>);
      const PercentageIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18m-4 4l4-4m0 0l-4-4m-4 8a2 2 0 11-4 0 2 2 0 014 0zM5 8a2 2 0 100-4 2 2 0 000 4z" /></svg>);

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
      const commissionTypeOptions = [{ label: '퍼센트(%)', value: 'percentage' }, { label: '개당(원)', value: 'perItem' }];

      return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
            {/* [삭제됨] AnalysisModal */}
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
                
                {/* --- Commission Section --- */}
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
                                    disabled={calculationMode === 'box' && option.value === 'perItem'} />
                                  <span id={`commission-label-${option.value}`} className={calculationMode === 'box' && option.value === 'perItem' ? 'opacity-50 cursor-not-allowed' : ''}>{option.label}</span>
                              </label>
                          ))}
                      </fieldset>
                      {/* Commission Value Input */}
                      <InputControl 
                        label=""
                        name="commissionValue" 
                        value={formData.commissionValue} 
                        onChange={handleInputChange} 
                        unit={formData.commissionType === 'percentage' ? '%' : '원/개'} 
                        icon={formData.commissionType === 'percentage' ? <PercentageIcon /> : <CurrencyWonIcon />} 
                        onKeyDown={handleKeyDown} 
                        placeholder="0"
                        disabled={calculationMode === 'box' && formData.commissionType === 'perItem'}
                      />
                  </div>
                   {calculationMode === 'box' && formData.commissionType === 'perItem' && (
                       <p className="text-xs text-red-600 mt-1 px-1">박스 기준 계산 시 개당 수수료는 적용되지 않습니다.</p>
                   )}
                </div>
                
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
            
            {/* --- [수정됨] Results Area --- */}
            {/* ResultCard 대신 ImportCalculator와 유사한 단일 박스 레이아웃으로 변경 */}
            {results ? (
              <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 w-full animate-fade-in-slide-up">
                  <div className="text-center mb-6">
                      <p className="text-lg text-gray-600">최종 통관 비용</p>
                      <p className="text-5xl font-extrabold text-emerald-600 tracking-tight my-2">
                         <AnimatedNumber value={results.totalCost} formatter={formatCurrency} />
                      </p>
                  </div>
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">총 상품가 (KRW)</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.totalProductPriceKRW} formatter={formatCurrency} /></span></div>
                      <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">해운비</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.oceanFreightKRW} formatter={formatCurrency} /></span></div>
                      
                      {results.commissionAmountKRW > 0 && (
                        <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">수수료</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.commissionAmountKRW} formatter={formatCurrency} /></span></div>
                      )}
                      
                      <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">관세</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.tariffAmount} formatter={formatCurrency} /></span></div>
                      <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">부가가치세</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.vatAmount} formatter={formatCurrency} /></span></div>
                      <div className="flex justify-between py-2 border-b border-slate-200"><span className="text-gray-600">기타 고정 수수료</span><span className="font-semibold text-gray-800"><AnimatedNumber value={results.docsFee + results.coFee} formatter={formatCurrency} /></span></div>
                      
                      {results.costPerItem > 0 && (
                        <div className="flex justify-between py-2 font-bold"><span className="text-gray-700">개당 최종 원가</span><span className="text-gray-900"><AnimatedNumber value={results.costPerItem} formatter={formatCurrency} /></span></div>
                      )}
                  </div>
                   {/* [삭제됨] Gemini 기능 버튼 섹션 */}
                </div>
            ) : (
              <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center justify-center text-center">
                  <svg className="w-20 h-20 text-emerald-200 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <h3 className="text-xl font-semibold text-gray-700">결과를 기다리는 중...</h3>
                  <p className="text-gray-500 mt-2">좌측에 정보를 입력하면<br /> 예상 통관 비용이 자동으로 계산됩니다.</p>
              </div>
            )}
            {/* --- [여기까지 수정됨] --- */}
          </div>
      );
};