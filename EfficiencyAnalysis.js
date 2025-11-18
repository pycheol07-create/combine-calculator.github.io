{
type: uploaded file
fileName: 통합계산기-v.1117-테스트/EfficiencyAnalysis.js
fullContent:
// [수정됨] 분할 운송 시나리오 전체 분석 (1회 ~ N회 분할 시 비용 비교 및 최적값 추천)

const EfficiencyAnalysis = ({ show, onClose, formData, exchangeRate, calculationMode }) => {
    if (!show) return null;

    const { settings } = React.useContext(SettingsContext);

    // 비용 시뮬레이션 함수 (단일 건 기준)
    const simulateCost = (targetQty) => {
        const { docsFee, coFee, oceanFreightPerCbm, minCbm, cbmWeightDivisor, vatRate } = settings.common;
        const exchangeRateValue = parseFloat(exchangeRate) || 1;
        const tariffRateValue = parseFloat(formData.tariffRate) / 100;
        const weightPerBox = parseFloat(formData.weightPerBox) || 0;

        let currentBoxes, currentProductPriceUSD;

        if (calculationMode === 'product') {
            const unitPrice = parseFloat(formData.unitPrice) || 0;
            const quantityPerBox = parseFloat(formData.quantityPerBox) || 1;
            // targetQty에 따른 박스 수 계산 (올림 처리)
            currentBoxes = Math.ceil(targetQty / quantityPerBox);
            currentProductPriceUSD = targetQty * unitPrice;
        } else { 
            // 박스 모드: 박스 수량이 targetQty가 됨 (여기서 targetQty는 박스 수를 의미하게 됨)
            // 박스 모드일 때는 simulateCost 호출 시 targetQty를 박스 수로 넘겨야 함을 주의
            currentBoxes = targetQty;
            
            // 전체 총액에서 1박스당 평균 단가 역산
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
            // FCL은 컨테이너 단위이므로 분할 시 로직이 복잡해질 수 있으나, 여기서는 단순 비율 혹은 1대 비용으로 가정
            // 보통 소량 분할 분석은 LCL에서 의미가 큼. 
            // 여기서는 단순히 입력된 컨테이너 비용을 그대로 사용하되, 물량이 적으면 비율대로 줄어들지 않음(1대값 고정)을 감안해야 하나,
            // 시뮬레이션 편의상 FCL 분할은 '컨테이너를 꽉 채우지 않아도 비용 발생'으로 처리
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
        // 개당 원가 (박스 모드일 경우 targetQty는 박스수이므로, 박스당 원가가 됨)
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
            finalCostPerUnit,
            // 순수 통관비용 (상품가 제외)
            onlyShippingCost: totalCost 
        };
    };

    // [일반 분석용] 수량 증감에 따른 데이터 생성
    const generateData = () => {
        const baseQty = calculationMode === 'product' 
            ? parseFloat(formData.productQuantity) 
            : parseFloat(formData.boxQuantity);
        
        if (!baseQty) return [];

        const data = [];
        const quantityPerBox = parseFloat(formData.quantityPerBox) || 1;
        
        const pointsToCheck = new Set();
        // 1~10박스
        for(let i=1; i<=10; i++) pointsToCheck.add(i);
        
        // 현재 수량 기준
        const currentBoxCount = calculationMode === 'product' ? Math.ceil(baseQty / quantityPerBox) : baseQty;
        pointsToCheck.add(currentBoxCount);
        pointsToCheck.add(currentBoxCount + 1);
        pointsToCheck.add(currentBoxCount + 5);
        
        // 최소 CBM 경계점
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

    // [신규] 분할 운송 시나리오 분석 (1번 ~ N번 나눠서 보낼 때)
    const analyzeSplitScenarios = (totalBoxes) => {
        if (!totalBoxes || totalBoxes <= 0) return [];

        const scenarios = [];
        const quantityPerBox = parseFloat(formData.quantityPerBox) || 1;
        
        // 최대 50번까지만 계산 (브라우저 성능 보호) 또는 전체 박스 수만큼
        const maxSplits = Math.min(totalBoxes, 50); 

        for (let splitCount = 1; splitCount <= maxSplits; splitCount++) {
            // 전체 박스를 splitCount로 나눔
            // 예: 20박스를 3번 나눔 -> 6.66... -> 실제로는 7, 7, 6 등으로 나뉨.
            // 시뮬레이션에서는 '평균 1회 발송량'을 기준으로 비용 계산 후 횟수를 곱함.
            
            const boxesPerShipment = totalBoxes / splitCount; // 실수 형태 (평균)
            
            // 시뮬레이션을 위한 1회 발송 수량 설정
            const qtyPerShipment = calculationMode === 'product' 
                ? boxesPerShipment * quantityPerBox 
                : boxesPerShipment;

            // 1회 발송 시 비용 계산
            const oneShipmentResult = simulateCost(qtyPerShipment);

            // 전체 총 비용 = 1회 비용 * 횟수
            // (주의: 상품가는 고정이므로 제외하고, '추가로 드는 통관비용' 관점에서 봐야 함)
            // 하지만 사용자에게는 '총 지출 통관비'를 보여주는 게 직관적임.
            const totalScenarioCost = oneShipmentResult.onlyShippingCost * splitCount;

            scenarios.push({
                splitCount: splitCount, // 몇 번에 나눠 보내는지
                boxesPerShipment: (totalBoxes / splitCount).toFixed(1), // 1회당 평균 박스 수
                oneShipmentCost: oneShipmentResult.onlyShippingCost, // 1회당 통관비
                totalScenarioCost: totalScenarioCost, // 총 통관비
            });
        }

        // 비용 오름차순 정렬 (가장 저렴한 게 위로)
        scenarios.sort((a, b) => a.totalScenarioCost - b.totalScenarioCost);
        return scenarios;
    };

    const data = generateData();
    
    // 현재 상태 정보
    const currentBoxCount = calculationMode === 'product' 
        ? Math.ceil(parseFloat(formData.productQuantity)/parseFloat(formData.quantityPerBox)) 
        : parseFloat(formData.boxQuantity);
    
    const currentItem = data.find(d => d.boxes === currentBoxCount);
    
    // 분할 분석 데이터 생성
    const splitScenarios = React.useMemo(() => {
        return analyzeSplitScenarios(currentBoxCount);
    }, [currentBoxCount, formData, settings, exchangeRate, calculationMode]);

    const formatCurrency = (val) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(val);

    // [UI] 분할 운송 분석 렌더링
    const renderSplitAnalysis = () => {
        if (!splitScenarios || splitScenarios.length === 0) return null;

        const bestScenario = splitScenarios[0]; // 정렬했으므로 첫 번째가 최적
        const currentScenario = splitScenarios.find(s => s.splitCount === 1); // 1번(한번에) 보내는 경우
        
        if (!currentScenario) return null;

        // 현재(1회 발송) 대비 최적 시나리오의 절감액 (음수면 손해, 양수면 이득)
        const saving = currentScenario.totalScenarioCost - bestScenario.totalScenarioCost;
        const isCurrentBest = bestScenario.splitCount === 1;

        return (
            <div className="mb-8">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                    ✂️ 분할 운송 시나리오 분석
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">1회 ~ {splitScenarios.length}회 분할 시뮬레이션</span>
                </h3>

                {/* 추천 요약 박스 */}
                <div className={`p-4 rounded-xl border-2 mb-4 ${isCurrentBest ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex items-start gap-3">
                        <div className={`text-3xl ${isCurrentBest ? 'text-emerald-500' : 'text-blue-500'}`}>
                            {isCurrentBest ? '👍' : '💡'}
                        </div>
                        <div>
                            <h4 className={`font-bold text-lg ${isCurrentBest ? 'text-emerald-800' : 'text-blue-800'}`}>
                                {isCurrentBest 
                                    ? "한 번에 보내는 것이 가장 저렴합니다!" 
                                    : `${bestScenario.splitCount}번에 나눠서 보내는 것을 추천합니다!`}
                            </h4>
                            <p className={`text-sm mt-1 ${isCurrentBest ? 'text-emerald-600' : 'text-blue-600'}`}>
                                {isCurrentBest 
                                    ? `나눠서 보내면 고정 비용(서류비, 기본운임 등)이 중복 발생하여 비용이 증가합니다.`
                                    : `총 ${formatCurrency(saving)}원을 절약할 수 있습니다.`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 상세 테이블 */}
                <div className="overflow-hidden border rounded-lg shadow-sm max-h-64 overflow-y-auto">
                    <table className="w-full text-sm text-center border-collapse">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                            <tr>
                                <th className="p-2 border-b">횟수</th>
                                <th className="p-2 border-b">1회당 물량</th>
                                <th className="p-2 border-b">총 통관비용</th>
                                <th className="p-2 border-b">비고</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* 원래 순서(횟수 1, 2, 3...)대로 보여주기 위해 재정렬 */}
                            {[...splitScenarios].sort((a,b) => a.splitCount - b.splitCount).map((row, idx) => {
                                const isBest = row.splitCount === bestScenario.splitCount;
                                const diff = row.totalScenarioCost - currentScenario.totalScenarioCost;
                                
                                return (
                                    <tr key={idx} className={`${isBest ? 'bg-blue-50 font-bold' : 'hover:bg-gray-50'} border-b last:border-0 transition-colors`}>
                                        <td className="p-2 border-r text-gray-700">
                                            {row.splitCount}회
                                        </td>
                                        <td className="p-2 border-r text-gray-600">
                                            평균 {row.boxesPerShipment}박스
                                        </td>
                                        <td className={`p-2 border-r font-mono ${isBest ? 'text-blue-600' : 'text-gray-800'}`}>
                                            {formatCurrency(row.totalScenarioCost)}
                                        </td>
                                        <td className="p-2 text-xs">
                                            {row.splitCount === 1 && <span className="inline-block px-2 py-0.5 rounded bg-gray-200 text-gray-600">기준</span>}
                                            {isBest && row.splitCount !== 1 && <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-600">최적 (Min)</span>}
                                            {!isBest && diff > 0 && <span className="text-red-400">+{formatCurrency(diff)}</span>}
                                            {!isBest && diff < 0 && <span className="text-blue-400">{formatCurrency(diff)}</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-right">* 단순 산술 평균 계산이므로 실제 선적 시 박스 부피/무게에 따라 오차가 있을 수 있습니다.</p>
            </div>
        );
    };

    const recommend = () => {
        if (!currentItem) return null;
        // 기존 '더 모아서 보내면 이득' 로직 유지
        const betterOption = data.find(d => d.boxes > currentItem.boxes && d.finalCostPerUnit < currentItem.finalCostPerUnit);
        if (betterOption) {
            const savePerUnit = currentItem.finalCostPerUnit - betterOption.finalCostPerUnit;
            const addBoxes = betterOption.boxes - currentItem.boxes;
            return (
                <div className="bg-indigo-50 p-4 rounded-lg mb-8 border border-indigo-200">
                    <p className="text-indigo-800 font-bold text-lg">💡 더 모아서 보내면 이득!</p>
                    <p className="text-indigo-700 text-sm mt-1">
                        <span className="font-bold">{addBoxes}박스</span>만 더 추가({betterOption.boxes}박스)하면,<br/>
                        개당 원가가 <span className="font-bold text-indigo-600">{formatCurrency(savePerUnit)}원</span> 더 저렴해집니다.
                    </p>
                </div>
            );
        }
        return null;
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b p-4 bg-white sticky top-0 z-20">
                    <h2 className="text-xl font-bold text-gray-800">📦 운송 효율 분석 리포트</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {/* 1. 분할 운송 시나리오 분석 (New) */}
                    {renderSplitAnalysis()}
                    
                    {/* 2. 추가 주문 추천 (기존 유지) */}
                    {recommend()}

                    <h3 className="font-bold text-gray-700 mb-3 border-t pt-6">📊 박스 수량별 단가 변화표</h3>
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
}