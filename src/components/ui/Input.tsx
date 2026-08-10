'use client'

import { forwardRef, ReactNode } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, icon, className = '', ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-400 text-gray-500">{icon}</div>
        )}
        <input
          ref={ref}
          className={`
              w-full px-4 py-2.5 rounded-xl
              dark:bg-white/5 bg-white
              dark:border-white/10 border-gray-200
              dark:text-white text-gray-900
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              transition-all duration-200
              ${error ? 'border-red-500 dark:border-red-500/50 focus:ring-red-500/20' : ''}
              ${icon ? 'pl-10' : ''}
              ${className}
            `}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
