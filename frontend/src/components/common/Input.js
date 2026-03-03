import React from 'react';

const Input = ({ label, type = 'text', error, ...props }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginBottom: '1rem' }}>
            {label && <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>{label}</label>}
            <input
                type={type}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${error ? 'var(--danger)' : 'var(--border-glass)'}`,
                    color: 'var(--text-main)',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.boxShadow = 'var(--shadow-glow)';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border-glass)';
                    e.target.style.boxShadow = 'none';
                }}
                {...props}
            />
            {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</span>}
        </div>
    );
};

export default Input;
