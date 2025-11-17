// [수정됨] '분할 운송 비교' 기능 추가 (1박스씩 보낼 때 vs 한 번에 보낼 때)

const EfficiencyAnalysis = ({ show, onClose, formData, exchangeRate, calculationMode }) => {
    if (!show) return null;

    const { settings } = React.useContext(SettingsContext);

    // 비용 시뮬레이션 함수
    const simulateCost = (targetQty) => {
        const { docsFee, coFee, oceanFreightPerCbm, minCbm, cbmWeightDivisor, vatRate } = settings.common;
        const exchangeRateValue = parseFloat(exchangeRate) || 1;
        const tariffRateValue = parseFloat(formData.tariffRate) / 100;
        const weightPerBox = parseFloat(formData.weightPerBox) || 0;

        let currentBoxes, currentProductPriceUSD;

        if (calculationMode === 'product') {
            const unitPrice = parseFloat(formData.unitPrice) || 0;
            const quantityPerBox = parseFloat(formData.quantityPerBox) || 1;
            currentBoxes = Math.ceil(targetQty / quantityPerBox);
            currentProductPriceUSD = targetQty * unitPrice;
        } else { 
            // 박스 모드: 박스당 단가 추정
            currentBoxes = targetQty;
            const totalOriginalPrice = parseFloat(formData.totalProductPrice) || 0;
            const originalBoxes = parseFloat(formData.boxQuantity) || 1;
            const pricePerBox = totalOriginalPrice / originalBoxes;
            currentProductPriceUSD = currentBoxes * pricePerBox;
        }

        // 무게 및 CBM 계산
        const totalWeight = currentBoxes * weightPerBox;
        const rawCbm = totalWeight / cbmWeightDivisor;
        // LCL 최소 CBM 적용
        const chargeableCbm = formData.shippingType === 'LCL' ? Math.max(rawCbm, minCbm || 0) : rawCbm;
        
        // 해운비 계산
        let oceanFreightKRW;
        if (formData.shippingType === 'FCL') {
            oceanFreightKRW = parseFloat(formData.containerCost) || 0;
        } else {
            oceanFreightKRW = chargeableCbm * oceanFreightPerCbm;
        }

        const oceanFreightUSD = oceanFreightKRW / exchangeRateValue;
        const taxableBaseUSD = currentProductPriceUSD + oceanFreightUSD;
        const tariffAmountUSD = taxableBaseUSD * tariffRateValue;
        const vatBaseUSD = taxableBaseUSD + tariffAmountUSD;
        const vatAmountUSD = vatBaseUSD * vatRate;

        const totalProductPriceKRW = currentProductPriceUSD * exchangeRateValue;
        const tariffAmount = tariffAmountUSD * exchangeRateValue;
        const vatAmount = vatAmountUSD * exchangeRateValue;

        // 수수료 계산
        let commissionAmountKRW = 0;
        const commissionValueNum = parseFloat(formData.commissionValue) || 0;
        if (formData.commissionType === 'percentage') {
            commissionAmountKRW = totalProductPriceKRW * (commissionValueNum / 100);
        } else if (formData.commissionType === 'perItem' && calculationMode === 'product') {
            commissionAmountKRW = commissionValueNum * targetQty;
        }

        const totalCost = docsFee + coFee + oceanFreightKRW + tariffAmount + vatAmount + commissionAmountKRW;
        const perUnitCost = totalCost / targetQty;
        const finalCostPerUnit = (totalProductPriceKRW + totalCost) / targetQty;

        return {
            qty: targetQty,
            boxes: currentBoxes,
            cbm: rawCbm,
            chargeableCbm,
            oceanFreightKRW,
            totalCost,
            perUnitCost,
            finalCostPerUnit
        };
    };

    // 데이터 생성
    const generateData = () => {
        const baseQty = calculationMode === 'product' 
            ? parseFloat(formData.productQuantity) 
            : parseFloat(formData.boxQuantity);
        
        if (!baseQty) return [];

        const data = [];
        const quantityPerBox = parseFloat(formData.quantityPerBox) || 1;
        const step = calculationMode === 'product' ? quantityPerBox : 1;

        const pointsToCheck = new Set();
        
        // 1~10박스 구간 집중 분석
        for(let i=1; i<=10; i++) pointsToCheck.add(i);
        
        // 현재 수량 기준 주변
        const currentBoxCount = calculationMode === 'product' ? Math.ceil(baseQty / quantityPerBox) : baseQty;
        pointsToCheck.add(currentBoxCount);
        pointsToCheck.add(currentBoxCount + 1);
        pointsToCheck.add(currentBoxCount + 5);
        
        // 최소 CBM 경계점 (CBM이 1.0을 넘는 지점)
        const weightPerBox = parseFloat(formData.weightPerBox) || 0;
        const cbmWeightDivisor = settings.common.cbmWeightDivisor;
        const minCbm = settings.common.minCbm || 1;
        
        if (weightPerBox > 0) {
            const boxesForMinCbm = Math.ceil((minCbm * cbmWeightDivisor) / weightPerBox);
            pointsToCheck.add(boxesForMinCbm);
            pointsToCheck.add(boxesForMinCbm + 1);
        }

        const sortedBoxes = Array.from(pointsToCheck).sort((a, b) => a - b).filter(b => b > 0);

        sortedBoxes.forEach(boxes => {
            const qty = calculationMode === 'product' ? boxes * quantityPerBox : boxes;
            data.push(simulateCost(qty));
        });

        return data;
    };

    const data = generateData();
    
    // 현재 상태 찾기
    const currentBoxCount = calculationMode === 'product' ? Math.ceil(parseFloat(formData.productQuantity)/parseFloat(formData.quantityPerBox)) : parseFloat(formData.boxQuantity);
    const currentItem = data.find(d => d.boxes === currentBoxCount);
    
    // 1박스(최소 단위) 상태 찾기
    const minItem = data.find(d => d.boxes === 1);

    const formatCurrency = (val) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(val);

    // [추가됨] 분할 운송 비교 분석 렌더링
    const renderSplitComparison = () => {
        if (!currentItem || !minItem || currentItem.boxes <= 1) return null;

        // 1박스씩 나눠서 보낼 때의 총 예상 비용 (단순 계산: 1박스 비용 * 박스 수)
        // 주의: 상품가는 변하지 않으므로 '통관비용(totalCost)'만 비교해야 정확함
        // 하지만 사용자 관점에서는 '총 지출액' 차이가 중요
        
        const costOneByOne = minItem.totalCost * currentItem.boxes; // 통관비 * 박스수
        const costAtOnce = currentItem.totalCost;
        const loss = costOneByOne - costAtOnce;

        return (
            <div className="bg-orange-50 p-4 rounded-lg mb-4 border border-orange-200">
                <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    분할 운송 시 비용 손실 경고
                </h4>
                <div className="text-sm text-orange-700 space-y-1">
                    <p>현재 물량(<span className="font-bold">{currentItem.boxes}박스</span>)을 1박스씩 {currentItem.boxes}번에 나눠서 보낸다면?</p>
                    <div className="flex justify-between items-center py-1 border-b border-orange-200/50">
                        <span>한 번에 보낼 때 통관비:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(costAtOnce)}원</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-orange-200/50">
                        <span>나눠서 보낼 때 통관비 합계:</span>
                        <span className="font-bold text-red-500">{formatCurrency(costOneByOne)}원</span>
                    </div>
                    <p className="pt-2 text-right">
                        총 <span className="text-lg font-extrabold text-red-600">{formatCurrency(loss)}원</span> 손해 발생! 😱
                    </p>
                </div>
                <p className="text-xs text-orange-500 mt-2 text-right">* 기본료(서류비 등)와 최소 CBM 비용 중복 발생 때문입니다.</p>
            </div>
        );
    };

    // 추천 로직 (기존 유지 + 보완)
    const recommend = () => {
        if (!currentItem) return null;
        
        // 현재보다 더 효율적인 구간 찾기
        const betterOption = data.find(d => d.boxes > currentItem.boxes && d.finalCostPerUnit < currentItem.finalCostPerUnit);
        
        if (betterOption) {
            const savePerUnit = currentItem.finalCostPerUnit - betterOption.finalCostPerUnit;
            const addBoxes = betterOption.boxes - currentItem.boxes;
            return (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                    <p className="text-blue-800 font-bold text-lg">💡 더 모아서 보내면 이득!</p>
                    <p className="text-blue-700 text-sm mt-1">
                        <span className="font-bold">{addBoxes}박스</span>만 더 추가({betterOption.boxes}박스)하면,<br/>
                        개당 원가가 <span className="font-bold text-blue-600">{formatCurrency(savePerUnit)}원</span> 더 저렴해집니다.
                    </p>
                </div>
            );
        }
        
        // 이미 최적 구간이거나 큰 차이가 없을 때
        return (
             <div className="bg-emerald-50 p-4 rounded-lg mb-4 border border-emerald-200">
                <p className="text-emerald-800 font-bold">👍 현재 수량도 충분히 경제적입니다.</p>
                <p className="text-emerald-600 text-sm">추가 주문에 따른 원가 절감 효과가 크지 않은 구간입니다.</p>
            </div>
        );
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b p-4">
                    <h2 className="text-xl font-bold text-gray-800">📦 운송 효율 분석</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {/* 1. 분할 운송 비교 (경고) */}
                    {renderSplitComparison()}
                    
                    {/* 2. 추가 주문 추천 (팁) */}
                    {recommend()}

                    <h3 className="font-bold text-gray-700 mb-3 mt-6">박스 수량별 비용 상세표</h3>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-center border-collapse">
                            <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                <tr>
                                    <th className="p-2 border">박스수</th>
                                    <th className="p-2 border">총 통관비</th>
                                    <th className="p-2 border bg-blue-50 text-blue-800">개당 최종원가</th>
                                    <th className="p-2 border">비고</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => {
                                    const isCurrent = row.boxes === currentItem?.boxes;
                                    const isMin = row.boxes === 1;
                                    const minCbmVal = settings.common.minCbm || 1;
                                    // CBM이 최소 CBM 구간에 있는지 확인 (예: 0.1 ~ 0.9 CBM)
                                    const isUnderMinCbm = row.cbm < minCbmVal; 
                                    
                                    return (
                                        <tr key={idx} className={`${isCurrent ? 'bg-emerald-50 border-emerald-200 font-bold' : 'hover:bg-gray-50'} border-b transition-colors`}>
                                            <td className="p-2 border">
                                                {row.boxes}
                                                {isCurrent && <span className="block text-[10px] text-emerald-600 font-bold">(현재)</span>}
                                            </td>
                                            <td className="p-2 border text-gray-600">
                                                {formatCurrency(row.totalCost)}
                                                {isUnderMinCbm && <div className="text-[10px] text-orange-400">최소CBM 적용됨</div>}
                                            </td>
                                            <td className="p-2 border font-semibold text-gray-800 bg-blue-50/30">
                                                {formatCurrency(row.finalCostPerUnit)}
                                            </td>
                                            <td className="p-2 border text-xs text-gray-500">
                                                {isMin && <span className="text-red-500 font-bold">최대 비용</span>}
                                                {!isMin && idx > 0 && row.finalCostPerUnit < data[idx-1].finalCostPerUnit && <span className="text-emerald-500">▼ 절감</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};