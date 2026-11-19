import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';
import { Logo } from './Logo';
import { authClient } from '../lib/neon';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-[#f3f9f6] flex flex-col justify-between p-4 sm:p-8 lg:p-12 font-sans relative overflow-x-hidden">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between pb-4">
        <Logo size="md" subtitle="GESTÃO NUTRICIONAL INTEGRADA" align="left" />
        <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/80 border border-emerald-100/90 rounded-full text-xs font-semibold text-emerald-800 shadow-xs backdrop-blur-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Ambiente Seguro e Criptografado</span>
        </div>
      </header>

      {/* Main Content: Split 2 Colunas */}
      <main className="w-full max-w-7xl mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        {/* Coluna Esquerda: Apresentação */}
        <div className="lg:col-span-7 space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-100/60 border border-emerald-200/60 rounded-full text-xs font-bold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Gestão Nutricional de Alta Performance</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-[1.15]">
            Potencialize o atendimento dos seus pacientes.
          </h1>

          <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-xl">
            O <strong>Feriani Nutri</strong> foi desenvolvido sob medida para nutricionistas que buscam excelência clínica, planos alimentares inteligentes e total segurança de dados.
          </p>

          {/* Lista de Recursos com Ícones */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Histórico Clínico e Anamnese</h4>
                <p className="text-xs text-gray-500">Acompanhe a evolução e histórico completo dos seus pacientes.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Prescrição e Planos Alimentares</h4>
                <p className="text-xs text-gray-500">Cálculo de dietas e distribuição de macronutrientes.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Segurança e Privacidade</h4>
                <p className="text-xs text-gray-500">Proteção de dados com criptografia e Row Level Security (RLS).</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Heart className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dedicado a profissionais da saúde e nutrição.</span>
          </div>
        </div>

        {/* Coluna Direita: Card de Login */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
          <div className="bg-white rounded-3xl shadow-xl shadow-emerald-950/5 border border-emerald-100 p-8 sm:p-10">
            {/* Logo interna do Card */}
            <div className="flex flex-col items-center mb-6">
              <Logo size="md" subtitle="GESTÃO NUTRICIONAL INTEGRADA" align="center" />
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-5">
                Bem-vindo de volta
              </h2>
              <p className="text-xs text-gray-500 text-center mt-1">
                Acesse sua área profissional para gerenciar seus pacientes
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  E-mail profissional <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.nome@exemplo.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white hover:bg-gray-50/50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-xs font-medium transition outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Senha <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-white hover:bg-gray-50/50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-xs font-medium transition outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                Não tem conta?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition cursor-pointer"
                >
                  Cadastre-se
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer discreto */}
      <footer className="w-full max-w-7xl mx-auto text-center pt-4 text-[11px] text-gray-400 font-medium">
        Feriani Nutri &copy; {new Date().getFullYear()} — Plataforma de Gestão Nutricional Integrada
      </footer>
    </div>
  );
};
