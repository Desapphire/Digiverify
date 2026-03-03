import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseStyles = {
        padding: '0.75rem 1.5rem',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '1rem',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.3s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    };

    const variants = {
        primary: {
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
        },
        secondary: {
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
        },
        danger: {
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
        },
        outline: {
            background: 'transparent',
            color: '#fff',
            border: '1px solid var(--border-glass)',
            backdropFilter: 'blur(10px)',
        }
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            style={{ ...baseStyles, ...variants[variant] }}
            className={className}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default Button;
