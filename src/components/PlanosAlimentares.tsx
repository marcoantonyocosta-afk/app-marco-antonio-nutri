import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Calendar, 
  FileText, 
  Clock, 
  Coffee, 
  Sun, 
  Utensils, 
  Moon, 
  Cookie,
  Edit3,
  Download,
  FileType,
  Printer,
  Share2,
  Send,
  Mail,
  Copy,
  X
} from 'lucide-react';
import { sql } from '../lib/neon';
import { exportarPlanoPDF, exportarPlanoDOCX, exportarCadastroEPlanoPDF } from '../utils/exportPlan';

export interface RefeicoesDia {
  cafe_da_manha: string[];
  lanche_manha: string[];
  almoco: string[];
  lanche_tarde: string[];
  jantar: string[];
}

export interface DiaPlano {
  dia: string;
  refeicoes: RefeicoesDia;
}

export interface PlanoSemanalData {
  plano_semanal: DiaPlano[];
}

interface PlanoAlimentarRecord {
  id: string;
  conteudo: any;
  created_at: string;
}

interface PlanosAlimentaresProps {
  patientId: string;
  patientData: {
    nome: string;
    dataNascimento?: string;
    idade?: string | number;
    sexo?: string;
    whatsapp?: string;
    email?: string;
    peso?: string;
    altura?: string;
    objetivos?: string[];
    objetivoTexto?: string;
    nivelAtividade?: string;
    patologias?: string[];
    restricoes?: string[];
    alergias?: string[];
    medicamentos?: string;
    suplementos?: string;
    refeicoesDia?: string;
    horarioAcorda?: string;
    horarioDorme?: string;
    litrosAgua?: string;
    atividadeFisica?: string;
    observacoes?: string;
  };
  initialPlanos?: PlanoAlimentarRecord[];
}

const DIAS_PADRAO = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

