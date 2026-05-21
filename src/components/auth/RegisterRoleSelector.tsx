'use client'

import { motion } from 'framer-motion'
import { CheckCircle, UserCheck, Store as StoreIcon } from 'lucide-react'

interface Props {
  role: 'user' | 'comercio'
  onChange: (role: 'user' | 'comercio') => void
}

export default function RegisterRoleSelector({ role, onChange }: Props) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium dark:text-gray-300 text-gray-700">Elige tu tipo de cuenta</label>
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange('user')}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${
            role === 'user'
              ? 'border-primary bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/20'
              : 'dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-100 hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-xl ${role === 'user' ? 'bg-primary/20' : 'dark:bg-white/10 bg-gray-200'} flex items-center justify-center`}>
              <UserCheck className={`w-5 h-5 ${role === 'user' ? 'text-primary' : 'dark:text-gray-500 text-gray-400'}`} />
            </div>
            {role === 'user' && <CheckCircle className="w-4 h-4 text-primary" />}
          </div>
          <div className={`font-semibold ${role === 'user' ? 'text-primary' : 'dark:text-white text-gray-900'}`}>Usuario</div>
          <p className="text-xs dark:text-gray-400 text-gray-600 mt-1">Reserva packs sorpresa</p>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange('comercio')}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${
            role === 'comercio'
              ? 'border-primary bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/20'
              : 'dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-100 hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-xl ${role === 'comercio' ? 'bg-primary/20' : 'dark:bg-white/10 bg-gray-200'} flex items-center justify-center`}>
              <StoreIcon className={`w-5 h-5 ${role === 'comercio' ? 'text-primary' : 'dark:text-gray-500 text-gray-400'}`} />
            </div>
            {role === 'comercio' && <CheckCircle className="w-4 h-4 text-primary" />}
          </div>
          <div className={`font-semibold ${role === 'comercio' ? 'text-primary' : 'dark:text-white text-gray-900'}`}>Comercio</div>
          <p className="text-xs dark:text-gray-400 text-gray-600 mt-1">Vende tus excedentes</p>
        </motion.button>
      </div>
    </div>
  )
}
