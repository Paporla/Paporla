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
      <label className="text-sm font-medium text-gray-300">Elige tu tipo de cuenta</label>
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange('user')}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${
            role === 'user'
              ? 'border-primary bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/20'
              : 'border-white/10 bg-white/5 hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl ${role === 'user' ? 'bg-primary/20' : 'bg-white/10'} flex items-center justify-center`}>
              <UserCheck className={`w-5 h-5 ${role === 'user' ? 'text-primary' : 'text-gray-500'}`} />
            </div>
            {role === 'user' && <CheckCircle className="w-4 h-4 text-primary" />}
          </div>
          <div className={`font-semibold ${role === 'user' ? 'text-primary' : 'text-white'}`}>Usuario</div>
          <p className="text-xs text-gray-400 mt-1">Reserva packs sorpresa</p>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange('comercio')}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${
            role === 'comercio'
              ? 'border-primary bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/20'
              : 'border-white/10 bg-white/5 hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl ${role === 'comercio' ? 'bg-primary/20' : 'bg-white/10'} flex items-center justify-center`}>
              <StoreIcon className={`w-5 h-5 ${role === 'comercio' ? 'text-primary' : 'text-gray-500'}`} />
            </div>
            {role === 'comercio' && <CheckCircle className="w-4 h-4 text-primary" />}
          </div>
          <div className={`font-semibold ${role === 'comercio' ? 'text-primary' : 'text-white'}`}>Comercio</div>
          <p className="text-xs text-gray-400 mt-1">Vende tus excedentes</p>
        </motion.button>
      </div>
    </div>
  )
}
