import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Logo } from './Logo';
import { authClient } from '../lib/neon';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    try {
      setLoading(true);
      const res = await (authClient as any).signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.error) {
        const msg = res.error.message || '';
        if (msg.includes('Invalid password') || msg.includes('credentials') || msg.includes('INVALID_EMAIL_OR_PASSWORD')) {
          setError('Email ou senha incorretos. Verifique suas credenciais.');
        } else if (msg.includes('User not found')) {
          setError('Nenhum usuário cadastrado com este e-mail.');
        } else if (msg.includes('Invalid origin')) {
          setError('Origem da requisição não autorizada pelo servidor de autenticação.');
        } else {
          setError(msg || 'Falha ao autenticar. Tente novamente.');
        }
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Erro de conexão com o serviço de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50">
      <div className="w-full max-w-md">
        {/* Brand Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-emerald-950/5 border border-emerald-100/80 p-8 sm:p-10 backdrop-blur-sm">
          <div className="mb-8">
            <Logo size="lg" subtitle="Gestão Clínica Inteligente" />
            <div className="mt-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Acesse sua conta
              </h1>
              <p className="text-sm text-gray-500 mt-1.5">
                Bem-vinda(o) de volta! Insira suas credenciais.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600/70">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium transition duration-150 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Senha
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600/70">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium transition duration-150 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Não tem conta?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition cursor-pointer"
              >
                Cadastre-se
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
