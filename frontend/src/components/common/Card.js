import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '', hoverable = false, ...props }) => {
    const cardContent = (
        <div className={`glass-panel ${className}`} style={{ padding: '1.5rem', ...props.style }}>
            {children}
        </div>
    );

    if (hoverable) {
        return (
            <motion.div
                whileHover={{ translateY: -5, boxShadow: 'var(--shadow-glow)' }}
                transition={{ duration: 0.2 }}
                className="card-wrapper"
                {...props}
            >
                {cardContent}
            </motion.div>
        );
    }

    return cardContent;
};

export default Card;
