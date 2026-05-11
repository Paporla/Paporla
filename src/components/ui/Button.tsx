'use client';

import { motion, MotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps extends MotionProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const variants = {
  primary: 'bg-gradient-to-r from-primary to-primary/80 text-white hover:shadow-lg hover:shadow-primary/25',
  secondary: 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700',
  outline: 'border-2 border-primary text-primary hover:bg-primary/10',
  ghost: 'text-gray-600 dark:text-gray-400 hover:bg-white/10',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 rounded-lg',
  lg: 'px-6 py-3 rounded-xl text-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon,
  onClick,
  type = 'button',
  ...motionProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        font-medium transition-all duration-300
        flex items-center justify-center gap-2
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...motionProps}
    >
      {loading && (
        <svg 
          className="animate-spin h-4 w-4 text-current" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && icon && <span className="inline-flex">{icon}</span>}
      {loading ? 'Cargando...' : children}
    </motion.button>
  );
}