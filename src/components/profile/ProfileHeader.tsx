'use client';

import { motion } from 'framer-motion';
import { User, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface ProfileHeaderProps {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  memberSince: string;
}

export default function ProfileHeader({ name, email, avatarUrl, memberSince }: ProfileHeaderProps) {
  const displayName = name || email?.split('@')[0] || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-2xl p-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-secondary/5 rounded-full blur-3xl" />

      <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {avatarUrl ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-primary/30">
              <Image src={avatarUrl} alt={displayName} width={96} height={96} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center ring-2 ring-primary/30">
              <span className="text-3xl font-black text-dark">{initial}</span>
            </div>
          )}
        </motion.div>

        {/* Informacion */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
            <h1 className="text-2xl font-bold dark:text-white text-gray-900">{displayName}</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Miembro desde {memberSince}
            </span>
          </div>
          <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">{email}</p>
        </div>

        {/* Boton editar perfil */}
        <Link href="/profile/edit">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl dark:bg-dark-muted bg-gray-100 dark:border-dark-border border-gray-200 dark:text-gray-400 text-gray-600 hover:dark:text-white hover:text-gray-900 hover:border-primary/30 transition-all"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Editar perfil</span>
          </motion.button>
        </Link>
      </div>
    </div>
  );
}
