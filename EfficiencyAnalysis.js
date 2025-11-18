// [수정됨] 운송 효율 분석 (PDF 내보내기 기능 추가 + 구간별 최소 선적 단위 적용)

const EfficiencyAnalysis = ({ show, onClose, formData, exchangeRate, calculationMode }) => {
    if (!show) return null;

    const { settings } = React.useContext(SettingsContext);
    
    // PDF 캡처 영역을 지정하기 위한 Ref
    const printRef = React.useRef(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

    // PDF 다운로드 핸들러
    const handleDownloadPDF = async () => {
        if (!printRef.current) return;
        
        try {
            setIsGeneratingPdf(true);
            
            // 1. html2canvas로 DOM을 캡처
            const canvas = await window.html2canvas(printRef.current, {
                scale: 2, // 해상도 2배 (선명하게)
                useCORS: true, // 이미지 크로스오리진 허용
                logging: false,
                backgroundColor: '#ffffff' // 배경 흰색 고정
            });
            
            // 2. 캔버스를 이미지 데이터로 변환
            const imgData = canvas.toDataURL('image/png');
            
            // 3. jspdf로 PDF 생성
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // A4 크기 계산 (mm 단위)
            const imgWidth = 210; // A4 너비
            const pageHeight = 297; // A4 높이
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            // 첫 페이지 추가
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // 내용이 길 경우 페이지 추가 (간단한 처리)
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            // 파일 저장
            const dateStr = new Date().toISOString().slice(0,10);
            pdf.save(`운송효율분석리포트_${dateStr}.pdf`);
            
        } catch (error) {
            console.error("PDF 생성 중 오류 발생:", error);
            alert("PDF 생성에 실패했습니다.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

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
        const validQty = targetQty > 0 ? targetQty : 1;
        const perUnitCost = totalCost / validQty; 
        const finalCostPerUnit = (totalProductPriceKRW + totalCost) / validQty;

        return {
            qty: targetQty,
            boxes: currentBoxes,
            cbm: rawCbm,
            chargeableCbm,
            oceanFreightKRW,
            totalCost,
            perUnitCost,
            finalCostPerUnit,
            onlyShippingCost: totalCost 
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
        
        const pointsToCheck = new Set();
        for(let i=1; i<=10; i++) pointsToCheck.add(i);
        
        const currentBoxCount = calculationMode === 'product' ? Math.ceil(baseQty / quantityPerBox) : baseQty;
        pointsToCheck.add(currentBoxCount);
        pointsToCheck.add(currentBoxCount + 1);
        pointsToCheck.add(currentBoxCount + 5);
        
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

    // 분할 운송 시나리오 분석
    const analyzeSplitScenarios = (totalBoxes) => {
        if (!totalBoxes || totalBoxes <= 0) return [];

        const scenarios = [];
        const quantityPerBox = parseFloat(formData.quantityPerBox) || 1;
        
        let minShipmentSize = 1;
        if (totalBoxes >= 20) {
            minShipmentSize = 10; 
        } else if (totalBoxes >= 10) {
            minShipmentSize = 5;
        }

        let maxSplits = Math.floor(totalBoxes / minShipmentSize);
        if (maxSplits < 1) maxSplits = 1;
        maxSplits = Math.min(maxSplits, 50);

        for (let splitCount = 1; splitCount <= maxSplits; splitCount++) {
            const baseBoxes = Math.floor(totalBoxes / splitCount);
            const remainder = totalBoxes % splitCount;

            if (baseBoxes === 0) break;

            const countCeil = remainder;          
            const countFloor = splitCount - remainder;

            const getQty = (boxes) => calculationMode === 'product' ? boxes * quantityPerBox : boxes;

            let costFloor = 0;
            let costCeil = 0;

            if (countFloor > 0) costFloor = simulateCost(getQty(baseBoxes)).onlyShippingCost;
            if (countCeil > 0) costCeil = simulateCost(getQty(baseBoxes + 1)).onlyShippingCost;

            const totalScenarioCost = (costFloor * countFloor) + (costCeil * countCeil);

            let displayBoxes = `${baseBoxes}박스`;
            if (remainder > 0) displayBoxes = `${baseBoxes}~${baseBoxes + 1}박스`;

            scenarios.push({
                splitCount: splitCount,
                displayBoxes: displayBoxes,
                totalScenarioCost: totalScenarioCost,
            });
        }

        scenarios.sort((a, b) => a.totalScenarioCost - b.totalScenarioCost);
        return scenarios;
    };

    const data = generateData();
    const currentBoxCount = calculationMode === 'product' 
        ? Math.ceil(parseFloat(formData.productQuantity)/parseFloat(formData.quantityPerBox)) 
        : parseFloat(formData.boxQuantity);
    
    const currentItem = data.find(d => d.boxes === currentBoxCount);
    
    const splitScenarios = React.useMemo(() => {
        return analyzeSplitScenarios(currentBoxCount);
    }, [currentBoxCount, formData, settings, exchangeRate, calculationMode]);

    const formatCurrency = (val) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(val);

    // 렌더링 로직들
    const renderSplitAnalysis = () => {
        if (!splitScenarios || splitScenarios.length === 0) return null;

        const bestScenario = splitScenarios[0]; 
        const currentScenario = splitScenarios.find(s => s.splitCount === 1); 
        
        if (!currentScenario) return null;

        const saving = currentScenario.totalScenarioCost - bestScenario.totalScenarioCost;
        const isCurrentBest = bestScenario.splitCount === 1;

        return (
            <div className="mb-8">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                    ✂️ 분할 운송 시나리오 분석
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        1회 ~ {splitScenarios.length}회 분할
                    </span>
                </h3>
                <div className={`p-4 rounded-xl border-2 mb-4 ${isCurrentBest ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex items-start gap-3">
                        <div className={`text-3xl ${isCurrentBest ? 'text-emerald-500' : 'text-blue-500'}`}>
                            {isCurrentBest ? '👍' : '💡'}
                        </div>
                        <div>
                            <h4 className={`font-bold text-lg ${isCurrentBest ? 'text-emerald-800' : 'text-blue-800'}`}>
                                {isCurrentBest ? "한 번에 보내는 것이 가장 저렴합니다!" : `${bestScenario.splitCount}번에 나눠서 보내는 것을 추천합니다!`}
                            </h4>
                            <p className={`text-sm mt-1 ${isCurrentBest ? 'text-emerald-600' : 'text-blue-600'}`}>
                                {isCurrentBest ? `나눠서 보내면 고정 비용이 중복 발생하여 비용이 증가합니다.` : `총 ${formatCurrency(saving)}원을 절약할 수 있습니다.`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="overflow-hidden border rounded-lg shadow-sm">
                    <table className="w-full text-sm text-center border-collapse">
                        <thead className="bg-gray-100 text-gray-600">
                            <tr>
                                <th className="p-2 border-b">횟수</th>
                                <th className="p-2 border-b">1회당 물량</th>
                                <th className="p-2 border-b">총 통관비용</th>
                                <th className="p-2 border-b">비고</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...splitScenarios].sort((a,b) => a.splitCount - b.splitCount).map((row, idx) => {
                                const isBest = row.splitCount === bestScenario.splitCount;
                                const diff = row.totalScenarioCost - currentScenario.totalScenarioCost;
                                return (
                                    <tr key={idx} className={`${isBest ? 'bg-blue-50 font-bold' : 'hover:bg-gray-50'} border-b last:border-0 transition-colors`}>
                                        <td className="p-2 border-r text-gray-700">{row.splitCount}회</td>
                                        <td className="p-2 border-r text-gray-600">{row.displayBoxes}</td>
                                        <td className={`p-2 border-r font-mono ${isBest ? 'text-blue-600' : 'text-gray-800'}`}>{formatCurrency(row.totalScenarioCost)}</td>
                                        <td className="p-2 text-xs">
                                            {row.splitCount === 1 && <span className="inline-block px-2 py-0.5 rounded bg-gray-200 text-gray-600">기준</span>}
                                            {isBest && row.splitCount !== 1 && <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-600">최적</span>}
                                            {!isBest && diff > 0 && <span className="text-red-400">+{formatCurrency(diff)}</span>}
                                            {!isBest && diff < 0 && <span className="text-blue-400">{formatCurrency(diff)}</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const recommend = () => {
        if (!currentItem) return null;
        const betterOption = data.find(d => d.boxes > currentItem.boxes && d.finalCostPerUnit < currentItem.finalCostPerUnit);
        if (betterOption) {
            const savePerUnit = currentItem.finalCostPerUnit - betterOption.finalCostPerUnit;
            const addBoxes = betterOption.boxes - currentItem.boxes;
            return (
                <div className="bg-indigo-50 p-4 rounded-lg mb-8 border border-indigo-200">
                    <p className="text-indigo-800 font-bold text-lg">💡 더 모아서 보내면 이득!</p>
                    <p className="text-indigo-700 text-sm mt-1">
                        <span className="font-bold">{addBoxes}박스</span>만 더 추가({betterOption.boxes}박스)하면, 개당 원가가 <span className="font-bold text-indigo-600">{formatCurrency(savePerUnit)}원</span> 더 저렴해집니다.
                    </p>
                </div>
            );
        }
        return null;
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col animate-fade-in-slide-up max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header: PDF 저장 버튼 추가 */}
                <div className="flex justify-between items-center border-b p-4 bg-white rounded-t-2xl z-20 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">📦 운송 효율 분석 리포트</h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleDownloadPDF} 
                            disabled={isGeneratingPdf}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:bg-gray-400 transition-colors"
                        >
                            {isGeneratingPdf ? (
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            )}
                            PDF 저장
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl px-2">&times;</button>
                    </div>
                </div>
                
                {/* Content Area with Ref */}
                <div ref={printRef} className="p-6 overflow-y-auto custom-scrollbar bg-white flex-grow">
                    {/* PDF 출력 시 상단 제목이 필요할 수 있으므로 숨겨진 제목 추가 (PDF에만 보임 - html2canvas 특성상 보임) */}
                    {/* 1. 분할 운송 시나리오 분석 */}
                    {renderSplitAnalysis()}
                    
                    {/* 2. 추가 주문 추천 */}
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
                                            <td className="p-2 border">{row.boxes} {isCurrent && <span className="block text-[10px] text-emerald-600 font-bold">(현재)</span>}</td>
                                            <td className="p-2 border text-gray-600">{formatCurrency(row.totalCost)} {isUnderMinCbm && <div className="text-[10px] text-orange-400">최소CBM 적용됨</div>}</td>
                                            <td className="p-2 border font-semibold text-gray-800 bg-blue-50/30">{formatCurrency(row.finalCostPerUnit)}</td>
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
                    <div className="mt-4 text-right text-xs text-gray-400">
                        Generated by 비용계산기 | {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};