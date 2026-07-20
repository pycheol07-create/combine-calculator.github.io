// 창고료 & 통관비 납부지연가산세 계산기
// 참조: 구글 스프레드시트 '창고료&가산세' 시트

const WarehouseFeeCalculator = () => {
    const formRef = React.useRef(null);
    const { settings } = React.useContext(SettingsContext);

    const toDateStr = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    const today = toDateStr(new Date());

    const [formData, setFormData] = React.useState(() => ({
        warehouseRate: String(settings.warehouse?.ratePerCBMPerDay ?? 1200),
        cbm: '10.23',
        arrivalDate: today,
        clearanceDate: today,
        freeDays: String(settings.warehouse?.freeDays ?? 14),

        customsFee: '',
        surchargeRate: String((settings.warehouse?.surchargeRate ?? 0.03) * 100),
        paymentDueDays: String(settings.warehouse?.paymentDueDays ?? 25),
        dailyInterestRate: String((settings.warehouse?.dailyInterestRate ?? 0.00025) * 100),
    }));

    // 설정관리에서 기본값 변경 시 폼에 반영
    React.useEffect(() => {
        setFormData(prev => ({
            ...prev,
            warehouseRate: String(settings.warehouse?.ratePerCBMPerDay ?? 1200),
            freeDays: String(settings.warehouse?.freeDays ?? 14),
            surchargeRate: String((settings.warehouse?.surchargeRate ?? 0.03) * 100),
            paymentDueDays: String(settings.warehouse?.paymentDueDays ?? 25),
            dailyInterestRate: String((settings.warehouse?.dailyInterestRate ?? 0.00025) * 100),
        }));
    }, [
        settings.warehouse?.ratePerCBMPerDay,
        settings.warehouse?.freeDays,
        settings.warehouse?.surchargeRate,
        settings.warehouse?.paymentDueDays,
        settings.warehouse?.dailyInterestRate,
    ]);

    const handleInputChange = React.useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleKeyDown = React.useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const form = formRef.current;
            if (!form) return;
            const focusable = Array.from(form.querySelectorAll('input, select'));
            const index = focusable.indexOf(e.target);
            if (index > -1 && index < focusable.length - 1) {
                focusable[index + 1].focus();
            } else if (index === focusable.length - 1) {
                document.activeElement?.blur();
            }
        }
    }, []);

    // 날짜 차이(일수) 계산
    const daysBetween = (d1Str, d2Str) => {
        if (!d1Str || !d2Str) return 0;
        const d1 = new Date(d1Str);
        const d2 = new Date(d2Str);
        if (isNaN(d1) || isNaN(d2)) return 0;
        const ms = d2.getTime() - d1.getTime();
        return Math.round(ms / (1000 * 60 * 60 * 24));
    };

    const addDays = (dateStr, days) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        d.setDate(d.getDate() + Number(days || 0));
        return toDateStr(d);
    };

    const results = React.useMemo(() => {
        const warehouseRate = parseFloat(formData.warehouseRate) || 0;
        const cbm = parseFloat(formData.cbm) || 0;
        const freeDays = parseInt(formData.freeDays, 10) || 0;
        const customsFee = parseFloat(formData.customsFee) || 0;
        const surchargeRate = (parseFloat(formData.surchargeRate) || 0) / 100;
        const paymentDueDays = parseInt(formData.paymentDueDays, 10) || 0;
        const dailyInterestRate = (parseFloat(formData.dailyInterestRate) || 0) / 100;

        const totalStayDays = daysBetween(formData.arrivalDate, formData.clearanceDate);
        const storageDays = Math.max(0, totalStayDays - freeDays);
        const warehouseFeeTotal = warehouseRate * cbm * storageDays;

        const freeUntil = addDays(formData.arrivalDate, freeDays);
        const paymentDueDate = addDays(formData.arrivalDate, paymentDueDays);
        const delayDays = Math.max(0, daysBetween(paymentDueDate, formData.clearanceDate));

        const surchargeAmount = customsFee * surchargeRate;
        const lateInterest = customsFee * delayDays * dailyInterestRate;
        const surchargeTotal = surchargeAmount + lateInterest;

        const grandTotal = warehouseFeeTotal + surchargeTotal;

        return {
            totalStayDays, storageDays, warehouseFeeTotal, freeUntil,
            paymentDueDate, delayDays, surchargeAmount, lateInterest, surchargeTotal,
            grandTotal,
        };
    }, [formData]);

    const formatKRW = (v) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(v || 0);
    const formatDays = (v) => `${new Intl.NumberFormat('ko-KR').format(v || 0)} 일`;

    const CalendarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);
    const CurrencyWonIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4 8 4-8M6 12h12m-12 3h12" /></svg>);
    const CubeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>);
    const PercentIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18m-4 4l4-4m0 0l-4-4m-4 8a2 2 0 11-4 0 2 2 0 014 0zM5 8a2 2 0 100-4 2 2 0 000 4z" /></svg>);
    const HashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>);

    const ResultRow = ({ label, value, isSub, isTotal }) => (
        <div className={`flex items-center justify-between py-2 ${isSub ? 'pl-4 text-sm' : ''}`}>
            <span className={`${isSub ? 'text-gray-500' : isTotal ? 'font-bold text-gray-900' : 'text-gray-700 font-medium'}`}>{label}</span>
            <span className={`${isSub ? 'text-gray-600' : isTotal ? 'font-bold text-emerald-600 text-lg' : 'font-semibold text-gray-900'}`}>{value}</span>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
            <div ref={formRef} className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-slate-200 pb-4">보세창고료</h2>
                <div className="space-y-6">
                    <InputControl label="창고료 단가" name="warehouseRate" value={formData.warehouseRate} onChange={handleInputChange} unit="원/CBM/일" icon={<CurrencyWonIcon />} onKeyDown={handleKeyDown} />
                    <InputControl label="CBM" name="cbm" value={formData.cbm} onChange={handleInputChange} unit="㎥" icon={<CubeIcon />} onKeyDown={handleKeyDown} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">입항일</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><CalendarIcon /></div>
                            <input type="date" name="arrivalDate" value={formData.arrivalDate} onChange={handleInputChange} onKeyDown={handleKeyDown} className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">통관일</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><CalendarIcon /></div>
                            <input type="date" name="clearanceDate" value={formData.clearanceDate} onChange={handleInputChange} onKeyDown={handleKeyDown} className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white" />
                        </div>
                    </div>
                    <InputControl label="무료보관일수" name="freeDays" value={formData.freeDays} onChange={handleInputChange} unit="일" icon={<HashIcon />} onKeyDown={handleKeyDown} />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-6 mt-10 border-b border-slate-200 pb-4">통관비 납부지연가산세</h2>
                <div className="space-y-6">
                    <InputControl label="통관비" name="customsFee" value={formData.customsFee} onChange={handleInputChange} unit="원" icon={<CurrencyWonIcon />} onKeyDown={handleKeyDown} placeholder="예: 11938390" />
                    <InputControl label="가산세율" name="surchargeRate" value={formData.surchargeRate} onChange={handleInputChange} unit="%" icon={<PercentIcon />} onKeyDown={handleKeyDown} />
                    <InputControl label="납부마감기한 (입항일+N)" name="paymentDueDays" value={formData.paymentDueDays} onChange={handleInputChange} unit="일" icon={<HashIcon />} onKeyDown={handleKeyDown} />
                    <InputControl label="일 지연이자율" name="dailyInterestRate" value={formData.dailyInterestRate} onChange={handleInputChange} unit="%" icon={<PercentIcon />} onKeyDown={handleKeyDown} />
                </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 w-full animate-fade-in-slide-up">
                <div className="text-center mb-6">
                    <p className="text-lg text-gray-600">추가비용 총 합계</p>
                    <p className="text-5xl font-extrabold text-emerald-600 tracking-tight my-2">{formatKRW(results.grandTotal)}</p>
                </div>

                <div className="mt-6 space-y-3">
                    <div className="p-4 bg-white/70 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-gray-800 mb-2">보세창고료</h3>
                        <div className="divide-y divide-slate-200">
                            <ResultRow label="입항일 → 통관일" value={formatDays(results.totalStayDays)} isSub />
                            <ResultRow label={`무료보관 만료일`} value={results.freeUntil || '-'} isSub />
                            <ResultRow label="과금 보관기간" value={formatDays(results.storageDays)} isSub />
                            <ResultRow label="창고료 총액" value={formatKRW(results.warehouseFeeTotal)} />
                        </div>
                    </div>

                    <div className="p-4 bg-white/70 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-gray-800 mb-2">통관비 납부지연가산세</h3>
                        <div className="divide-y divide-slate-200">
                            <ResultRow label="납부마감기한" value={results.paymentDueDate || '-'} isSub />
                            <ResultRow label="지연일수" value={formatDays(results.delayDays)} isSub />
                            <ResultRow label={`가산세 (${formData.surchargeRate}%)`} value={formatKRW(results.surchargeAmount)} isSub />
                            <ResultRow label="납부지연이자" value={formatKRW(results.lateInterest)} isSub />
                            <ResultRow label="가산세 총액" value={formatKRW(results.surchargeTotal)} />
                        </div>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <ResultRow label="총 합계" value={formatKRW(results.grandTotal)} isTotal />
                    </div>
                </div>
            </div>
        </div>
    );
};
