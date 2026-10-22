import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { authClient } from './lib/neon';
import { Loader2 } from 'lucide-react';

export function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Checar e restaurar a sessão ativa
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const res = await (authClient as any).getSession();
        if (isMounted) {
          if (res?.data?.session && res?.data?.user) {
            setSession(res.data);
          } else {
            setSession(null);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthSuccess = async () => {
    try {
      setIsInitializing(true);
      const res = await (authClient as any).getSession();
      if (res?.data?.session && res?.data?.user) {
        setSession(res.data);
      } else {
        // Fallback rápido
        window.location.reload();
      }
    } catch {
      window.location.reload();
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await (authClient as any).signOut();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setSession(null);
      setAuthMode('login');
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7faf8] text-emerald-800 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
        <span className="text-sm font-semibold tracking-wide text-emerald-950">
          Carregando NutriFit...
        </span>
      </div>
    );
  }

  // Se já logado, redirecionar para o dashboard
  if (session?.user) {
    return <Dashboard user={session.user} onLogout={handleLogout} />;
  }

  // Telas de Autenticação (Prompt 2)
  if (authMode === 'register') {
    return (
      <Register
        onSwitchToLogin={() => setAuthMode('login')}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <Login
      onSwitchToRegister={() => setAuthMode('register')}
      onSuccess={handleAuthSuccess}
    />
  );
}

export default App;
