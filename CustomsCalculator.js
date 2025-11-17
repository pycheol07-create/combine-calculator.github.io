const CustomsCalculator = ({ exchangeRate, onExchangeRateChange }) => {
      const formRef = React.useRef(null);
      // [수정] SettingsContext 사용
      const { settings } = React.useContext(SettingsContext);

      const [calculationMode, setCalculationMode] = React.useState('product');
      const [liveRates, setLiveRates] = React.useState({ krw: null, cny: null });
      const [rateStatus, setRateStatus] = React.useState('loading');
      const [isTaxesExpanded, setIsTaxesExpanded] = React.useState(false);
      const [isFeesExpanded, setIsFeesExpanded] = React.useState(false);
      
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

      // ... (useEffect, Event Handlers 동일) ...
      React.useEffect(() => {
        const fetchLiveRates = async () => { /* 동일 */ };
        fetchLiveRates();
      }, []);
      
      const handleInputChange = React.useCallback((e) => {
          const { name, value } = e.target;
          setFormData(prev => ({ ...prev, [name]: value }));
      }, []);
      const handleModeChange = React.useCallback((e) => { setCalculationMode(e.target.value); }, []);
      const handleKeyDown = React.useCallback((e) => { /* 동일 */ }, []);

      const results = React.useMemo(() => {
          // [수정] 상수 대신 settings.common 값 사용
          const DOCS_FEE = settings.common.docsFee;
          const CO_FEE = settings.common.coFee;
          const OCEAN_FREIGHT_RATE_PER_CBM = settings.common.oceanFreightPerCbm;
          const CBM_WEIGHT_DIVISOR = settings.common.cbmWeightDivisor;
          const VAT_RATE = settings.common.vatRate;

          const exchangeRateValue = parseFloat(exchangeRate) || 1;
          const tariffRateValue = parseFloat(formData.tariffRate) / 100;
          const { shippingType, containerCost, commissionType, commissionValue } = formData;
          const weightPerBox = parseFloat(formData.weightPerBox) || 0;
          
          // ... (계산 로직 동일) ...
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
          } else { 
              totalBoxes = parseFloat(formData.boxQuantity) || 0;
              totalProductPriceUSD = parseFloat(formData.totalProductPrice) || 0;
              if (totalBoxes === 0 || totalProductPriceUSD === 0) return null;
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
            totalProductPriceUSD, totalProductPriceKRW, totalBoxes, totalWeight, cbm, oceanFreightKRW,
            taxableBase, tariffAmount, vatAmount, totalTaxes,
            docsFee: DOCS_FEE, coFee: CO_FEE, commissionAmountKRW, totalCost, costPerItem,
          };
      }, [formData, calculationMode, exchangeRate, settings]); // [수정] settings 의존성 추가

      // ... (Helper functions & Icons 동일) ...
      const formatCurrency = (v, c='KRW') => new Intl.NumberFormat('ko-KR', {style:'currency', currency:c, minimumFractionDigits: c==='USD'?2:0}).format(typeof v==='number'&&!isNaN(v)?v:0);
      const formatNumber = (v, u='', d=2) => `${new Intl.NumberFormat('ko-KR', {maximumFractionDigits:d}).format(typeof v==='number'&&!isNaN(v)?v:0)} ${u}`;
      const AnimatedNumber = ({value, formatter}) => <>{formatter(typeof value==='number'&&!isNaN(value)?value:0)}</>;
      const ResultItem = ({ label, value, icon, isSub }) => (
        <div className={`flex items-center justify-between py-3 ${isSub ? 'pl-10' : ''}`}>
          <div className="flex items-center min-w-0"><div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isSub ? 'bg-slate-100' : 'bg-emerald-100'}`}>{icon}</div><span className={`ml-4 font-medium truncate ${isSub ? 'text-sm text-gray-600' : 'text-gray-800'}`}>{label}</span></div>
          <span className={`font-semibold text-right whitespace-nowrap ${isSub ? 'text-sm text-gray-700' : 'text-gray-900'}`}>{value}</span>
        </div>
      );
      const Icons = {
          Price: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
          Shipping: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 16h2a2 2 0 002-2V6a2 2 0 00-2-2h-1" /></svg>,
          Tax: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 14l-6-6m5.5.5h.01M4.99 9h.01" /></svg>,
          Fee: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
          Tariff: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7.014A8.003 8.003 0 0117.657 18.657z" /></svg>,
          Vat: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
          DocsFee: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
          CoFee: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 4h3m-3 4h3" /></svg>,
          ChevronDown: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
          PriceTag: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 8V3z" /></svg>,
          Receipt: <ReceiptIcon />,
      };
      
      const CalculatorIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 14h.01M12 11h.01M15 11h.01M9 11h.01M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>);
      const CurrencyDollarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m-3-4H9m6 0h-3m-3-4h3m0 0V6m0 0h-3" /></svg>);
      const CurrencyWonIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4 8 4-8M6 12h12m-12 3h12" /></svg>);
      const BoxIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>);
      const ScaleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l-6-2m6 2l-3 1m-3-1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>);
      const PercentageIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18m-4 4l4-4m0 0l-4-4m-4 8a2 2 0 11-4 0 2 2 0 014 0zM5 8a2 2 0 100-4 2 2 0 000 4z" /></svg>);

      const productModeFields = [
        { label: "상품 수량", name: "productQuantity", unit: "개", icon: <CalculatorIcon /> },
        { label: "상품 단가", name: "unitPrice", unit: "USD/개", icon: <CurrencyDollarIcon /> },
        { label: "박스당 수량", name: "quantityPerBox", unit: "개/박스", icon: <BoxIcon /> },
      ];
      const boxModeFields = [
        { label: "총 박스 수량", name: "boxQuantity", unit: "박스", icon: <BoxIcon /> },
        { label: "총 상품 금액", name: "totalProductPrice", unit: "USD", icon: <CurrencyDollarIcon /> },
      ];
      
      // [수정] 옵션값들을 settings에서 가져옴
      const calculationModeOptions = [{ label: '상품기준', value: 'product' }, { label: '박스기준', value: 'box' }];
      const shippingOptions = settings.customs.shippingTypes;
      const tariffOptions = settings.customs.tariffRates;
      const commissionTypeOptions = settings.customs.commissionTypes;

      return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
            <div ref={formRef} className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
              {/* ... (모드 선택 및 운송 형태 UI) */}
              <div className="grid grid-cols-2 gap-x-4 mb-8">
                  <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-3 text-center">계산 기준</h3>
                      <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60">
                          {calculationModeOptions.map(option => (
                          <label key={option.value} className={`relative flex-1 cursor-pointer py-2.5 px-4 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${calculationMode === option.value ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80'} transition-all duration-300 ease-in-out`}>
                              <input type="radio" name="calculationMode" value={option.value} checked={calculationMode === option.value} onChange={handleModeChange} className="sr-only" />
                              <span>{option.label}</span>
                          </label>
                          ))}
                      </fieldset>
                  </div>
                  <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-3 text-center">운송 형태</h3>
                      <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60">
                          {shippingOptions.map((option, idx) => (
                          <label key={idx} className={`relative flex-1 cursor-pointer py-2.5 px-4 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${formData.shippingType === option.value ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80' } transition-all duration-300 ease-in-out`}>
                              <input type="radio" name="shippingType" value={option.value} checked={formData.shippingType === option.value} onChange={handleInputChange} className="sr-only" />
                              <span>{option.label}</span>
                          </label>
                          ))}
                      </fieldset>
                  </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-slate-200 pb-4">상세 정보 입력</h2>
              
              <div className="space-y-6">
                {(calculationMode === 'product' ? productModeFields : boxModeFields).map(field => (
                  <InputControl key={field.name} {...field} value={formData[field.name]} onChange={handleInputChange} onKeyDown={handleKeyDown} />
                ))}
                <InputControl label="박스당 무게" name="weightPerBox" value={formData.weightPerBox} onChange={handleInputChange} unit="kg/박스" icon={<ScaleIcon />} onKeyDown={handleKeyDown} />
                <div>
                    <InputControl label="고시환율" name="exchangeRate" value={exchangeRate} onChange={(e) => onExchangeRateChange(e.target.value)} unit="원-달러" icon={<TrendingUpIcon />} onKeyDown={handleKeyDown} />
                </div>
                
                {/* 수수료 섹션 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수수료</label>
                  <div className="grid grid-cols-2 gap-x-2">
                      <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60 h-full">
                          {commissionTypeOptions.map((option, idx) => (
                              <label key={idx} className={`relative flex-1 cursor-pointer py-2.5 px-3 text-center text-xs sm:text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${
                                  formData.commissionType === option.value ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80'
                              } transition-all duration-300 ease-in-out`}>
                                  <input type="radio" name="commissionType" value={option.value} checked={formData.commissionType === option.value} onChange={handleInputChange} className="sr-only" 
                                    disabled={calculationMode === 'box' && option.value === 'perItem'} />
                                  <span className={calculationMode === 'box' && option.value === 'perItem' ? 'opacity-50 cursor-not-allowed' : ''}>{option.label}</span>
                              </label>
                          ))}
                      </fieldset>
                      <InputControl label="" name="commissionValue" value={formData.commissionValue} onChange={handleInputChange} unit={formData.commissionType === 'percentage' ? '%' : '원/개'} icon={formData.commissionType === 'percentage' ? <PercentageIcon /> : <CurrencyWonIcon />} onKeyDown={handleKeyDown} placeholder="0" disabled={calculationMode === 'box' && formData.commissionType === 'perItem'} />
                  </div>
                </div>
                
                {/* 관세 섹션 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">관세</label>
                  <fieldset className="flex rounded-lg shadow-sm p-1 bg-slate-200/60 overflow-x-auto">
                    {tariffOptions.map((option, idx) => (
                      <label key={idx} className={`relative flex-1 min-w-[60px] cursor-pointer py-2.5 px-4 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${String(formData.tariffRate) === String(option.value) ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80'} transition-all duration-300 ease-in-out`}>
                        <input type="radio" name="tariffRate" value={option.value} checked={String(formData.tariffRate) === String(option.value)} onChange={handleInputChange} className="sr-only" />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </fieldset>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">현재 환율 (참고용)</label>
                    <LiveRateDisplay rates={liveRates} status={rateStatus} />
                </div>
                
                <div className={`grid transition-all duration-300 ease-in-out ${formData.shippingType === 'FCL' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <InputControl label="컨테이너 비용" name="containerCost" value={formData.containerCost} onChange={handleInputChange} unit="원" icon={<CurrencyWonIcon />} onKeyDown={handleKeyDown} />
                  </div>
                </div>
              </div> 
            </div>
            
            {results ? (
              <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 w-full animate-fade-in-slide-up">
                  {/* ... (결과창 UI - 이전과 동일) ... */}
                  <div className="text-center mb-6"><p className="text-lg text-gray-600">최종 통관 비용</p><p className="text-5xl font-extrabold text-emerald-600 tracking-tight my-2"><AnimatedNumber value={results.totalCost} formatter={formatCurrency} /></p></div>
                  <div className="space-y-1 divide-y divide-slate-200">
                    <ResultItem label="총 상품가" value={<AnimatedNumber value={results.totalProductPriceKRW} formatter={formatCurrency} />} icon={Icons.Price} />
                    <ResultItem label="해운비" value={<AnimatedNumber value={results.oceanFreightKRW} formatter={formatCurrency} />} icon={Icons.Shipping} />
                    {results.commissionAmountKRW > 0 && (<ResultItem label="수수료" value={<AnimatedNumber value={results.commissionAmountKRW} formatter={formatCurrency} />} icon={Icons.Receipt} />)}
                    {results.costPerItem > 0 && (<ResultItem label="개당 최종 원가" value={<AnimatedNumber value={results.costPerItem} formatter={formatCurrency} />} icon={Icons.PriceTag} />)}
                    <div>
                        <div onClick={() => setIsTaxesExpanded(!isTaxesExpanded)} className="flex items-center justify-between py-3 cursor-pointer"><div className="flex items-center"><div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-emerald-100">{Icons.Tax}</div><span className="ml-4 font-medium text-gray-800">총 세금</span></div><div className="flex items-center"><span className="font-semibold text-gray-900"><AnimatedNumber value={results.totalTaxes} formatter={formatCurrency} /></span><span className={`ml-2 transform transition-transform duration-200 ${isTaxesExpanded ? 'rotate-180' : ''}`}>{Icons.ChevronDown}</span></div></div>
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isTaxesExpanded ? 'max-h-40' : 'max-h-0'}`}><ResultItem label="관세" value={<AnimatedNumber value={results.tariffAmount} formatter={formatCurrency} />} icon={Icons.Tariff} isSub={true} /><ResultItem label="부가가치세" value={<AnimatedNumber value={results.vatAmount} formatter={formatCurrency} />} icon={Icons.Vat} isSub={true} /></div>
                    </div>
                    <div>
                        <div onClick={() => setIsFeesExpanded(!isFeesExpanded)} className="flex items-center justify-between py-3 cursor-pointer"><div className="flex items-center"><div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-emerald-100">{Icons.Fee}</div><span className="ml-4 font-medium text-gray-800">기타 고정 수수료</span></div><div className="flex items-center"><span className="font-semibold text-gray-900"><AnimatedNumber value={results.docsFee + results.coFee} formatter={formatCurrency} /></span><span className={`ml-2 transform transition-transform duration-200 ${isFeesExpanded ? 'rotate-180' : ''}`}>{Icons.ChevronDown}</span></div></div>
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFeesExpanded ? 'max-h-40' : 'max-h-0'}`}><ResultItem label="서류비" value={<AnimatedNumber value={results.docsFee} formatter={formatCurrency} />} icon={Icons.DocsFee} isSub={true} /><ResultItem label="CO발급비" value={<AnimatedNumber value={results.coFee} formatter={formatCurrency} />} icon={Icons.CoFee} isSub={true} /></div>
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