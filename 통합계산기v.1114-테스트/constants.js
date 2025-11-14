// 모든 기본 설정을 하나의 객체로 통합합니다.
export const DEFAULT_SETTINGS = {
  // --- 1. 공통 고정비 (설정창에서 관리) ---
  DOCS_FEE: 88000,
  CO_FEE: 43700,
  
  // --- 2. 통관비 계산기 설정 (설정창에서 관리) ---
  OCEAN_FREIGHT_RATE_PER_CBM: 110000,
  CBM_WEIGHT_DIVISOR: 250,
  VAT_RATE: 0.1, // 부가세 10%

  // --- 3. 통관비 '관세' 옵션 (기존 CustomsCalculator.js에서 이동) ---
  tariffOptions: [
    { label: '0%', value: '0' },
    { label: '8%', value: '8' },
    // { label: '13%', value: '13' }, // 나중에 설정창에서 이 배열을 직접 수정
  ],

  // --- 4. 수입가 계산기 옵션 (기존 ImportCalculator.js에서 이동) ---
  commissionRateOptions: [
    { label: '3.5%', value: '0.035' },
    { label: '0%', value: '0' }
  ],
  customsFeeRateOptions: [
    { label: '22%', value: '0.22' },
    { label: '29%', value: '0.29' }
  ],
  packagingBagOptions: [
    { label: '4호-기본', value: '0.31' },
    { label: '아우터', value: '0.46' },
    { label: '없음', value: '0' }
  ],
  labelOptions: [
    { label: '일반라벨', value: '0.03' },
    { label: '없음', value: '0' }
  ],

  // --- 5. 선적 계산기 (이 값들은 수정 대상이 아님) ---
  CONTAINER_DIMENSIONS: {
    FT20: { length: 5898, width: 2352, height: 2393 },
    FT40: { length: 12032, width: 2352, height: 2393 },
  },
  PALLET_TYPES: {
    'none': { name: '없음', length: 0, width: 0, height: 0 },
    '1100x1100': { name: '1100x1100', length: 1100, width: 1100, height: 150 },
    '1000x1200': { name: '1000x1200', length: 1000, width: 1200, height: 150 },
    '800x1200': { name: '800x1200', length: 800, width: 1200, height: 150 },
    '1140x1140': { name: '1140x1140', length: 1140, width: 1140, height: 150 },
  }
};