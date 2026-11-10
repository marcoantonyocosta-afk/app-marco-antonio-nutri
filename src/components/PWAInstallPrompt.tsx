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

  useEffect(() => {
    // Define a URL para o celular (prioriza a origem atual)
    setMobileUrl(window.location.origin);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleTriggerNativeInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
      setActiveTab('computador');
    }
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

  // QR Code gerado dinamicamente para o celular escanear e abrir o sistema
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileUrl)}&color=065f46&bgcolor=ffffff`;

  return (
    <>
      {/* Botão Principal no Topo */}
      <button
        type="button"
        onClick={() => {
          if (deferredPrompt) {
            handleTriggerNativeInstall();
          } else {
            setShowModal(true);
          }
        }}
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/20 transition transform active:scale-95 cursor-pointer"
        title="Instalar NutriFit no Computador e no Celular"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span className="hidden sm:inline">Instalar Aplicativo</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      {/* Modal Completo de Instalação no Computador e no Celular */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 space-y-6">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Instalar NutriFit</span>
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                      App Nativo
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Disponível para Computador (Windows/Mac) e Celular (Android/iOS)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas: Computador vs Celular */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('computador')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'computador'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>No Computador</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('celular')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'celular'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>No Celular</span>
              </button>
            </div>

            {/* Conteúdo da Aba 1: Computador */}
            {activeTab === 'computador' && (
              <div className="space-y-4 animate-in fade-in">
                {deferredPrompt ? (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                    <Sparkles className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-emerald-950">
                      Seu navegador está pronto para instalação direta!
                    </p>
                    <button
                      type="button"
                      onClick={handleTriggerNativeInstall}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                    >
                      Instalar Agora no Computador
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 text-xs text-gray-700">
                    <p className="font-bold text-gray-900 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-emerald-600" />
                      Como instalar no Windows / Mac (Chrome ou Edge):
                    </p>
                    <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                      <li>
                        Olhe para a <strong>barra de endereço (URL)</strong> do seu navegador no topo.
                      </li>
                      <li>
                        No lado direito (perto da estrela de favoritos), clique no ícone de <strong>computador com seta para baixo ⬇️ ("Instalar NutriFit")</strong>.
                      </li>
                      <li>
                        Ou clique nos <strong>três pontinhos (menu)</strong> &gt; <strong>"Instalar NutriFit"</strong> &gt; Confirmar <strong>Instalar</strong>.
                      </li>
                    </ol>
                    <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                      O aplicativo será aberto em janela própria e você terá o ícone na Área de Trabalho e Barra de Tarefas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Aba 2: Celular */}
            {activeTab === 'celular' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                  {/* QR Code para abrir no celular */}
                  <div className="bg-white p-2 rounded-2xl border border-emerald-200 shadow-xs shrink-0 text-center">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code NutriFit"
                      className="w-28 h-28 object-contain rounded-xl"
                    />
                    <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block mt-1">
                      Aponte a Câmera
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-700">
                    <p className="font-black text-emerald-950">
                      Abra o NutriFit no seu celular:
                    </p>
                    <p className="text-gray-600 text-[11px] leading-relaxed">
                      Aponte a câmera do celular para o QR Code ao lado ou acesse o link no navegador do smartphone:
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        readOnly
                        value={mobileUrl}
                        className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-gray-700 flex-1 select-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        title="Copiar Link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instruções por Sistema Operacional Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Android */}
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                    <span className="font-bold text-gray-900 block">📱 No Android (Chrome):</span>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      Toque nos <strong>três pontinhos</strong> no canto superior e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>

                  {/* iOS */}
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                    <span className="font-bold text-gray-900 block">🍎 No iPhone/iPad (Safari):</span>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      Toque no botão de <strong>Compartilhar (ícone com seta para cima)</strong> e escolha <strong>"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Vantagens */}
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-[11px] text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Aplicativo leve, inicialização ultrarrápida e sincronização simultânea de dados em tempo real no Neon.
              </span>
            </div>

            {/* Rodapé */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