const REFEICOES_CONFIG = [
  { key: 'cafe_da_manha', label: 'Café da Manhã', icon: Coffee, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { key: 'lanche_manha', label: 'Lanche da Manhã', icon: Cookie, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { key: 'almoco', label: 'Almoço', icon: Sun, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { key: 'lanche_tarde', label: 'Lanche da Tarde', icon: Utensils, color: 'text-teal-700 bg-teal-50 border-teal-200' },
  { key: 'jantar', label: 'Jantar', icon: Moon, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
] as const;

export const PlanosAlimentares: React.FC<PlanosAlimentaresProps> = ({
  patientId,
  patientData,
  initialPlanos = []
}) => {
  const [planos, setPlanos] = useState<PlanoAlimentarRecord[]>(initialPlanos);
  const [selectedHistorico, setSelectedHistorico] = useState<PlanoAlimentarRecord | null>(null);

  // Estados de IA e Geração
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Buscando dados do paciente...');
  const [currentPlan, setCurrentPlan] = useState<PlanoSemanalData | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Estados de Salvamento e Notificações
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal Enviar Plano para o Paciente
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [planToSend, setPlanToSend] = useState<PlanoSemanalData | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    setPlanos(initialPlanos);
  }, [initialPlanos]);

  // Mensagens dinâmicas durante o loading
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      const messages = [
        'Buscando dados do paciente...',
        'Analisando objetivos, restrições e alergias...',
        'IA calculando cardápio semanal diversificado...',
        'Estruturando porções e opções de refeições...',
        'Finalizando plano nutricional personalizado...'
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Criar template de plano manual
  const criarPlanoManual = (): PlanoSemanalData => {
    return {
      plano_semanal: DIAS_PADRAO.map(dia => ({
        dia,
        refeicoes: {
          cafe_da_manha: ['', '', '', '', ''],
          lanche_manha: ['', '', '', '', ''],
          almoco: ['', '', '', '', ''],
          lanche_tarde: ['', '', '', '', ''],
          jantar: ['', '', '', '', '']
        }
      }))
    };
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 6000);
  };

  // Gerar Plano com IA
  const handleGerarPlanoIA = async () => {
    setIsGenerating(true);
    try {
      const payloadDadosPaciente = {
        nome: patientData.nome,
        sexo: patientData.sexo,
        peso_atual_kg: patientData.peso,
        altura_cm: patientData.altura,
        objetivos: patientData.objetivos,
        detalhes_objetivo: patientData.objetivoTexto,
        nivel_atividade: patientData.nivelAtividade,
        patologias: patientData.patologias,
        restricoes_alimentares: patientData.restricoes,
        alergias: patientData.alergias,
        medicamentos: patientData.medicamentos,
        suplementos: patientData.suplementos,
        refeicoes_por_dia: patientData.refeicoesDia,
        horario_acorda: patientData.horarioAcorda,
        horario_dorme: patientData.horarioDorme,
        litros_agua: patientData.litrosAgua,
        atividade_fisica: patientData.atividadeFisica,
        observacoes: patientData.observacoes,
      };

      const res = await fetch('/api/gerar-plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados_do_paciente: payloadDadosPaciente })
      });

      const data = await res.json();

      if (!res.ok || !data.plano_semanal) {
        throw new Error(data.error || 'Falha ao gerar plano com IA');
      }

      // Normalizar para garantir 5 opções em cada refeição caso a IA mande menos
      const planoNormalizado: PlanoSemanalData = {
        plano_semanal: data.plano_semanal.map((diaObj: any) => ({
          dia: diaObj.dia || 'Dia',
          refeicoes: {
            cafe_da_manha: fillOptions(diaObj.refeicoes?.cafe_da_manha),
            lanche_manha: fillOptions(diaObj.refeicoes?.lanche_manha),
            almoco: fillOptions(diaObj.refeicoes?.almoco),
            lanche_tarde: fillOptions(diaObj.refeicoes?.lanche_tarde),
            jantar: fillOptions(diaObj.refeicoes?.jantar),
          }
        }))
      };

      setCurrentPlan(planoNormalizado);
      setActiveDayIndex(0);
      showToast('success', '✨ Plano semanal gerado com sucesso pela IA! Revise e ajuste conforme necessário.');
    } catch (err: any) {
      console.error('Erro na geração IA:', err);
      showToast(
        'error',
        'Não foi possível gerar o plano com IA no momento. Deseja tentar novamente ou criar um Plano Manual?'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const fillOptions = (arr?: string[]) => {
    const list = Array.isArray(arr) ? [...arr] : [];
    while (list.length < 5) {
      list.push('');
    }
    return list.slice(0, 5);
  };

  // Exportação DOCX e PDF
  const handleExport = async (formato: 'pdf' | 'docx' | 'full_pdf', dataPlano: PlanoSemanalData, idKey = 'editor') => {
    setIsExporting(`${idKey}_${formato}`);
    try {
      if (formato === 'full_pdf') {
        await exportarCadastroEPlanoPDF(dataPlano, patientData);
        showToast('success', '🖨️ Visualização de impressão aberta em nova aba!');
      } else if (formato === 'pdf') {
        await exportarPlanoPDF(dataPlano, patientData);
        showToast('success', '📄 Plano Alimentar em PDF baixado com sucesso!');
      } else {
        await exportarPlanoDOCX(dataPlano, patientData);
        showToast('success', '📝 Plano Alimentar em Word (.docx) baixado com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao exportar:', err);
      showToast('error', 'Ocorreu um erro ao abrir a visualização de impressão.');
    } finally {
      setIsExporting(null);
    }
  };

  // Geração de mensagem formatada para envio
  const gerarMensagemResumoPlano = (plano: PlanoSemanalData) => {
    const nome = patientData.nome || 'Paciente';
    let msg = `Olá, ${nome}! 🥗\n\n`;
    msg += `Aqui está o seu *Plano Alimentar Personalizado* preparado na clínica *NutriFit*:\n\n`;

    plano.plano_semanal.forEach((diaItem) => {
      msg += `📅 *${diaItem.dia.toUpperCase()}*\n`;
      REFEICOES_CONFIG.forEach(({ key, label }) => {
        const opcoes = (diaItem.refeicoes as any)?.[key] || [];
        const filtradas = opcoes.filter((o: string) => Boolean(o && o.trim()));
        if (filtradas.length > 0) {
          msg += `• *${label}*:\n`;
          filtradas.forEach((op: string, idx: number) => {
            msg += `   - Opção ${idx + 1}: ${op}\n`;
          });
        }
      });
      msg += `\n`;
    });

    msg += `Qualquer dúvida ou ajuste necessário na sua rotina, estamos à disposição! Bom foco na sua saúde e nos seus objetivos! ✨`;
    return msg;
  };

  const handleOpenSendModal = (plano: PlanoSemanalData) => {
    setPlanToSend(plano);
    setIsSendModalOpen(true);
    setCopiedText(false);
  };

  const handleSendWhatsApp = () => {
    if (!planToSend) return;
    const cleanPhone = (patientData.whatsapp || '').replace(/\D/g, '');
    const mensagem = encodeURIComponent(gerarMensagemResumoPlano(planToSend));
    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${mensagem}`
      : `https://wa.me/?text=${mensagem}`;
    window.open(url, '_blank');
  };

  const handleSendEmail = () => {
    if (!planToSend) return;
    const email = patientData.email || '';
    const assunto = encodeURIComponent(`Seu Plano Alimentar Personalizado - NutriFit`);
    const corpo = encodeURIComponent(gerarMensagemResumoPlano(planToSend));
    window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`);
  };

  const handleCopyText = async () => {
    if (!planToSend) return;
    try {
      await navigator.clipboard.writeText(gerarMensagemResumoPlano(planToSend));
      setCopiedText(true);
      showToast('success', '📋 Plano copiado para a área de transferência!');
      setTimeout(() => setCopiedText(false), 3000);
    } catch {
      showToast('error', 'Não foi possível copiar o texto automaticamente.');
    }
  };

  // Alteração de input nas refeições
  const handleOptionChange = (
    dayIdx: number,
    refeicaoKey: keyof RefeicoesDia,
    optIdx: number,
    value: string
  ) => {
    if (!currentPlan) return;
    const newPlan: PlanoSemanalData = {
      plano_semanal: currentPlan.plano_semanal.map((d, dI) => {
        if (dI !== dayIdx) return d;
        const newRefeicoes = { ...d.refeicoes };
        const newOpts = [...newRefeicoes[refeicaoKey]];
        newOpts[optIdx] = value;
        newRefeicoes[refeicaoKey] = newOpts;
        return { ...d, refeicoes: newRefeicoes };
      })
    };
    setCurrentPlan(newPlan);
  };

  // Salvar Plano Alimentar no Neon
  const handleSalvarPlano = async () => {
    if (!currentPlan) return;
    try {
      setIsSaving(true);
      const res = await sql.query(
        `INSERT INTO public.planos_alimentares (paciente_id, conteudo, created_at)
         VALUES ($1, $2, now())
         RETURNING id, conteudo, created_at`,
        [patientId, JSON.stringify(currentPlan)]
      );

      if (res && res.length > 0) {
        const saved = res[0] as PlanoAlimentarRecord;
        setPlanos(prev => [saved, ...prev]);
        showToast('success', 'Plano alimentar salvo com sucesso no prontuário!');
      } else {
        // Fallback para recarregar
        const reload = await sql.query(
          `SELECT id, conteudo, created_at FROM public.planos_alimentares WHERE paciente_id = $1 ORDER BY created_at DESC`,
          [patientId]
        );
        setPlanos(reload as PlanoAlimentarRecord[]);
        showToast('success', 'Plano alimentar salvo com sucesso!');
      }

      // Limpar formulário de edição para voltar ao histórico limpo
      setCurrentPlan(null);
    } catch (err: any) {
      console.error('Erro ao salvar plano no Neon:', err);
      showToast('error', 'Falha ao salvar o plano alimentar no banco de dados: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de Notificação */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm font-semibold transition animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>

          {toastMessage.type === 'error' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGerarPlanoIA}
                className="px-3 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Tentar Novamente
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPlan(criarPlanoManual());
                  setActiveDayIndex(0);
                  setToastMessage(null);
                }}
                className="px-3 py-1 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Criar Manualmente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header com Ações */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Utensils className="w-5 h-5" />
            </span>
            <span>Planos Alimentares</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Geração com inteligência artificial adaptada à rotina e culinária brasileira
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Botão de Criação Manual (opcional/alternativo) */}
          {!currentPlan && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => {
                setCurrentPlan(criarPlanoManual());
                setActiveDayIndex(0);
              }}
              className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4" />
              <span>Plano Manual</span>
            </button>
          )}

          {/* Botão Principal com IA conforme Prompt 6 */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGerarPlanoIA}
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Gerando Plano com IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>✨ Gerar Plano com IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Banner de Loading Dinâmico */}
      {isGenerating && (
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 text-white p-8 rounded-3xl shadow-xl border border-emerald-700/40 text-center space-y-4 animate-in fade-in">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-400/20 border-t-emerald-400 animate-spin" />
            <Sparkles className="w-6 h-6 text-emerald-300 absolute animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-black tracking-tight">{loadingMessage}</h4>
            <p className="text-xs text-emerald-200/80">
              Aguarde alguns segundos enquanto a IA personaliza cada refeição baseada nas preferências do paciente.
            </p>
          </div>
        </div>
      )}

      {/* INTERFACE DE EDIÇÃO DO PLANO GERADO / ATIVO */}
      {currentPlan && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500/30 p-6 sm:p-8 shadow-md space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black tracking-wide uppercase">
                  Modo de Edição Ativo
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {currentPlan.plano_semanal.length} dias configurados
                </span>
              </div>
              <h4 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                Revise e Ajuste o Cardápio Semanal
              </h4>
              <p className="text-xs text-gray-500">
                Altere qualquer uma das opções diretamente antes de salvar no prontuário.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Botões de Enviar / Download PDF / DOCX / Visualização de Impressão */}
              <button
                type="button"
                onClick={() => handleOpenSendModal(currentPlan)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                title="Mandar o plano alimentar para o paciente via WhatsApp, E-mail ou copiar"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Enviar para o Paciente</span>
              </button>

              <button
                type="button"
                disabled={Boolean(isExporting)}
                onClick={() => handleExport('full_pdf', currentPlan, 'editor')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs"
                title="Abrir visualização de impressão do cadastro com plano alimentar"
              >
                {isExporting === 'editor_full_pdf' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span>Visualização de Impressão</span>
              </button>

              <button
                type="button"
                disabled={Boolean(isExporting)}
                onClick={() => handleExport('pdf', currentPlan, 'editor')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                title="Baixar Plano em PDF"
              >
                {isExporting === 'editor_pdf' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>PDF</span>
              </button>

              <button
                type="button"
                disabled={Boolean(isExporting)}
                onClick={() => handleExport('docx', currentPlan, 'editor')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                title="Baixar Plano em Word (.docx)"
              >
                {isExporting === 'editor_docx' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileType className="w-3.5 h-3.5" />
                )}
                <span>DOCX</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPlan(null)}
                className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Descartar
              </button>

              {/* Botão de Persistência */}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSalvarPlano}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Plano</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Abas dos Dias da Semana */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {currentPlan.plano_semanal.map((diaItem, idx) => (
              <button
                key={diaItem.dia || idx}
                type="button"
                onClick={() => setActiveDayIndex(idx)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                  activeDayIndex === idx
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                }`}
              >
                {diaItem.dia}
              </button>
            ))}
          </div>

          {/* Cardápio do Dia Selecionado */}
          {currentPlan.plano_semanal[activeDayIndex] && (
            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-between bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                <span className="text-sm font-black text-emerald-900">
                  {currentPlan.plano_semanal[activeDayIndex].dia}
                </span>
                <span className="text-xs text-emerald-700 font-semibold">
                  5 opções por refeição para rotação ou substituição
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {REFEICOES_CONFIG.map(({ key, label, icon: Icon, color }) => {
                  const options = currentPlan.plano_semanal[activeDayIndex].refeicoes[key] || ['', '', '', '', ''];

                  return (
                    <div
                      key={key}
                      className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-emerald-300 transition space-y-4"
                    >
                      <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                        <span className={`p-2 rounded-xl border ${color}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                            {label}
                          </h5>
                          <span className="text-[10px] text-gray-400 font-medium">5 opções sugeridas</span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {options.map((opt, optIdx) => (
                          <div key={optIdx} className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                              Opção {optIdx + 1}
                            </label>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) =>
                                handleOptionChange(activeDayIndex, key, optIdx, e.target.value)
                              }
                              placeholder={`Ex: Opção ${optIdx + 1}...`}
                              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 rounded-xl text-xs text-gray-800 font-medium outline-none transition"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTÓRICO DE PLANOS ALIMENTARES */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h4 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Histórico de Planos Salvos</span>
            </h4>
            <p className="text-xs text-gray-500">
              Registros históricos das dietas já prescritas para este paciente
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-100">
            {planos.length} {planos.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {planos.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Utensils className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-gray-800">
              Nenhum plano alimentar gerado ainda
            </h5>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Clique no botão "✨ Gerar Plano com IA" acima para produzir o primeiro plano nutricional personalizado deste paciente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {planos.map((plano) => {
              const isExpanded = selectedHistorico?.id === plano.id;
              let parsedData: PlanoSemanalData | null = null;
              try {
                parsedData = typeof plano.conteudo === 'string' ? JSON.parse(plano.conteudo) : plano.conteudo;
              } catch (e) {
                parsedData = null;
              }

              return (
                <div key={plano.id} className="transition">
                  <div
                    onClick={() => setSelectedHistorico(isExpanded ? null : plano)}
                    className="p-4 sm:p-5 md:p-6 hover:bg-emerald-50/40 cursor-pointer transition space-y-3.5"
                  >
                    {/* Top row: Ícone, Título, Data e Botão de Recolher/Visualizar */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-gray-900 block truncate">
                            Plano Alimentar Semanal
                          </span>
                          <span className="text-xs text-gray-500 flex items-center flex-wrap gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{new Date(plano.created_at).toLocaleDateString('pt-BR')}</span>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              <span>
                                {new Date(plano.created_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHistorico(isExpanded ? null : plano);
                        }}
                        className="inline-flex items-center justify-center gap-1 h-8 px-2.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/60 rounded-lg transition shrink-0"
                      >
                        <span>{isExpanded ? 'Recolher' : 'Visualizar'}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    {/* Barra de Ações — layout responsivo para celular */}
                    <div
                      className="pt-3 border-t border-gray-100 space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {parsedData?.plano_semanal && (
                        <>
                          {/* Linha 1: Enviar p/ Paciente (largura total) */}
                          <button
                            type="button"
                            onClick={() => handleOpenSendModal(parsedData)}
                            className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm active:scale-[0.98]"
                            title="Enviar Plano para o Paciente via WhatsApp / E-mail"
                          >
                            <Send className="w-3.5 h-3.5 shrink-0" />
                            <span>Enviar p/ Paciente</span>
                          </button>

                          {/* Linha 2: Visualização de Impressão (largura total) */}
                          <button
                            type="button"
                            disabled={Boolean(isExporting)}
                            onClick={() => parsedData && handleExport('full_pdf', parsedData, `hist_${plano.id}`)}
                            className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 hover:border-emerald-400 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-sm"
                            title="Abrir visualização de impressão (Cadastro + Plano Alimentar)"
                          >
                            {isExporting === `hist_${plano.id}_full_pdf` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            ) : (
                              <Printer className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            )}
                            <span>Visualização de Impressão</span>
                          </button>

                          {/* Linha 3: PDF + DOCX lado a lado */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={Boolean(isExporting)}
                              onClick={() => parsedData && handleExport('pdf', parsedData, `hist_${plano.id}`)}
                              className="inline-flex items-center justify-center gap-1.5 h-10 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-sm"
                              title="Baixar PDF"
                            >
                              {isExporting === `hist_${plano.id}_pdf` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              ) : (
                                <Download className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>↓ PDF</span>
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(isExporting)}
                              onClick={() => parsedData && handleExport('docx', parsedData, `hist_${plano.id}`)}
                              className="inline-flex items-center justify-center gap-1.5 h-10 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-sm"
                              title="Baixar DOCX"
                            >
                              {isExporting === `hist_${plano.id}_docx` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              ) : (
                                <FileType className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>↓ DOCX</span>
                            </button>
                          </div>
                        </>
                      )}

                      {/* Linha final: Carregar no Editor (largura total) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (parsedData?.plano_semanal) {
                            setCurrentPlan(parsedData);
                            setActiveDayIndex(0);
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                          }
                        }}
                        className="w-full inline-flex items-center justify-center h-10 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-[0.98] shadow-sm"
                      >
                        Carregar no Editor
                      </button>
                    </div>
                  </div>

                  {/* Detalhes completos do plano histórico ao expandir */}
                  {isExpanded && (
                    <div className="p-6 bg-gray-50/80 border-t border-gray-100 space-y-4">
                      {parsedData?.plano_semanal ? (
                        <div className="space-y-6">
                          {parsedData.plano_semanal.map((diaObj, dIdx) => (
                            <div key={dIdx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                              <h5 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>{diaObj.dia}</span>
                              </h5>

                              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {REFEICOES_CONFIG.map(({ key, label }) => {
                                  const opts = diaObj.refeicoes?.[key] || [];
                                  return (
                                    <div key={key} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                      <span className="font-bold text-gray-800 block mb-1.5">{label}</span>
                                      <ul className="space-y-1 text-gray-600 list-disc list-inside">
                                        {opts.filter(Boolean).map((op, oIdx) => (
                                          <li key={oIdx} className="text-[11px] leading-snug">
                                            {op}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-xs bg-white p-4 rounded-xl border border-gray-200 text-gray-800">
                          {typeof plano.conteudo === 'string'
                            ? plano.conteudo
                            : JSON.stringify(plano.conteudo, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: ENVIAR PLANO ALIMENTAR PARA O PACIENTE            */}
      {/* ======================================================== */}
      {isSendModalOpen && planToSend && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Send className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">
                    Enviar Plano Alimentar
                  </h3>
                  <p className="text-xs text-gray-500">
                    Paciente: <span className="font-bold text-gray-800">{patientData.nome || 'Paciente'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informações de Contato Cadastradas */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-semibold">WhatsApp cadastrado:</span>
                <span className="font-black text-gray-800">
                  {patientData.whatsapp || 'Não informado'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-semibold">E-mail cadastrado:</span>
                <span className="font-black text-gray-800">
                  {patientData.email || 'Não informado'}
                </span>
              </div>
            </div>

            {/* Ações de Envio Rápido */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Escolha o canal de envio:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Botão WhatsApp */}
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex items-center justify-center gap-2 p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </button>

                {/* Botão E-mail */}
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="flex items-center justify-center gap-2 p-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Enviar por E-mail</span>
                </button>
              </div>

              {/* Botão Copiar Texto Formatado */}
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Texto do plano copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Texto Completo do Cardápio</span>
                  </>
                )}
              </button>
            </div>

            {/* Prévia do Texto */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Prévia da Mensagem:
              </label>
              <div className="max-h-36 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-700 whitespace-pre-line font-sans scrollbar-thin">
                {gerarMensagemResumoPlano(planToSend)}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
