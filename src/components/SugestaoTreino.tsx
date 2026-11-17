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
  Edit3,
  Dumbbell,
  Timer,
  Target,
  X,
  Send,
  Copy,
  Mail,
  Plus,
  Trash2,
} from 'lucide-react';
import { sql } from '../lib/neon';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Exercicio {
  nome: string;
  series: string;
  reps: string;
  distancia: string;
  carga: string;
  intensidade: string;
  descanso: string;
  tecnica: string;
}

export interface DiaTreino {
  dia: string;
  grupo_muscular: string;
  tipo_treino: string;
  duracao_minutos: number;
  exercicios: Exercicio[];
  observacoes_do_dia: string;
}

export interface PlanoTreinoData {
  plano_treino_semanal: DiaTreino[];
}

export interface PlanoTreinoRecord {
  id: string;
  conteudo: any;
  created_at: string;
}

interface SugestaoTreinoProps {
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
    atividadeFisica?: string;
    observacoes?: string;
  };
  initialPlanos?: PlanoTreinoRecord[];
}

const DIAS_PADRAO = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

const MODALIDADES_COMUNS = [
  'Musculação',
  'Natação',
  'Corrida',
  'Funcional',
  'Crossfit',
  'Ciclismo',
  'Caminhada / Esteira',
  'Alongamento / Mobilidade',
  'Repouso / Descanso',
];

function getTipoColor(tipo: string) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('natação') || t.includes('natacao')) return 'text-cyan-700 bg-cyan-50 border-cyan-200';
  if (t.includes('corrida') || t.includes('caminhada')) return 'text-amber-700 bg-amber-50 border-amber-200';
  if (t.includes('musculação') || t.includes('musculacao')) return 'text-purple-700 bg-purple-50 border-purple-200';
  if (t.includes('funcional') || t.includes('crossfit')) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (t.includes('ciclismo') || t.includes('bike')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (t.includes('repouso') || t.includes('descanso')) return 'text-gray-500 bg-gray-50 border-gray-200';
  return 'text-teal-700 bg-teal-50 border-teal-200';
}

function criarExercicioVazio(): Exercicio {
  return {
    nome: '',
    series: '3',
    reps: '12',
    distancia: '-',
    carga: 'Moderada',
    intensidade: 'RPE 7-8',
    descanso: '60s',
    tecnica: '',
  };
}

function criarPlanoManual(): PlanoTreinoData {
  return {
    plano_treino_semanal: DIAS_PADRAO.map((dia, i) => ({
      dia,
      grupo_muscular: i === 6 ? 'Recuperação e Repouso' : (i % 2 === 0 ? 'Membros Superiores / Musculação' : 'Membros Inferiores / Cardio'),
      tipo_treino: i === 6 ? 'Repouso / Descanso' : (i === 2 ? 'Natação' : 'Musculação'),
      duracao_minutos: i === 6 ? 0 : 50,
      exercicios: i === 6
        ? []
        : [
            {
              nome: i === 2 ? 'Aquecimento 200m Crawl leve' : 'Exercício Principal',
              series: i === 2 ? '1' : '4',
              reps: i === 2 ? '-' : '10-12',
              distancia: i === 2 ? '200m' : '-',
              carga: i === 2 ? 'Sem carga' : 'Moderada',
              intensidade: 'Moderada',
              descanso: '60s',
              tecnica: 'Execução controlada com respiração ritmada',
            },
            {
              nome: i === 2 ? 'Tiros de 50m Crawl' : 'Exercício Secundário',
              series: i === 2 ? '6' : '3',
              reps: i === 2 ? '-' : '12',
              distancia: i === 2 ? '50m' : '-',
              carga: i === 2 ? 'Sem carga' : 'Moderada',
              intensidade: 'Forte (Z4)',
              descanso: i === 2 ? '45s' : '60s',
              tecnica: 'Aceleração contínua sem perder a técnica',
            },
          ],
      observacoes_do_dia: i === 6 ? 'Dia dedicado à recuperação muscular e hidratação' : 'Aquecer bem as articulações antes de iniciar.',
    })),
  };
}

