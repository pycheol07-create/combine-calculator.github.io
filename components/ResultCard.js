import React, { useState } from 'react';
import * as Icons from './Icons.js'; // 아이콘을 가져옵니다.

// --- From components/ResultCard.tsx ---
export const ResultCard = ({ results }) => {
  const [isTaxesExpanded, setIsTaxesExpanded] = useState(false);
  const [isFeesExpanded, setIsFeesExpanded] = useState(false);

  const formatCurrency = (value, currency = 'KRW') => {
    // Ensure value is a number, default to 0 if not
    const numericValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(numericValue);
  };

  const formatNumber = (value, unit = '', digits = 2) => {
      // Ensure value is a number, default to 0 if not
      const numericValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits }).format(numericValue)} ${unit}`;
  }

  const AnimatedNumber = ({ value, formatter }) => {
      // Ensure value passed to formatter is valid
      const numericValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      return <>{formatter(numericValue)}</>;
  };

  const ResultItem = ({ label, value, icon, isSub }) => (
    <div className={`flex items-center justify-between py-3 ${isSub ? 'pl-10' : ''}`}>
      <div className="flex items-center min-w-0"> {/* Added min-w-0 for flex shrink */}
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isSub ? 'bg-slate-100' : 'bg-emerald-100'}`}>
          {icon}
        </div>
        {/* Added truncate for long labels if needed */}
        <span className={`ml-4 font-medium truncate ${isSub ? 'text-sm text-gray-600' : 'text-gray-800'}`}>{label}</span>
      </div>
      {/* Added text-right and whitespace-nowrap */}
      <span className={`font-semibold text-right whitespace-nowrap ${isSub ? 'text-sm text-gray-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
  
  // 아이콘 정의가 Icons.js로 이동했습니다.
  
  return (
    <div className="bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200 w-full animate-fade-in-slide-up">
          <div className="text-center mb-6">
              <p className="text-lg text-gray-600">최종 통관 비용</p>
              <p className="text-5xl font-extrabold text-emerald-600 tracking-tight my-2">
                  <AnimatedNumber value={results.totalCost} formatter={formatCurrency} />
              </p>
          </div>
          
        <div className="space-y-1 divide-y divide-slate-200">
          <ResultItem 
              label="총 상품가" 
              value={<AnimatedNumber value={results.totalProductPriceKRW} formatter={formatCurrency} />} 
              icon={<Icons.Price />} // Icons.Price로 변경
          />
          <ResultItem 
              label="해운비" 
              value={<AnimatedNumber value={results.oceanFreightKRW} formatter={formatCurrency} />} 
              icon={<Icons.Shipping />} // Icons.Shipping로 변경
          />
          
          {/* --- NEW ITEM: Commission --- */}
          {results.commissionAmountKRW > 0 && (
              <ResultItem 
                  label="수수료" 
                  value={<AnimatedNumber value={results.commissionAmountKRW} formatter={formatCurrency} />} 
                  icon={<Icons.Receipt />} // Icons.Receipt로 변경
              />
          )}
          {/* --- END NEW --- */}
          
          {results.costPerItem > 0 && (
              <ResultItem 
                  label="개당 최종 원가" 
                  value={<AnimatedNumber value={results.costPerItem} formatter={formatCurrency} />} 
                  icon={<Icons.PriceTag />} // Icons.PriceTag로 변경
              />
          )}

          {/* Tax Group */}
          <div>
              <div 
                  onClick={() => setIsTaxesExpanded(!isTaxesExpanded)}
                  className="flex items-center justify-between py-3 md:cursor-auto cursor-pointer"
                  role="button"
                  aria-expanded={isTaxesExpanded}
              >
                  <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-emerald-100">
                          <Icons.Tax /> {/* Icons.Tax로 변경 */}
                      </div>
                      <span className="ml-4 font-medium text-gray-800">총 세금</span>
                  </div>
                  <div className="flex items-center">
                      <span className="font-semibold text-gray-900">
                          <AnimatedNumber value={results.totalTaxes} formatter={formatCurrency} />
                      </span>
                      <span className={`ml-2 transform transition-transform duration-200 md:hidden ${isTaxesExpanded ? 'rotate-180' : ''}`}>
                          <Icons.ChevronDown /> {/* Icons.ChevronDown로 변경 */}
                      </span>
                  </div>
              </div>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isTaxesExpanded ? 'max-h-40' : 'max-h-0'} md:max-h-40`}>
                  <ResultItem 
                      label="관세" 
                      value={<AnimatedNumber value={results.tariffAmount} formatter={formatCurrency} />} 
                      icon={<Icons.Tariff />} // Icons.Tariff로 변경
                      isSub={true}
                  />
                  <ResultItem 
                      label="부가가치세" 
                      value={<AnimatedNumber value={results.vatAmount} formatter={formatCurrency} />} 
                      icon={<Icons.Vat />} // Icons.Vat로 변경
                      isSub={true}
                  />
              </div>
          </div>
          
          {/* Fee Group */}
          <div>
              <div 
                  onClick={() => setIsFeesExpanded(!isFeesExpanded)}
                  className="flex items-center justify-between py-3 md:cursor-auto cursor-pointer"
                  role="button"
                  aria-expanded={isFeesExpanded}
              >
                  <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-emerald-100">
                          <Icons.Fee /> {/* Icons.Fee로 변경 */}
                      </div>
                      <span className="ml-4 font-medium text-gray-800">기타 고정 수수료</span> {/* Label slightly changed */}
                  </div>
                  <div className="flex items-center">
                      <span className="font-semibold text-gray-900">
                          <AnimatedNumber value={results.docsFee + results.coFee} formatter={formatCurrency} />
                      </span>
                      <span className={`ml-2 transform transition-transform duration-200 md:hidden ${isFeesExpanded ? 'rotate-180' : ''}`}>
                          <Icons.ChevronDown /> {/* Icons.ChevronDown로 변경 */}
                      </span>
                  </div>
              </div>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFeesExpanded ? 'max-h-40' : 'max-h-0'} md:max-h-40`}>
                  <ResultItem 
                      label="서류비" 
                      value={<AnimatedNumber value={results.docsFee} formatter={formatCurrency} />} 
                      icon={<Icons.DocsFee />} // Icons.DocsFee로 변경
                      isSub={true}
                  />
                  <ResultItem 
                      label="CO발급비" 
                      value={<AnimatedNumber value={results.coFee} formatter={formatCurrency} />} 
                      icon={<Icons.CoFee />} // Icons.CoFee로 변경
                      isSub={true}
                  />
              </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-dashed border-slate-300">
          <h3 className="font-semibold text-gray-700 mb-3">참고 정보</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span className="font-medium text-gray-500">과세표준:</span> <span className="font-mono">{formatCurrency(results.taxableBase)}</span></div>
              <div className="flex justify-between"><span className="font-medium text-gray-500">총 상품가(USD):</span> <span className="font-mono">{formatCurrency(results.totalProductPriceUSD, 'USD')}</span></div>
              <div className="flex justify-between"><span className="font-medium text-gray-500">총 무게:</span> <span className="font-mono">{formatNumber(results.totalWeight, 'kg')}</span></div>
              <div className="flex justify-between"><span className="font-medium text-gray-500">CBM:</span> <span className="font-mono">{formatNumber(results.cbm, '', 4)}</span></div>
          </div>
        </div>
    </div>
  );
};