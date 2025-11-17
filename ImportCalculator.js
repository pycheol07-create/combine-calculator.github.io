const ImportCalculator = ({ exchangeRate, onExchangeRateChange }) => {
    const formRef = React.useRef(null);
    // [수정] SettingsContext 사용
    const { settings } = React.useContext(SettingsContext);
    
    const [cnyToUsdRate, setCnyToUsdRate] = React.useState(null);
    const [liveRates, setLiveRates] = React.useState({ krw: null, cny: null });
    const [rateStatus, setRateStatus] = React.useState('loading');

    // [수정] 초기값 설정을 위해 useEffect 사용 필요할 수도 있으나, 
    // 여기서는 settings가 로드된 상태라고 가정하고 첫번째 옵션 값들을 기본으로 사용
    // 안전하게 옵셔널 체이닝 사용
    const [formData, setFormData] = React.useState({
        productCost: '10',
        commissionRate: String(settings.import.commissionRates[0]?.value || 0.035),
        customsFeeRate: String(settings.import.customsFeeRates[0]?.value || 0.22),
        packagingBag: String(settings.import.packagingOptions[0]?.value || 0.31),
        label: String(settings.import.labelOptions[0]?.value || 0.03),
    });

    React.useEffect(() => {
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

    const handleInputChange = React.useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleKeyDown = React.useCallback((e) => {
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

    const results = React.useMemo(() => {
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
    
    const CurrencyYenIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 4h4m-5 4h5M5 8h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z" /></svg>);
    const formatKRW = (value) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value || 0);
    const formatUSD = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
    const formatCNY = (value) => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)} ¥`;
    const AnimatedNumber = ({ value, formatter }) => <>{formatter(value)}</>;

    // [수정] 동적 옵션 렌더링을 위한 헬퍼 컴포넌트
    const ToggleFieldset = ({ label, name, value, options, onChange }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2 p-1 bg-slate-200/60 rounded-lg">
                {options.map((option, idx) => (
                    <label key={idx} className={`relative flex-1 min-w-[60px] cursor-pointer py-2.5 px-3 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 ${ String(value) === String(option.value) ? 'bg-white text-emerald-600 shadow-md rounded-md' : 'text-gray-600 hover:text-emerald-600/80'} transition-all duration-300 ease-in-out`}>
                        <input type="radio" name={name} value={option.value} checked={String(value) === String(option.value)} onChange={onChange} className="sr-only" />
                        <span>{option.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
            <div ref={formRef} className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-slate-200 pb-4">정보 입력</h2>
                <div className="space-y-6">
                    <InputControl label="상품원가" name="productCost" value={formData.productCost} onChange={handleInputChange} unit="위안화" icon={<CurrencyYenIcon />} onKeyDown={handleKeyDown} />
                    
                    {/* [수정] settings에서 옵션 가져오기 */}
                    <ToggleFieldset label="수수료" name="commissionRate" value={formData.commissionRate} options={settings.import.commissionRates} onChange={handleInputChange} />
                    <ToggleFieldset label="통관비" name="customsFeeRate" value={formData.customsFeeRate} options={settings.import.customsFeeRates} onChange={handleInputChange} />
                    <ToggleFieldset label="포장봉투" name="packagingBag" value={formData.packagingBag} options={settings.import.packagingOptions} onChange={handleInputChange} />
                    <ToggleFieldset label="라벨" name="label" value={formData.label} options={settings.import.labelOptions} onChange={handleInputChange} />
                    
                    <div>
                        <InputControl label="관세청 고시환율" name="exchangeRate" value={exchangeRate} onChange={(e) => onExchangeRateChange(e.target.value)} unit="원-달러" icon={<TrendingUpIcon />} onKeyDown={handleKeyDown} />
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