export const SugestaoTreino: React.FC<SugestaoTreinoProps> = ({
  patientId,
  patientData,
  initialPlanos = [],
}) => {
  const [planos, setPlanos] = useState<PlanoTreinoRecord[]>(initialPlanos);
  const [selectedHistorico, setSelectedHistorico] = useState<PlanoTreinoRecord | null>(null);

  // Estados de IA e Carregamento
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Buscando dados do paciente...');
  const [currentPlan, setCurrentPlan] = useState<PlanoTreinoData | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Estados de Salvamento
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal Enviar
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [planToSend, setPlanToSend] = useState<PlanoTreinoData | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    setPlanos(initialPlanos);
  }, [initialPlanos]);

  // Mensagens dinâmicas de Loading
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      const messages = [
        'Buscando dados do paciente...',
        'Analisando objetivos e nível de atividade...',
        'IA calculando Sugestão de Treino (Musculação/Natação/Cardio)...',
        'Estruturando exercícios, séries, reps, distâncias e cargas...',
        'Definindo intensidades e tempos de descanso...',
        'Finalizando plano semanal personalizado...',
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2400);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 6000);
  };

  // Gerar Sugestão de Treino com IA
  const handleGerarTreinoIA = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        nome: patientData.nome,
        sexo: patientData.sexo,
        peso_atual_kg: patientData.peso,
        altura_cm: patientData.altura,
        objetivos: patientData.objetivos,
        detalhes_objetivo: patientData.objetivoTexto,
        nivel_atividade: patientData.nivelAtividade,
        patologias: patientData.patologias,
        medicamentos: patientData.medicamentos,
        suplementos: patientData.suplementos,
        atividade_fisica: patientData.atividadeFisica,
        observacoes: patientData.observacoes,
      };

      const res = await fetch('/api/gerar-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados_do_paciente: payload }),
      });

      const data = await res.json();

      if (!res.ok || !data.plano_treino_semanal) {
        throw new Error(data.error || 'Falha ao gerar sugestão de treino com IA');
      }

      const planoNormalizado: PlanoTreinoData = {
        plano_treino_semanal: data.plano_treino_semanal.map((diaObj: any) => ({
          dia: diaObj.dia || 'Dia',
          grupo_muscular: diaObj.grupo_muscular || '',
          tipo_treino: diaObj.tipo_treino || 'Musculação',
          duracao_minutos: Number(diaObj.duracao_minutos) || 50,
          exercicios: Array.isArray(diaObj.exercicios)
            ? diaObj.exercicios.map((ex: any) => ({
                nome: ex.nome || '',
                series: ex.series || '',
                reps: ex.reps || '',
                distancia: ex.distancia || '-',
                carga: ex.carga || '',
                intensidade: ex.intensidade || '',
                descanso: ex.descanso || '',
                tecnica: ex.tecnica || '',
              }))
            : [],
          observacoes_do_dia: diaObj.observacoes_do_dia || '',
        })),
      };

      setCurrentPlan(planoNormalizado);
      setActiveDayIndex(0);
      showToast('success', '✨ Sugestão de treino gerada com sucesso pela IA! Revise e ajuste os campos conforme desejado.');
    } catch (err: any) {
      console.error('Erro na geração IA de treino:', err);
      showToast('error', 'Não foi possível gerar o treino com IA no momento. Tente novamente ou use o Plano Manual.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Salvar no Neon
  const handleSalvarTreino = async () => {
    if (!currentPlan) return;
    try {
      setIsSaving(true);
      const res = await sql.query(
        `INSERT INTO public.planos_treino (paciente_id, conteudo, created_at)
         VALUES ($1, $2, now())
         RETURNING id, conteudo, created_at`,
        [patientId, JSON.stringify(currentPlan)]
      );

      if (res && res.length > 0) {
        const saved = res[0] as PlanoTreinoRecord;
        setPlanos(prev => [saved, ...prev]);
        showToast('success', 'Plano de treino salvo com sucesso no prontuário do paciente!');
      } else {
        const reload = await sql.query(
          `SELECT id, conteudo, created_at FROM public.planos_treino WHERE paciente_id = $1 ORDER BY created_at DESC`,
          [patientId]
        );
        setPlanos(reload as PlanoTreinoRecord[]);
        showToast('success', 'Plano de treino salvo com sucesso!');
      }
      setCurrentPlan(null);
    } catch (err: any) {
      console.error('Erro ao salvar plano de treino:', err);
      showToast('error', 'Falha ao salvar o plano de treino: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  // Manipulação dos campos editáveis de exercícios
  const handleExercicioChange = (
    dayIdx: number,
    exIdx: number,
    field: keyof Exercicio,
    value: string
  ) => {
    if (!currentPlan) return;
    setCurrentPlan({
      plano_treino_semanal: currentPlan.plano_treino_semanal.map((d, dI) => {
        if (dI !== dayIdx) return d;
        const newExercicios = d.exercicios.map((ex, eI) =>
          eI === exIdx ? { ...ex, [field]: value } : ex
        );
        return { ...d, exercicios: newExercicios };
      }),
    });
  };

  const handleDiaFieldChange = (dayIdx: number, field: keyof DiaTreino, value: any) => {
    if (!currentPlan) return;
    setCurrentPlan({
      plano_treino_semanal: currentPlan.plano_treino_semanal.map((d, dI) =>
        dI !== dayIdx ? d : { ...d, [field]: value }
      ),
    });
  };

  const addExercicio = (dayIdx: number) => {
    if (!currentPlan) return;
    setCurrentPlan({
      plano_treino_semanal: currentPlan.plano_treino_semanal.map((d, dI) =>
        dI !== dayIdx
          ? d
          : { ...d, exercicios: [...d.exercicios, criarExercicioVazio()] }
      ),
    });
  };

  const removeExercicio = (dayIdx: number, exIdx: number) => {
    if (!currentPlan) return;
    setCurrentPlan({
      plano_treino_semanal: currentPlan.plano_treino_semanal.map((d, dI) =>
        dI !== dayIdx ? d : { ...d, exercicios: d.exercicios.filter((_, eI) => eI !== exIdx) }
      ),
    });
  };

  // Envio de resumo por mensagem
  const gerarMensagemTreino = (plano: PlanoTreinoData) => {
    const nome = patientData.nome || 'Paciente';
    let msg = `Olá, ${nome}! 💪🏋️‍♂️\n\n`;
    msg += `Aqui está a sua *Sugestão de Treino Personalizada* elaborada na clínica *NutriFit*:\n\n`;
    plano.plano_treino_semanal.forEach((diaItem) => {
      msg += `📅 *${diaItem.dia.toUpperCase()}*\n`;
      msg += `🎯 *Foco:* ${diaItem.grupo_muscular || 'Geral'} | *Modalidade:* ${diaItem.tipo_treino}\n`;
      if (diaItem.duracao_minutos > 0) msg += `⏱️ *Duração:* ${diaItem.duracao_minutos} min\n`;
      if (diaItem.exercicios.length > 0) {
        diaItem.exercicios.forEach((ex, i) => {
          if (ex.nome) {
            msg += `  ${i + 1}. *${ex.nome}*\n`;
            msg += `     • Séries: ${ex.series || '-'} | Reps: ${ex.reps || '-'}`;
            if (ex.distancia && ex.distancia !== '-') msg += ` | Distância: ${ex.distancia}`;
            if (ex.carga && ex.carga !== '-') msg += ` | Carga: ${ex.carga}`;
            if (ex.intensidade && ex.intensidade !== '-') msg += ` | Int: ${ex.intensidade}`;
            if (ex.descanso && ex.descanso !== '-') msg += ` | Descanso: ${ex.descanso}`;
            msg += `\n`;
            if (ex.tecnica) msg += `     • Técnica: _${ex.tecnica}_\n`;
          }
        });
      } else {
        msg += `  💤 _Dia dedicado à recuperação e repouso ativo_\n`;
      }
      if (diaItem.observacoes_do_dia) msg += `💡 *Obs:* ${diaItem.observacoes_do_dia}\n`;
      msg += `\n`;
    });
    msg += `Lembre-se de respeitar os limites do seu corpo e manter a hidratação! Qualquer dúvida, estamos à disposição! 🚀✨`;
    return msg;
  };

  const handleSendWhatsApp = () => {
    if (!planToSend) return;
    const cleanPhone = (patientData.whatsapp || '').replace(/\D/g, '');
    const mensagem = encodeURIComponent(gerarMensagemTreino(planToSend));
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${mensagem}` : `https://wa.me/?text=${mensagem}`;
    window.open(url, '_blank');
  };

  const handleSendEmail = () => {
    if (!planToSend) return;
    const email = patientData.email || '';
    const assunto = encodeURIComponent(`Sua Sugestão de Treino Personalizada - NutriFit`);
    const corpo = encodeURIComponent(gerarMensagemTreino(planToSend));
    window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`);
  };

  const handleCopyText = async () => {
    if (!planToSend) return;
    try {
      await navigator.clipboard.writeText(gerarMensagemTreino(planToSend));
      setCopiedText(true);
      showToast('success', '📋 Plano copiado para a área de transferência!');
      setTimeout(() => setCopiedText(false), 3000);
    } catch {
      showToast('error', 'Não foi possível copiar o texto automaticamente.');
    }
  };

  const diaAtivo = currentPlan?.plano_treino_semanal[activeDayIndex];

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
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          {toastMessage.type === 'error' && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGerarTreinoIA}
                className="px-3 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Tentar Novamente
              </button>
              <button
                type="button"
                onClick={() => { setCurrentPlan(criarPlanoManual()); setActiveDayIndex(0); setToastMessage(null); }}
                className="px-3 py-1 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Criar Manualmente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header com botões em destaque conforme solicitado */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Dumbbell className="w-5 h-5" />
            </span>
            <span>Sugestão de Treino</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Prescrição inteligente de treinos (Musculação, Natação, Corrida e Funcional) integrada às metas do paciente
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Botão em destaque: Plano de Treino Manual */}
          {!currentPlan && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => { setCurrentPlan(criarPlanoManual()); setActiveDayIndex(0); }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-300 hover:border-emerald-500 font-bold text-xs rounded-2xl shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <span>Plano de treino Manual</span>
            </button>
          )}

          {/* Botão em destaque: Gerar Plano com IA com loading e prevenção de duplo clique */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGerarTreinoIA}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Gerando Treino com IA...</span>
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

      {/* Loading visual dinâmico com mensagens animadas */}
      {isGenerating && (
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 text-white p-8 rounded-3xl shadow-xl border border-emerald-700/40 text-center space-y-4 animate-in fade-in">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-400/20 border-t-emerald-400 animate-spin" />
            <Dumbbell className="w-6 h-6 text-emerald-300 absolute animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-black tracking-tight">{loadingMessage}</h4>
            <p className="text-xs text-emerald-200/80">
              Aguarde enquanto a IA estrutura as séries, repetições, distâncias e intensidades personalizadas para este paciente.
            </p>
          </div>
        </div>
      )}

      {/* Área de Edição dos Treinos (Campos Editáveis: Exercício/Série/Reps/Distância/Carga/Intensidade/Descanso) */}
      {currentPlan && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500/30 p-5 sm:p-8 shadow-md space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black tracking-wide uppercase">
                  Modo de Edição Ativo
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {currentPlan.plano_treino_semanal.length} dias configurados
                </span>
              </div>
              <h4 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                Personalize o Treino Semanal
              </h4>
              <p className="text-xs text-gray-500">
                Altere livremente os exercícios, inclua novos movimentos ou remova conforme a rotina do paciente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { setPlanToSend(currentPlan); setIsSendModalOpen(true); setCopiedText(false); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar para o Paciente</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPlan(null)}
                className="px-3.5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Descartar
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSalvarTreino}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Salvando...</span></>
                ) : (
                  <><Save className="w-4 h-4" /><span>Salvar Plano de Treino</span></>
                )}
              </button>
            </div>
          </div>

          {/* Abas dos dias da semana */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {currentPlan.plano_treino_semanal.map((diaItem, idx) => (
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

          {/* Configurações do Dia Ativo */}
          {diaAtivo && (
            <div className="space-y-6 pt-1">
              {/* Metadados do Dia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Grupo / Foco</label>
                  <input
                    type="text"
                    value={diaAtivo.grupo_muscular}
                    onChange={e => handleDiaFieldChange(activeDayIndex, 'grupo_muscular', e.target.value)}
                    placeholder="Ex: Peito e Tríceps / Pernas"
                    className="w-full px-3 py-2 bg-white border border-gray-200 focus:border-emerald-500 rounded-xl text-xs text-gray-800 font-medium outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Modalidade</label>
                  <input
                    type="text"
                    list="modalidades-list"
                    value={diaAtivo.tipo_treino}
                    onChange={e => handleDiaFieldChange(activeDayIndex, 'tipo_treino', e.target.value)}
                    placeholder="Musculação, Natação, Corrida..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 focus:border-emerald-500 rounded-xl text-xs text-gray-800 font-medium outline-none transition"
                  />
                  <datalist id="modalidades-list">
                    {MODALIDADES_COMUNS.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Duração Estimada (min)</label>
                  <input
                    type="number"
                    value={diaAtivo.duracao_minutos || ''}
                    onChange={e => handleDiaFieldChange(activeDayIndex, 'duracao_minutos', Number(e.target.value))}
                    placeholder="Ex: 50"
                    min={0}
                    className="w-full px-3 py-2 bg-white border border-gray-200 focus:border-emerald-500 rounded-xl text-xs text-gray-800 font-medium outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Instruções / Dicas do Dia</label>
                  <input
                    type="text"
                    value={diaAtivo.observacoes_do_dia}
                    onChange={e => handleDiaFieldChange(activeDayIndex, 'observacoes_do_dia', e.target.value)}
                    placeholder="Aquecimento, hidratação..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 focus:border-emerald-500 rounded-xl text-xs text-gray-800 font-medium outline-none transition"
                  />
                </div>
              </div>

              {/* Barra de resumo da modalidade */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-emerald-950">{diaAtivo.dia}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getTipoColor(diaAtivo.tipo_treino)}`}>
                    {diaAtivo.tipo_treino || 'Treino'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-emerald-700 font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    {diaAtivo.duracao_minutos || 0} min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="w-3.5 h-3.5" />
                    {diaAtivo.exercicios.length} {diaAtivo.exercicios.length === 1 ? 'exercício' : 'exercícios'}
                  </span>
                </div>
              </div>

              {/* Lista de Exercícios Editáveis (Exercício, Séries, Reps, Distância, Carga, Intensidade, Descanso) */}
              <div className="space-y-4">
                {diaAtivo.exercicios.map((ex, exIdx) => (
                  <div
                    key={exIdx}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-emerald-300 transition space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                          {exIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Exercício #{exIdx + 1}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeExercicio(activeDayIndex, exIdx)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remover exercício"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remover</span>
                      </button>
                    </div>

                    {/* Grade de Campos Editáveis */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                      {/* Campo 1: Exercício */}
                      <div className="col-span-2 sm:col-span-3 lg:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                          Exercício
                        </label>
                        <input
                          type="text"
                          value={ex.nome}
                          onChange={e => handleExercicioChange(activeDayIndex, exIdx, 'nome', e.target.value)}
                          placeholder="Ex: Supino Reto / 100m Crawl"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-900 outline-none transition"
                        />
                      </div>

                      {/* Campo 2: Séries */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                          Séries
                        </label>
                        <input
                          type="text"
                          value={ex.series}
                          onChange={e => handleExercicioChange(activeDayIndex, exIdx, 'series', e.target.value)}
                          placeholder="Ex: 4"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-gray-800 outline-none transition"
                        />
                      </div>

                      {/* Campo 3: Reps */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                          Reps
                        </label>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={e => handleExercicioChange(activeDayIndex, exIdx, 'reps', e.target.value)}
                          placeholder="Ex: 10-12 ou -"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-gray-800 outline-none transition"
                        />
                      </div>

                      {/* Campo 4: Distância */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                          Distância
                        </label>
                        <input
                          type="text"
                          value={ex.distancia}
                          onChange={e => handleExercicioChange(activeDayIndex, exIdx, 'distancia', e.target.value)}
                          placeholder="Ex: 100m / 5km / -"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-gray-800 outline-none transition"
                        />
                      </div>

                      {/* Campo 5: Carga */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                          Carga
                        </label>
                        <input
                          type="text"
                          value={ex.carga}
                          onChange={e => handleExercicioChange(activeDayIndex, exIdx, 'carga', e.target.value)}
                          placeholder="Ex: 20kg / 70% / -"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-gray-800 outline-none transition"
                        />
                      </div>

                      {/* Campo 6: Intensidade */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                          Intensidade
                        </label>
                        <input
                          type="text"
                          value={ex.intensidade}
                          onChange={e => handleExercicioChange(activeDayIndex, exIdx, 'intensidade', e.target.value)}
                          placeholder="Ex: Moderada / RPE 8"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-gray-800 outline-none transition"
                        />
                      </div>

                      {/* Campo 7: Descanso */}
                      <div className="col-span-2 sm:col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                          Descanso
                        </label>
                        <input
                          type="text"
                          value={ex.descanso}
                          onChange={e => handleExercicioChange(activeDayIndex, exIdx, 'descanso', e.target.value)}
                          placeholder="Ex: 60s / 90s"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-gray-800 outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Técnica e Observação de Execução */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Instruções Técnicas e Postura
                      </label>
                      <input
                        type="text"
                        value={ex.tecnica}
                        onChange={e => handleExercicioChange(activeDayIndex, exIdx, 'tecnica', e.target.value)}
                        placeholder="Ex: Descer de forma controlada, escápulas retraídas, cadência 2-0-2..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-gray-700 outline-none transition"
                      />
                    </div>
                  </div>
                ))}

                {/* Botão para incluir novo exercício */}
                <button
                  type="button"
                  onClick={() => addExercicio(activeDayIndex)}
                  className="w-full py-3.5 border-2 border-dashed border-emerald-300 hover:border-emerald-500 text-emerald-700 hover:text-emerald-800 font-bold text-xs rounded-2xl transition cursor-pointer hover:bg-emerald-50/50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Incluir Exercício neste dia</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Histórico de Planos de Treino Salvos */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h4 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Histórico de Treinos Salvos</span>
            </h4>
            <p className="text-xs text-gray-500">
              Registros históricos das prescrições de treino salvas para este paciente
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-100">
            {planos.length} {planos.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {planos.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-gray-800">Nenhum treino gerado ainda</h5>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Clique no botão "✨ Gerar Plano com IA" ou "Plano de treino Manual" acima para prescrever o primeiro plano esportivo do paciente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {planos.map((plano) => {
              const isExpanded = selectedHistorico?.id === plano.id;
              let parsedData: PlanoTreinoData | null = null;
              try {
                parsedData = typeof plano.conteudo === 'string' ? JSON.parse(plano.conteudo) : plano.conteudo;
              } catch {
                parsedData = null;
              }

              return (
                <div key={plano.id} className="transition">
                  <div
                    onClick={() => setSelectedHistorico(isExpanded ? null : plano)}
                    className="p-4 sm:p-5 hover:bg-emerald-50/40 cursor-pointer transition space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <Dumbbell className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-gray-900 block truncate">
                            Plano Semanal de Treino
                          </span>
                          <span className="text-xs text-gray-500 flex items-center flex-wrap gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{new Date(plano.created_at).toLocaleDateString('pt-BR')}</span>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              <span>{new Date(plano.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedHistorico(isExpanded ? null : plano); }}
                        className="inline-flex items-center justify-center gap-1 h-8 px-2.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/60 rounded-lg transition shrink-0"
                      >
                        <span>{isExpanded ? 'Recolher' : 'Visualizar'}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    <div
                      className="pt-3 border-t border-gray-100 space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => { setPlanToSend(parsedData); setIsSendModalOpen(true); setCopiedText(false); }}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm active:scale-[0.98]"
                      >
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span>Enviar p/ Paciente</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (parsedData?.plano_treino_semanal) {
                            setCurrentPlan(parsedData);
                            setActiveDayIndex(0);
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                          }
                        }}
                        className="w-full inline-flex items-center justify-center h-10 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-[0.98] shadow-sm"
                      >
                        Carregar no Editor
                      </button>
                    </div>
                  </div>

                  {/* Detalhes expandidos com tabela dos exercícios */}
                  {isExpanded && parsedData?.plano_treino_semanal && (
                    <div className="p-4 sm:p-6 bg-gray-50/80 border-t border-gray-100 space-y-4">
                      {parsedData.plano_treino_semanal.map((diaObj, dIdx) => (
                        <div key={dIdx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                              <h5 className="text-sm font-black text-emerald-950">{diaObj.dia}</h5>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTipoColor(diaObj.tipo_treino)}`}>
                                {diaObj.tipo_treino}
                              </span>
                            </div>
                            {diaObj.duracao_minutos > 0 && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Timer className="w-3.5 h-3.5" /> {diaObj.duracao_minutos} min
                              </span>
                            )}
                          </div>

                          {diaObj.grupo_muscular && (
                            <p className="text-xs font-bold text-gray-700">
                              <Target className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                              Foco: {diaObj.grupo_muscular}
                            </p>
                          )}

                          {diaObj.exercicios.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase">
                                    <th className="py-2 pr-2">Exercício</th>
                                    <th className="py-2 px-2">Séries</th>
                                    <th className="py-2 px-2">Reps</th>
                                    <th className="py-2 px-2">Distância</th>
                                    <th className="py-2 px-2">Carga</th>
                                    <th className="py-2 px-2">Intensidade</th>
                                    <th className="py-2 px-2">Descanso</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {diaObj.exercicios.map((ex, eIdx) => (
                                    <tr key={eIdx} className="hover:bg-gray-50/60">
                                      <td className="py-2.5 pr-2">
                                        <span className="font-bold text-gray-900 block">{ex.nome}</span>
                                        {ex.tecnica && (
                                          <span className="text-[11px] text-gray-500 italic block mt-0.5">
                                            {ex.tecnica}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-2 font-medium text-gray-700">{ex.series || '-'}</td>
                                      <td className="py-2.5 px-2 font-medium text-gray-700">{ex.reps || '-'}</td>
                                      <td className="py-2.5 px-2 font-medium text-gray-700">{ex.distancia || '-'}</td>
                                      <td className="py-2.5 px-2 font-medium text-gray-700">{ex.carga || '-'}</td>
                                      <td className="py-2.5 px-2 font-medium text-gray-700">{ex.intensidade || '-'}</td>
                                      <td className="py-2.5 px-2 font-medium text-gray-700">{ex.descanso || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">
                              Dia de repouso / recuperação ativa programada.
                            </p>
                          )}

                          {diaObj.observacoes_do_dia && (
                            <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                              💡 {diaObj.observacoes_do_dia}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Envio para Paciente */}
      {isSendModalOpen && planToSend && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-600" />
                  <span>Enviar Sugestão de Treino</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">Envie o plano esportivo diretamente ao paciente</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-2xl transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-green-900 block">WhatsApp</span>
                  <span className="text-xs text-green-700">
                    {patientData.whatsapp || 'Número não cadastrado'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-blue-900 block">E-mail</span>
                  <span className="text-xs text-blue-700">{patientData.email || 'E-mail não cadastrado'}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center shrink-0">
                  <Copy className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-gray-900 block">
                    {copiedText ? '✅ Copiado!' : 'Copiar Resumo de Treino'}
                  </span>
                  <span className="text-xs text-gray-500">Copiar para a área de transferência</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSendModalOpen(false)}
              className="w-full py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-2xl transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
