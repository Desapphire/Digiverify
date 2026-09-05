import React from 'react';

export const DigiVerifyLogo = ({ size = 32, subtitle = "Authority Land Registry System", showText = true, className = "" }) => {
    return (
        <div className={`flex items-center gap-3 ${className}`} style={{ userSelect: 'none' }}>
            <div 
                style={{ 
                    width: size, 
                    height: size, 
                    position: 'relative', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                }}
            >
                {/* Geometric DigiVerify Diamond/Hex Icon */}
                <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="dvGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38BDF8" />
                            <stop offset="100%" stopColor="#0284C7" />
                        </linearGradient>
                        <linearGradient id="dvGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0284C7" />
                            <stop offset="100%" stopColor="#0369A1" />
                        </linearGradient>
                    </defs>
                    
                    {/* Isometric Cube / Hex Shape */}
                    <path 
                        d="M20 3L36 12.2V30.8L20 40L4 30.8V12.2L20 3Z" 
                        fill="#0F172A" 
                        stroke="#0284C7" 
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    {/* Inner polygon facets */}
                    <path 
                        d="M20 3L36 12.2L20 21.5L4 12.2L20 3Z" 
                        fill="url(#dvGrad1)" 
                        fillOpacity="0.9" 
                    />
                    <path 
                        d="M20 21.5L36 12.2V30.8L20 40V21.5Z" 
                        fill="url(#dvGrad2)" 
                        fillOpacity="0.6" 
                    />
                    <path 
                        d="M4 12.2L20 21.5V40L4 30.8V12.2Z" 
                        fill="#0284C7" 
                        fillOpacity="0.3" 
                    />
                    {/* Inner core */}
                    <circle cx="20" cy="21.5" r="3" fill="#38BDF8" />
                </svg>
            </div>

            {showText && (
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                    <span style={{ 
                        fontFamily: 'Inter, system-ui, sans-serif', 
                        fontWeight: 900, 
                        fontSize: size >= 36 ? '1.25rem' : '1.05rem', 
                        letterSpacing: '0.04em', 
                        color: '#FFFFFF' 
                    }}>
                        DIGIVERIFY
                    </span>
                    {subtitle && (
                        <span style={{ 
                            fontSize: '0.62rem', 
                            fontWeight: 500, 
                            color: '#94A3B8', 
                            letterSpacing: '0.02em',
                            marginTop: '2px'
                        }}>
                            {subtitle}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default DigiVerifyLogo;
