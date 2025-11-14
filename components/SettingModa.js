import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext.js';

// --- 단일 설정 항목을 위한 재사용 컴포넌트 ---
const SettingInput = ({ label, description, name, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
            {label}
        </label>
        <div className="mt-1 relative">
            <input
                type="number"
                id={name}
                name={name}
                value={value}
                onChange={(e) => onChange(name, e.target.value)}
                step="any"
                className="w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
        </div>
        {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
    </div>
);

// --- 옵션 배열을 관리하기 위한 재사용 컴포넌트 ---
const ArrayOptionEditor = ({ title, options, onChange }) => {
    
    // 배열 내의 특정 항목(label 또는 value)이 변경될 때
    const handleItemChange = (index, field, newValue) => {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], [field]: newValue };
        onChange(newOptions);
    };

    // 항목 삭제
    const handleRemoveItem = (index) => {
        const newOptions = options.filter((_, i) => i !== index);
        onChange(newOptions);
    };

    // 새 항목 추가
    const handleAddItem = () => {
        const newOptions = [...options, { label: '새 항목', value: '0' }];
        onChange(newOptions);
    };

    return (
        <div className="space-y-4">
            <h4 className="text-md font-semibold text-gray-800">{title}</h4>
            <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                {options.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                        <div className="md:col-span-3">
                            <label className="text-xs font-medium text-gray-500">표시명 (Label)</label>
                            <input
                                type="text"
                                value={item.label}
                                onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                                className="w-full rounded-md border-gray-300 py-1.5 px-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                placeholder="예: 8%"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-medium text-gray-500">값 (Value)</label>
                            <input
                                type="text"
                                value={item.value}
                                onChange={(e) => handleItemChange(index, 'value', e.target.value)}
                                className="w-full rounded-md border-gray-300 py-1.5 px-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                placeholder="예: 8 또는 0.08"
                            />
                        </div>
                        <div className="md:col-span-1 flex items-end h-full">
                            <button
                                onClick={() => handleRemoveItem(index)}
                                className="w-full text-red-600 hover:text-red-800 text-sm font-medium py-1.5 px-2"
                                title="삭제"
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={handleAddItem}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-800"
            >
                + 옵션 추가하기
            </button>
        </div>
    );
};


// --- 메인 설정 모달 컴포넌트 ---
export const SettingsModal = ({ show, onClose }) => {
    const { settings, saveSettings, resetSettings } = useSettings();
    // 모달 내부에서만 사용할 임시 설정 상태 (저장 눌러야 반영)
    const [localSettings, setLocalSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState('common');

    // 모달이 열리거나, 외부의 'settings'가 변경(초기화 등)될 때 로컬 상태를 동기화
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings, show]);

    if (!show) return null;

    // --- 핸들러 ---

    // SettingInput의 변경 핸들러 (숫자 변환)
    const handleSimpleChange = (name, value) => {
        const numericValue = parseFloat(value);
        setLocalSettings(prev => ({
            ...prev,
            [name]: isNaN(numericValue) ? 0 : numericValue,
        }));
    };

    // ArrayOptionEditor의 변경 핸들러
    const handleOptionsChange = (name, newOptions) => {
        setLocalSettings(prev => ({
            ...prev,
            [name]: newOptions,
        }));
    };

    // 저장
    const handleSave = () => {
        saveSettings(localSettings); // Context의 saveSettings 호출
        onClose();
    };

    // 취소
    const handleCancel = () => {
        onClose();
        setLocalSettings(settings); // 변경사항 버리고 원래 설정으로 복구
    };

    // 초기화
    const handleReset = () => {
        // useSettings 훅의 resetSettings를 바로 호출
        // (confirm 창은 useSettings 내부에 구현되어 있음)
        resetSettings();
        // Context가 변경되면 useEffect가 실행되어 localSettings도
        // 자동으로 초기화된 값으로 동기화됩니다.
    };
    
    // --- 탭 UI ---
    const tabs = [
        { id: 'common', label: '공통/통관비' },
        { id: 'import', label: '수입가 옵션' }
    ];

    const TabButton = ({ id, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm font-semibold ${
                activeTab === id
                    ? 'text-emerald-600 border-b-2 border-emerald-500'
                    : 'text-gray-500 hover:text-gray-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={handleCancel}>
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-3xl animate-fade-in-slide-up overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* --- 모달 헤더 --- */}
                <div className="flex justify-between items-center border-b p-5">
                    <h2 className="text-xl font-bold text-gray-800">설정 관리</h2>
                    <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                {/* --- 탭 --- */}
                <div className="border-b border-gray-200 px-5">
                    <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                        {tabs.map(tab => (
                            <TabButton key={tab.id} id={tab.id} label={tab.label} />
                        ))}
                    </nav>
                </div>

                {/* --- 모달 본문 (스크롤) --- */}
                <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                    
                    {/* --- 공통/통관비 탭 --- */}
                    <div className={activeTab === 'common' ? 'block' : 'hidden'}>
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">공통 고정비</h3>
                            <SettingInput
                                label="서류비 (DOCS_FEE)"
                                name="DOCS_FEE"
                                value={localSettings.DOCS_FEE}
                                onChange={handleSimpleChange}
                            />
                            <SettingInput
                                label="CO발급비 (CO_FEE)"
                                name="CO_FEE"
                                value={localSettings.CO_FEE}
                                onChange={handleSimpleChange}
                            />
                            
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 pt-4">통관비 계산기 설정</h3>
                            <SettingInput
                                label="CBM당 해운비 (OCEAN_FREIGHT_RATE_PER_CBM)"
                                name="OCEAN_FREIGHT_RATE_PER_CBM"
                                value={localSettings.OCEAN_FREIGHT_RATE_PER_CBM}
                                onChange={handleSimpleChange}
                            />
                            <SettingInput
                                label="CBM 환산 기준 (CBM_WEIGHT_DIVISOR)"
                                name="CBM_WEIGHT_DIVISOR"
                                value={localSettings.CBM_WEIGHT_DIVISOR}
                                onChange={handleSimpleChange}
                                description="총 무게(kg)를 이 값으로 나누어 CBM을 계산합니다."
                            />
                            <SettingInput
                                label="부가가치세율 (VAT_RATE)"
                                name="VAT_RATE"
                                value={localSettings.VAT_RATE}
                                onChange={handleSimpleChange}
                                description="10%일 경우 0.1, 8%일 경우 0.08을 입력하세요."
                            />
                            
                            <ArrayOptionEditor
                                title="관세율(%) 옵션 (tariffOptions)"
                                options={localSettings.tariffOptions}
                                onChange={(newOptions) => handleOptionsChange('tariffOptions', newOptions)}
                            />
                        </div>
                    </div>

                    {/* --- 수입가 옵션 탭 --- */}
                    <div className={activeTab === 'import' ? 'block' : 'hidden'}>
                        <div className="space-y-6">
                            <ArrayOptionEditor
                                title="수수료 옵션 (commissionRateOptions)"
                                options={localSettings.commissionRateOptions}
                                onChange={(newOptions) => handleOptionsChange('commissionRateOptions', newOptions)}
                            />
                            <ArrayOptionEditor
                                title="통관비 옵션 (customsFeeRateOptions)"
                                options={localSettings.customsFeeRateOptions}
                                onChange={(newOptions) => handleOptionsChange('customsFeeRateOptions', newOptions)}
                            />
                            <ArrayOptionEditor
                                title="포장봉투 옵션 (packagingBagOptions)"
                                options={localSettings.packagingBagOptions}
                                onChange={(newOptions) => handleOptionsChange('packagingBagOptions', newOptions)}
                            />
                            <ArrayOptionEditor
                                title="라벨 옵션 (labelOptions)"
                                options={localSettings.labelOptions}
                                onChange={(newOptions) => handleOptionsChange('labelOptions', newOptions)}
                            />
                        </div>
                    </div>