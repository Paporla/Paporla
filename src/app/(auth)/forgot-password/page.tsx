'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';  // ← CAMBIADO
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';

export default function ForgotPasswordPage() {
  const supabase = supabaseBrowser();  // ← AGREGADO
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
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
          <span className="text-gradient">Revisa tu correo</span>
        </h2>
        <p className="text-gray-400">
          Te enviamos un enlace a <strong className="text-primary">{email}</strong> para restablecer tu contraseña.
        </p>
        <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-1 mt-4">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio de sesión
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
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>
        
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />}
          required
        />
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Cargando...' : 'Enviar enlace'}
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