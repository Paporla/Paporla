'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';  // ← CAMBIADO
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';

export default function ResetPasswordPage() {
  const supabase = supabaseBrowser();  // ← AGREGADO
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) {
      setError('Enlace inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold">
          <span className="text-gradient">¡Contraseña actualizada!</span>
        </h2>
        <p className="text-gray-400">Tu contraseña ha sido cambiada exitosamente.</p>
        <p className="text-sm text-gray-500">Serás redirigido al inicio de sesión...</p>
        <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-1 mt-2">
          Ir ahora <ArrowLeft className="w-4 h-4" />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-gray-400 text-sm text-center">
          Ingresa tu nueva contraseña.
        </p>
        
        <div className="relative">
          <Input
            label="Nueva contraseña"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-primary"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        
        <Input
          label="Confirmar nueva contraseña"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          required
        />
        
        <div className="text-sm text-gray-400 space-y-1">
          <p>La contraseña debe tener:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Al menos 6 caracteres</li>
          </ul>
        </div>
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar contraseña'}
        </Button>
        
        <div className="text-center">
          <Link href="/login" className="text-sm text-gray-400 hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </form>
      
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </motion.div>
  );
}