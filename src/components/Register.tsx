import React, { useState } from 'react';
import { User, Mail, Lock, CheckCircle2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Logo } from './Logo';
import { authClient, sql } from '../lib/neon';

interface RegisterProps {
  onSwitchToLogin: () => void;
  onSuccess: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!trimmedName || !cleanEmail || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 9) {
      setError('A senha deve ter no mínimo 9 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);

      // 1. Cadastrar no Neon Auth
      const res = await (authClient as any).signUp.email({
        email: cleanEmail,
        password,
        name: trimmedName,
      });

      if (res.error) {
        if (res.error.message?.includes('already exists') || res.error.message?.includes('unique')) {
          setError('Este email já está cadastrado no sistema.');
        } else {
          setError(res.error.message || 'Falha ao criar conta. Tente novamente.');
        }
        return;
      }

      const userId = res.data?.user?.id;

      // 2. Garantir inserção do nutricionista na tabela public.nutricionistas
      try {
        if (userId) {
          await sql.query(
            `INSERT INTO public.nutricionistas (id, nome, email, created_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome`,
            [userId, trimmedName, cleanEmail]
          );
        } else {
          await sql.query(
            `INSERT INTO public.nutricionistas (nome, email, created_at)
             VALUES ($1, $2, now())
             ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome`,
            [trimmedName, cleanEmail]
          );
        }
      } catch (dbErr) {
        console.warn('Registro na tabela nutricionistas (já pode ter sido inserido via trigger ou sessão):', dbErr);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err?.message || 'Erro inesperado ao registrar nutricionista.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl shadow-emerald-950/5 border border-emerald-100/80 p-8 sm:p-10 backdrop-blur-sm">
          <div className="mb-8">
            <Logo size="lg" subtitle="Gestão Clínica Inteligente" />
            <div className="mt-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Crie sua conta
              </h1>
              <p className="text-sm text-gray-500 mt-1.5">
                Comece a transformar a gestão dos seus atendimentos
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600/70">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dra. Juliana Mendes"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium transition duration-150 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                E-mail Profissional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600/70">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nutri@consultorio.com"
                  autoComplete="email"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium transition duration-150 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Senha (mínimo 9 caracteres)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600/70">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  autoComplete="new-password"
                  required
                  minLength={9}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium transition duration-150 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600/70">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="•••••••••"
                  autoComplete="new-password"
                  required
                  minLength={9}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium transition duration-150 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Criando conta...</span>
                </>
              ) : (
                <>
                  <span>Criar conta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Já tem conta?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition cursor-pointer"
              >
                Faça login
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          NutriFit &copy; {new Date().getFullYear()} — Plataforma Segura para Nutricionistas
        </p>
      </div>
    </div>
  );
};
