import React, { useState, useMemo } from 'react';
import { Maximize2, Plus, Minus, Compass, Layers, MapPin } from 'lucide-react';

// Math utility to convert latitude & longitude to Slippy Map tile indices (x, y)
const lon2tile = (lon, zoom) => Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
const lat2tile = (lat, zoom) => Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, zoom)
);

export const CadastralSatelliteMap = ({
    geoLat = 12.9716,
    geoLng = 77.5946,
    areaSize = "2,500 sqft",
    surveyNumber = "SRV-2322",
    className = ""
}) => {
    const [zoom, setZoom] = useState(16);
    const [mapMode, setMapMode] = useState('satellite'); // 'satellite', 'dark', 'hybrid'
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

    const numLat = parseFloat(geoLat) || 12.9716;
    const numLng = parseFloat(geoLng) || 77.5946;

    // Calculate center tile coordinates
    const centerTile = useMemo(() => {
        const x = lon2tile(numLng, zoom);
        const y = lat2tile(numLat, zoom);
        return { x, y, z: zoom };
    }, [numLat, numLng, zoom]);

    // Build 3x3 tile grid around center tile
    const tiles = useMemo(() => {
        const grid = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                grid.push({
                    x: centerTile.x + dx,
                    y: centerTile.y + dy,
                    z: centerTile.z,
                    gridX: dx + 1,
                    gridY: dy + 1,
                });
            }
        }
        return grid;
    }, [centerTile]);

    // Format coordinates
    const latFormatted = `${Math.abs(numLat).toFixed(4)}° ${numLat >= 0 ? 'N' : 'S'}`;
    const lngFormatted = `${Math.abs(numLng).toFixed(4)}° ${numLng >= 0 ? 'E' : 'W'}`;

    const getTileUrl = (tile) => {
        if (mapMode === 'dark') {
            return `https://basemaps.cartocdn.com/dark_all/${tile.z}/${tile.x}/${tile.y}.png`;
        }
        // Esri World Imagery high-res satellite
        return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tile.z}/${tile.y}/${tile.x}`;
    };

    return (
        <div 
            className={`digi-card ${className}`}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '520px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#090D16',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Header Bar */}
            <div 
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '1rem 1.25rem',
                    background: 'linear-gradient(180deg, rgba(9, 13, 22, 0.9) 0%, rgba(9, 13, 22, 0) 100%)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 20,
                    pointerEvents: 'none'
                }}
            >
                <div style={{ pointerEvents: 'auto' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', margin: 0 }}>
                        Interactive High-Resolution Cadastral Map
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: 0, marginTop: '2px' }}>
                        Live Satellite Feed • Zoom Level {zoom}
                    </p>
                </div>

                {/* Coordinates Tag Badge */}
                <div 
                    style={{
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(9, 13, 22, 0.85)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 600,
                        color: '#E2E8F0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}
                >
                    <MapPin size={12} style={{ color: '#00E5FF' }} />
                    {latFormatted}, {lngFormatted}
                </div>
            </div>

            {/* Satellite Map Canvas Container */}
            <div 
                style={{ 
                    position: 'relative', 
                    flex: 1, 
                    width: '100%', 
                    overflow: 'hidden',
                    background: '#0B111E'
                }}
            >
                {/* 3x3 Real Slippy Satellite Tiles Grid */}
                <div 
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '768px',
                        height: '768px',
                        transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px)`,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 256px)',
                        gridTemplateRows: 'repeat(3, 256px)',
                        filter: mapMode === 'satellite' ? 'contrast(1.1) brightness(0.95)' : 'none'
                    }}
                >
                    {tiles.map((tile) => (
                        <div 
                            key={`${tile.z}-${tile.x}-${tile.y}`}
                            style={{
                                width: '256px',
                                height: '256px',
                                backgroundImage: `url('${getTileUrl(tile)}')`,
                                backgroundSize: '256px 256px',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                backgroundColor: '#090D16'
                            }}
                        />
                    ))}
                </div>

                {/* Cadastral Polygon Layer */}
                <svg 
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                    viewBox="0 0 500 450"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <filter id="cadastralNeon" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00E5FF" floodOpacity="0.8" />
                            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#00E5FF" floodOpacity="0.4" />
                        </filter>
                    </defs>

                    {/* Cadastral Boundaries */}
                    <polygon 
                        points="175,130 340,190 265,330 115,250"
                        fill="rgba(2, 132, 199, 0.18)"
                        stroke="#0284C7"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />

                    {/* Boundary Vertices */}
                    {[
                        [175, 130],
                        [340, 190],
                        [265, 330],
                        [115, 250]
                    ].map(([vx, vy], i) => (
                        <g key={i}>
                            <circle cx={vx} cy={vy} r="5" fill="#0284C7" fillOpacity="0.4" />
                            <circle cx={vx} cy={vy} r="3" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.5" />
                        </g>
                    ))}
                </svg>

                {/* Center Area Pill Tag */}
                <div 
                    style={{
                        position: 'absolute',
                        top: '52%',
                        left: '46%',
                        transform: 'translate(-50%, -50%)',
                        background: '#0F172A',
                        border: '1px solid #334155',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#F8FAFC',
                        zIndex: 15,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}
                >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38BDF8' }}></span>
                    {areaSize}
                </div>

                {/* Right Map Toolbar Controls */}
                <div 
                    style={{
                        position: 'absolute',
                        top: '4.5rem',
                        right: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        zIndex: 20
                    }}
                >
                    <button
                        onClick={() => setZoom(prev => Math.min(prev + 1, 18))}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'rgba(9, 13, 22, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                        title="Zoom In"
                    >
                        <Plus size={16} />
                    </button>
                    <button
                        onClick={() => setZoom(prev => Math.max(prev - 1, 13))}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'rgba(9, 13, 22, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                        title="Zoom Out"
                    >
                        <Minus size={16} />
                    </button>
                    <button
                        onClick={() => setMapMode(mapMode === 'satellite' ? 'dark' : 'satellite')}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'rgba(9, 13, 22, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: mapMode === 'dark' ? '#00E5FF' : '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                        title="Toggle Layer"
                    >
                        <Layers size={16} />
                    </button>
                    <button
                        onClick={() => { setZoom(16); setPanOffset({ x: 0, y: 0 }); }}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'rgba(9, 13, 22, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                        title="Recenter"
                    >
                        <Compass size={16} />
                    </button>
                </div>

                {/* Bottom Attribution */}
                <div 
                    style={{
                        position: 'absolute',
                        bottom: '0.75rem',
                        left: '1rem',
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.65rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontFamily: 'sans-serif'
                    }}
                >
                    <span style={{ fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>Esri & ArcGIS</span>
                    <span style={{ opacity: 0.6 }}>| Cadastral Parcel #{surveyNumber}</span>
                </div>
            </div>
        </div>
    );
};

export default CadastralSatelliteMap;
