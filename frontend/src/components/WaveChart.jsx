import React, { useState, useMemo } from 'react';

export const WaveChart = ({ properties = [], sales = [], height = 180, className = "" }) => {
    const [hoverIndex, setHoverIndex] = useState(null);
    const [timeframe, setTimeframe] = useState('30D');

    // Generate dynamic chart data based on real records
    const dataPoints = useMemo(() => {
        const pointsCount = 10;
        const now = Date.now();
        const daysMap = { '24H': 1, '7D': 7, '30D': 30, '1Y': 365 };
        const durationDays = daysMap[timeframe] || 30;
        const intervalMs = (durationDays * 24 * 60 * 60 * 1000) / (pointsCount - 1);

        const totalProps = properties.length;
        const totalSales = sales.length;

        const points = [];
        for (let i = 0; i < pointsCount; i++) {
            const pointTime = new Date(now - (pointsCount - 1 - i) * intervalMs);
            const label = durationDays <= 1 
                ? pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : pointTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

            // Count real items created up to this point in time
            const propsUpToTime = properties.filter(p => new Date(p.createdAt || now) <= pointTime).length;
            const salesUpToTime = sales.filter(s => new Date(s.createdAt || now) <= pointTime).length;

            // Calculate SVG Y coordinates (inverted scale: 0 is top, 200 is bottom)
            const basePropVal = totalProps > 0 ? (propsUpToTime / totalProps) : (i + 1) / pointsCount;
            const baseSaleVal = totalSales > 0 ? (salesUpToTime / totalSales) : (i + 1) / pointsCount;

            const y1 = Math.max(30, Math.min(180, 180 - basePropVal * 130 - Math.sin(i * 0.7) * 15));
            const y2 = Math.max(40, Math.min(190, 190 - baseSaleVal * 120 - Math.cos(i * 0.7) * 20));

            points.push({
                label,
                y1,
                y2,
                titleCount: totalProps > 0 ? propsUpToTime : (i * 3 + 1),
                txCount: totalSales > 0 ? salesUpToTime : Math.floor(i * 1.5)
            });
        }
        return points;
    }, [properties, sales, timeframe]);

    const width = 1000;
    const stepX = width / (dataPoints.length - 1);

    const makePath = (key) => {
        if (!dataPoints.length) return '';
        let d = `M 0 ${dataPoints[0][key]}`;
        for (let i = 0; i < dataPoints.length - 1; i++) {
            const x0 = i * stepX;
            const y0 = dataPoints[i][key];
            const x1 = (i + 1) * stepX;
            const y1 = dataPoints[i + 1][key];
            const mx = (x0 + x1) / 2;
            d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
        }
        return d;
    };

    const path1 = makePath('y1');
    const path2 = makePath('y2');
    const areaPath1 = `${path1} L ${width} 220 L 0 220 Z`;
    const areaPath2 = `${path2} L ${width} 220 L 0 220 Z`;

    return (
        <div 
            className={`digi-card p-6 ${className}`} 
            style={{ 
                background: '#0F172A',
                border: '1px solid #1E293B',
                borderRadius: '12px',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Header / Legend & Timeframe Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284C7' }}></span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F8FAFC' }}>Title Registrations ({properties.length})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8' }}></span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8' }}>Settlement Throughput ({sales.length})</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.25rem', background: '#0B0F19', padding: '3px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                    {['24H', '7D', '30D', '1Y'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                border: 'none',
                                background: timeframe === t ? '#0284C7' : 'transparent',
                                color: timeframe === t ? '#FFFFFF' : '#94A3B8',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dual Wave Chart ViewBox */}
            <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
                <svg 
                    viewBox="0 0 1000 220" 
                    preserveAspectRatio="none" 
                    style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="waveArea1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284C7" stopOpacity="0.2" />
                            <stop offset="80%" stopColor="#0284C7" stopOpacity="0.02" />
                            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="waveArea2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.15" />
                            <stop offset="80%" stopColor="#38BDF8" stopOpacity="0.01" />
                            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                        </linearGradient>
                        
                        <linearGradient id="waveStroke1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#0284C7" />
                            <stop offset="100%" stopColor="#38BDF8" />
                        </linearGradient>
                        <linearGradient id="waveStroke2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#0369A1" />
                            <stop offset="100%" stopColor="#0284C7" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line x1="0" y1="50" x2="1000" y2="50" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="0" y1="110" x2="1000" y2="110" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="0" y1="170" x2="1000" y2="170" stroke="#1E293B" strokeDasharray="3 3" />

                    {/* Wave 2 */}
                    <path d={areaPath2} fill="url(#waveArea2)" />
                    <path d={path2} fill="none" stroke="url(#waveStroke2)" strokeWidth="2" />

                    {/* Wave 1 */}
                    <path d={areaPath1} fill="url(#waveArea1)" />
                    <path 
                        d={path1} 
                        fill="none" 
                        stroke="url(#waveStroke1)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                    />

                    {/* Interactive points */}
                    {dataPoints.map((pt, idx) => {
                        const cx = idx * stepX;
                        const cy = pt.y1;
                        const isSelected = hoverIndex === idx;

                        return (
                            <g key={idx} onMouseEnter={() => setHoverIndex(idx)} onMouseLeave={() => setHoverIndex(null)} style={{ cursor: 'pointer' }}>
                                {isSelected && (
                                    <>
                                        <line x1={cx} y1="0" x2={cx} y2="220" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" />
                                        <circle cx={cx} cy={cy} r="6" fill="#0284C7" fillOpacity="0.3" />
                                    </>
                                )}
                                <circle 
                                    cx={cx} 
                                    cy={cy} 
                                    r={isSelected ? 4.5 : 3} 
                                    fill="#0F172A" 
                                    stroke="#0284C7" 
                                    strokeWidth={isSelected ? "2.5" : "1.5"} 
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Hover Tooltip Card */}
                {hoverIndex !== null && dataPoints[hoverIndex] && (
                    <div 
                        style={{
                            position: 'absolute',
                            left: `${(hoverIndex / (dataPoints.length - 1)) * 90 + 5}%`,
                            top: '10px',
                            transform: 'translateX(-50%)',
                            background: '#0F172A',
                            border: '1px solid #1E293B',
                            borderRadius: '8px',
                            padding: '0.5rem 0.75rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            pointerEvents: 'none',
                            zIndex: 20
                        }}
                    >
                        <p style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600 }}>{dataPoints[hoverIndex].label}</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38BDF8' }}>
                            {dataPoints[hoverIndex].titleCount} Titles Recorded
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>
                            {dataPoints[hoverIndex].txCount} Settlements
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaveChart;
