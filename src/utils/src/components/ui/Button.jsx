// src/components/ui/Button.jsx
import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', icon, disabled = false }) => {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
    
    const variants = {
        primary: "bg-wiz-green hover:bg-wiz-green_dark text-white focus:ring-wiz-green hover:shadow-md hover:-translate-y-0.5",
        accent: "bg-gradient-to-r from-wiz-orange to-[#fca545] hover:from-wiz-orange_dark hover:to-wiz-orange text-white focus:ring-wiz-orange shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-wiz-orange/20",
        secondary: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-gray-200 hover:shadow-sm",
        danger: "bg-red-50 dark:bg-red-900/30 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-100 dark:border-red-800 focus:ring-red-500",
        ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 focus:ring-gray-500 shadow-none border border-transparent",
    };

    return (
        <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
            {icon && <i className={icon}></i>}
            {children}
        </button>
    );
};
