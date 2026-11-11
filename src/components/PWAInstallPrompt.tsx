import React, { useEffect, useState } from 'react';
import { Download, Monitor, Smartphone, X, CheckCircle2, Copy, Check, Sparkles } from 'lucide-react';

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
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'computador' | 'celular'>('computador');
  const [copiedLink, setCopiedLink] = useState(false);
  const [mobileUrl, setMobileUrl] = useState('');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando como app instalado
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    setMobileUrl(window.location.origin);

    // Recupera se o evento foi capturado antecipadamente no index.html
    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
    }

    const onPromptReady = () => {
      if ((window as any).deferredPWAInstallPrompt) {
        setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      }
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
      setShowModal(false);
    };

    window.addEventListener('pwa-prompt-ready', onPromptReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-ready', onPromptReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // AÇÃO 1-CLIQUE: Se o navegador tiver o prompt nativo pronto, dispara diretamente!
  const handleButtonClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPWAInstallPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          (window as any).deferredPWAInstallPrompt = null;
          return;
        }
      } catch (err) {
        console.warn('Erro ao disparar prompt nativo:', err);
      }
    }
    // Se não disparou o nativo automaticamente (ex: precisa do atalho do browser ou é no celular), abre o modal simplificado
    setShowModal(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Fallback
    }
  };

  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>App Instalado</span>
      </div>
    );
  }

  // QR Code otimizado
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mobileUrl)}&color=065f46&bgcolor=ffffff`;

  return (
    <>
      {/* Botão Principal Automatizado */}
      <button
        type="button"
        onClick={handleButtonClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/25 transition transform active:scale-95 cursor-pointer"
        title="Instalar Aplicativo NutriFit com 1 Clique"
      >
        <Download className="w-4 h-4" />
        <span>Instalar Aplicativo</span>
      </button>

      {/* Modal Simplificado & Direto ao Ponto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">
                    Instalar NutriFit
                  </h3>
                  <p className="text-xs text-gray-500">
                    Aplicativo rápido para Computador e Celular
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alternador Computador / Celular */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('computador')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeTab === 'computador'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>No Computador</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('celular')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeTab === 'celular'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>No Celular</span>
              </button>
            </div>

            {/* Guia Simples Computador */}
            {activeTab === 'computador' && (
              <div className="space-y-3 animate-in fade-in">
                {deferredPrompt ? (
                  <button
                    type="button"
                    onClick={handleButtonClick}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Concluir Instalação no Computador</span>
                  </button>
                ) : (
                  <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2 font-black text-emerald-950 text-xs">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">1</span>
                      <span>Instalação rápida pelo navegador:</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed pl-8">
                      Clique no botão <strong>Instalar</strong> que aparece na <strong>barra de endereço (URL)</strong> no topo direito do navegador (ao lado da estrelinha de favoritos).
                    </p>
                    <div className="mt-2 p-2 bg-white rounded-xl border border-emerald-200 text-center text-xs font-bold text-emerald-900 flex items-center justify-center gap-2">
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Ícone de Instalar NutriFit na barra superior ↗</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Guia Simples Celular */}
            {activeTab === 'celular' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-3.5 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                  <div className="bg-white p-1.5 rounded-xl border border-emerald-200 shadow-xs shrink-0">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-20 h-20 object-contain rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-black text-emerald-950 text-xs">
                      1. Aponte a câmera do celular
                    </p>
                    <p className="text-gray-600 text-[11px] leading-snug">
                      Abra o link escaneado e toque em <strong>"Adicionar à tela inicial"</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLink ? 'Link copiado!' : 'Copiar link p/ WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Botão Fechar */}
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
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
