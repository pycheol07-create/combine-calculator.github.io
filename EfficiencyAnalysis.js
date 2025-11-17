// [수정됨] ReactDOM.createPortal을 사용하여 모달을 body에 직접 렌더링 (transform 영향 제거)

const EfficiencyAnalysis = ({ show, onClose, formData, exchangeRate, calculationMode }) => {
    if (!show) return null;

    const { settings } = React.useContext(SettingsContext);

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
            currentBoxes = targetQty;
            const totalOriginalPrice = parseFloat(formData.totalProductPrice) || 0;
            const originalBoxes = parseFloat(formData.boxQuantity) || 1;
            const pricePerBox = totalOriginalPrice / originalBoxes;
            currentProductPriceUSD = currentBoxes * pricePerBox;
        }

        const totalWeight = currentBoxes * weightPerBox;
        const rawCbm = totalWeight / cbmWeightDivisor;
        const chargeableCbm = formData.shippingType === 'LCL' ? Math.max(rawCbm, minCbm || 0) : rawCbm;
        
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

    const generateData = () => {
        const baseQty = calculationMode === 'product' 
            ? parseFloat(formData.productQuantity) 
            : parseFloat(formData.boxQuantity);
        
        if (!baseQty) return [];

        const data = [];
        const quantityPerBox = parseFloat(formData.quantityPerBox) || 1;
        
        const pointsToCheck = new Set();
        for(let i=1; i<=15; i++) pointsToCheck.add(i);
        
        const currentBoxCount = calculationMode === 'product' ? Math.ceil(baseQty / quantityPerBox) : baseQty;
        pointsToCheck.add(currentBoxCount);
        pointsToCheck.add(currentBoxCount + 1);
        pointsToCheck.add(currentBoxCount + 5);
        pointsToCheck.add(currentBoxCount + 10);

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
    const currentItem = data.find(d => {
        const currentBoxes = calculationMode === 'product' ? Math.ceil(parseFloat(formData.productQuantity)/parseFloat(formData.quantityPerBox)) : parseFloat(formData.boxQuantity);
        return d.boxes === currentBoxes;
    });

    const formatCurrency = (val) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(val);

    const recommend = () => {
        if (!currentItem) return null;
        const betterOption = data.find(d => d.boxes > currentItem.boxes && d.finalCostPerUnit < currentItem.finalCostPerUnit);
        
        if (betterOption) {
            const savePerUnit = currentItem.finalCostPerUnit - betterOption.finalCostPerUnit;
            const addBoxes = betterOption.boxes - currentItem.boxes;
            return (
                <div className="bg-emerald-50 p-4 rounded-lg mb-4 border border-emerald-200">
                    <p className="text-emerald-800 font-bold text-lg">💡 꿀팁 발견!</p>
                    <p className="text-emerald-700">
                        <span className="font-bold">{addBoxes}박스</span>만 더 추가하면,<br/>
                        개당 원가가 약 <span className="font-bold text-emerald-600">{formatCurrency(savePerUnit)}원</span> 저렴해집니다.
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                        (이유: 고정비용 분산 및 최소 CBM 공간 활용)
                    </p>
                </div>
            );
        }
        return (
            <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                <p className="text-blue-800 font-bold">현재 매우 효율적인 구간입니다! 👍</p>
                <p className="text-blue-600 text-sm">더 많이 주문해도 개당 원가가 크게 줄어들지 않습니다.</p>
            </div>
        );
    };

    // [중요] ReactDOM.createPortal을 사용하여 모달을 document.body에 렌더링
    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b p-4">
                    <h2 className="text-xl font-bold text-gray-800">📦 운송 효율 분석</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {recommend()}

                    <h3 className="font-bold text-gray-700 mb-3">수량별 예상 비용 시뮬레이션</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center border-collapse">
                            <thead className="bg-gray-100 text-gray-600">
                                <tr>
                                    <th className="p-2 border">박스수</th>
                                    <th className="p-2 border">CBM</th>
                                    <th className="p-2 border">해운비</th>
                                    <th className="p-2 border">개당 최종원가</th>
                                    <th className="p-2 border">비고</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => {
                                    const isCurrent = row.boxes === currentItem?.boxes;
                                    const minCbmVal = settings.common.minCbm || 1;
                                    // CBM이 최소 CBM보다 작거나 같으면서, 최소 CBM에 근접할 때만 표시
                                    const isMinCbmApplied = row.cbm < minCbmVal; 
                                    
                                    return (
                                        <tr key={idx} className={`${isCurrent ? 'bg-emerald-50 border-emerald-200 font-bold' : 'hover:bg-gray-50'} border-b`}>
                                            <td className="p-2 border">
                                                {row.boxes}
                                                {isCurrent && <span className="block text-xs text-emerald-600">(현재)</span>}
                                            </td>
                                            <td className="p-2 border">
                                                {row.cbm.toFixed(2)}
                                                {row.chargeableCbm > row.cbm && <span className="block text-xs text-orange-500">(최소 {minCbmVal} 적용)</span>}
                                            </td>
                                            <td className="p-2 border">{formatCurrency(row.oceanFreightKRW)}</td>
                                            <td className="p-2 border text-emerald-700">{formatCurrency(row.finalCostPerUnit)}</td>
                                            <td className="p-2 border text-xs text-gray-500">
                                                {idx > 0 && row.finalCostPerUnit < data[idx-1].finalCostPerUnit && "📉 하락"}
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
        document.body // body 태그 바로 아래에 렌더링
    );
};