import React, { useEffect, useState } from 'react';
import { Download, Monitor, Smartphone, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando como PWA (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detecta iOS (Safari)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructionsModal(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Botão de Instalação na Barra de Navegação */}
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer group"
        title="Instalar o aplicativo no Computador ou Celular"
      >
        <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition">
          <Download className="w-3.5 h-3.5" />
        </div>
        <span className="hidden sm:inline">Instalar Aplicativo</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      {/* Modal com Passo a Passo de Instalação */}
      {showInstructionsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-emerald-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Download className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">
                    Instalar NutriFit
                  </h3>
                  <p className="text-xs text-gray-500">
                    Acesse direto da sua tela inicial ou desktop
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-600">
              {isIOS ? (
                /* Instruções para iPhone / iPad */
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2.5">
                  <div className="flex items-center gap-2 font-black text-emerald-900">
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                    <span>No iPhone ou iPad (Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-gray-700 leading-relaxed font-medium">
                    <li>Toque no botão de <strong>Compartilhar</strong> (ícone com quadrado e seta para cima).</li>
                    <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                    <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
                  </ol>
                </div>
              ) : (
                /* Instruções para Android e Computador */
                <div className="space-y-3">
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2 font-black text-gray-900">
                      <Monitor className="w-4 h-4 text-emerald-700" />
                      <span>No Computador (Chrome / Edge / Brave):</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Clique no ícone de <strong>Instalar</strong> que aparece na barra de endereço do navegador (lado direito, perto da estrela de favoritos) ou clique nos <strong>três pontinhos</strong> &gt; <strong>Instalar NutriFit</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
                    <div className="flex items-center gap-2 font-black text-emerald-900">
                      <Smartphone className="w-4 h-4 text-emerald-700" />
                      <span>No Celular Android (Chrome):</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      Toque nos <strong>três pontinhos</strong> no canto superior do navegador e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>O sistema funcionará como um aplicativo nativo em tela cheia, sem barra de URL.</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

