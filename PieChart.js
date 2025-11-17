// 'import React'와 'export' 키워드를 모두 삭제합니다.

// --- Gemini Feature: Pie Chart Component ---
const PieChart = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return <div className="flex items-center justify-center h-48 text-gray-500">데이터가 없습니다.</div>;
    }

    let cumulative = 0;
    const paths = data.map(item => {
        const percentage = item.value / total;
        const startAngle = (cumulative / total) * 360;
        cumulative += item.value;
        const endAngle = (cumulative / total) * 360;
        
        const largeArcFlag = percentage > 0.5 ? 1 : 0;
        const startX = 50 + 40 * Math.cos(Math.PI * (startAngle - 90) / 180);
        const startY = 50 + 40 * Math.sin(Math.PI * (startAngle - 90) / 180);
        const endX = 50 + 40 * Math.cos(Math.PI * (endAngle - 90) / 180);
        const endY = 50 + 40 * Math.sin(Math.PI * (endAngle - 90) / 180);

        const d = `M 50,50 L ${startX},${startY} A 40,40 0 ${largeArcFlag},1 ${endX},${endY} Z`;
        return <path key={item.label} d={d} fill={item.color} />;
    });

    return (
        <div className="flex flex-col md:flex-row items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-48 h-48 flex-shrink-0">
                {paths}
            </svg>
            <div className="w-full">
                <ul className="space-y-2 text-sm">
                    {data.map(item => (
                        <li key={item.label} className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                                <span className="text-gray-600">{item.label}</span>
                            </div>
                            <span className="font-semibold text-gray-800">{((item.value / total) * 100).toFixed(1)}%</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};