// --- From constants.ts ---
// 'export' 키워드를 모두 삭제합니다.
const DOCS_FEE = 88000;
const CO_FEE = 43700;
const OCEAN_FREIGHT_RATE_PER_CBM = 110000;
const CBM_WEIGHT_DIVISOR = 250;
const VAT_RATE = 0.1;

const COMMISSION_RATE_HIGH = 0.035;
const COMMISSION_RATE_LOW = 0;
const CUSTOMS_FEE_RATE_HIGH = 0.29;
const CUSTOMS_FEE_RATE_LOW = 0.22;

const PACKAGING_BAG_DEFAULT = 0.31;
const PACKAGING_BAG_OUTER = 0.46;
const PACKAGING_BAG_NONE = 0;
const LABEL_DEFAULT = 0.03;
const LABEL_NONE = 0;

const CONTAINER_DIMENSIONS = {
  FT20: { length: 5898, width: 2352, height: 2393 },
  FT40: { length: 12032, width: 2352, height: 2393 },
};
const PALLET_TYPES = {
    'none': { name: '없음', length: 0, width: 0, height: 0 },
    '1100x1100': { name: '1100x1100', length: 1100, width: 1100, height: 150 },
    '1000x1200': { name: '1000x1200', length: 1000, width: 1200, height: 150 },
    '800x1200': { name: '800x1200', length: 800, width: 1200, height: 150 },
    '1140x1140': { name: '1140x1140', length: 1140, width: 1140, height: 150 },
};