import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  Clock,
  RotateCw,
  Search,
  Edit,
  Trash2,
  Table,
  CheckCircle2,
  Dumbbell,
  Loader2,
  X,
  Save,
  Plus,
  PlusCircle,
  Waves,
  Bike,
  Zap,
  Activity,
  Flame,
  PersonStanding,
} from 'lucide-react';
import { sql } from '../lib/neon';

interface Exercicio {
  nome: string;
  series: string;
  reps: string;
  distancia: string;
  carga: string;
  intensidade: string;
  descanso: string;
  tecnica?: string;
}

interface CardTreinoItem {
  dia: string;
  titulo?: string;
  tipo_treino: string;
  nivel?: string;
  frequencia?: string;
  duracao_minutos?: number;
  objetivo?: string;
  exercicios: Exercicio[];
  observacoes_do_dia?: string;
}

interface PlanoTreinoDB {
  id: string;
  paciente_id: string;
  nome_paciente?: string;
  conteudo: any;
  created_at: string;
}

interface TreinosPrescricaoProps {
  userId: string;
  onSelectPatient?: (patientId: string) => void;
}

const MODALIDADES = ['Musculação', 'Natação', 'Corrida', 'Ciclismo', 'Funcional', 'CrossFit', 'Pilates', 'Outro'];
const NIVEIS = ['INICIANTE', 'INTERMEDIÁRIO', 'AVANÇADO'];

// Configuração dos filtros de modalidade com ícones
const MODALITY_FILTERS = [
  { key: 'all', label: 'Todos', icon: Activity },
  { key: 'Musculação', label: 'Musculação', icon: Dumbbell },
  { key: 'Natação', label: 'Natação', icon: Waves },
  { key: 'Corrida', label: 'Corrida / Caminhada', icon: Flame },
  { key: 'Ciclismo', label: 'Ciclismo', icon: Bike },
  { key: 'Funcional', label: 'Treino Funcional / Cross', icon: Zap },
  { key: 'other', label: 'Outras Atividades', icon: PersonStanding },
];

const KNOWN_MODALITIES = ['Musculação', 'Natação', 'Corrida', 'Ciclismo', 'Funcional', 'CrossFit'];

function emptyExercicio(): Exercicio {
  return { nome: '', series: '3', reps: '12', distancia: '-', carga: '-', intensidade: 'RPE 7', descanso: '60s' };
}

export const TreinosPrescricao: React.FC<TreinosPrescricaoProps> = ({ userId }) => {
  const [planos, setPlanos] = useState<PlanoTreinoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal 1 — Ver & Editar Tabela
  const [tableModal, setTableModal] = useState<{
    planId: string;
    cardIndex: number;
    card: CardTreinoItem;
    pacienteNome: string;
    dirty: boolean;
  } | null>(null);

  // Modal 2 — Editar Card
  const [editingCard, setEditingCard] = useState<{
    planId: string;
    cardIndex: number;
    data: CardTreinoItem;
  } | null>(null);

  // Modal 3 — Novo Treino
  const [novoTreino, setNovoTreino] = useState<{
    open: boolean;
    pacientes: { id: string; nome: string }[];
    loadingPacientes: boolean;
    pacienteId: string;
    dia: string;
    titulo: string;
    tipo_treino: string;
    nivel: string;
    frequencia: string;
    duracao_minutos: number;
    objetivo: string;
    exercicios: Exercicio[];
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await sql.query(
        `SELECT pt.id, pt.paciente_id, pt.conteudo, pt.created_at, p.nome as nome_paciente
         FROM public.planos_treino pt
         JOIN public.pacientes p ON pt.paciente_id = p.id
         WHERE p.nutricionista_id = $1
         ORDER BY pt.created_at DESC`,
        [userId]
      );
      setPlanos(res as PlanoTreinoDB[]);
    } catch (err) {
      console.error('Erro ao carregar planos de treino:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  // Extrair todos os cards
  const allCards: { planId: string; pacienteNome: string; cardIndex: number; card: CardTreinoItem; createdAt: string }[] = [];
  planos.forEach((p) => {
    let parsed: any = null;
    try {
      parsed = typeof p.conteudo === 'string' ? JSON.parse(p.conteudo) : p.conteudo;
    } catch {
      parsed = null;
    }
    if (parsed && Array.isArray(parsed.plano_treino_semanal)) {
      parsed.plano_treino_semanal.forEach((c: any, idx: number) => {
        allCards.push({
          planId: p.id,
          pacienteNome: p.nome_paciente || 'Paciente',
          cardIndex: idx,
          card: {
            dia: c.dia || `Treino ${String.fromCharCode(65 + idx)}`,
            titulo: c.titulo || c.grupo_muscular || 'Geral',
            tipo_treino: c.tipo_treino || parsed.modalidade || 'Musculação',
            nivel: c.nivel || parsed.nivel || 'INTERMEDIÁRIO',
            frequencia: c.frequencia || parsed.frequencia || '3x por semana',
            duracao_minutos: c.duracao_minutos || 45,
            objetivo: c.objetivo || 'Hipertrofia muscular e ganho de força',
            exercicios: Array.isArray(c.exercicios) ? c.exercicios : [],
            observacoes_do_dia: c.observacoes_do_dia || '',
          },
          createdAt: p.created_at,
        });
      });
    }
  });

  // Contagem por modalidade para os filtros
  const countByModality = (key: string) => {
    if (key === 'all') return allCards.length;
    if (key === 'other') return allCards.filter((c) => !KNOWN_MODALITIES.some((m) => c.card.tipo_treino.includes(m))).length;
    return allCards.filter((c) => c.card.tipo_treino.includes(key)).length;
  };

  // Filtro ativo + busca
  const filteredCards = allCards.filter((item) => {
    const matchSearch =
      item.pacienteNome.toLowerCase().includes(search.toLowerCase()) ||
      item.card.dia.toLowerCase().includes(search.toLowerCase()) ||
      (item.card.titulo || '').toLowerCase().includes(search.toLowerCase()) ||
      item.card.tipo_treino.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      activeFilter === 'all' ||
      (activeFilter === 'other'
        ? !KNOWN_MODALITIES.some((m) => item.card.tipo_treino.includes(m))
        : item.card.tipo_treino.includes(activeFilter));

    return matchSearch && matchFilter;
  });

  // ── Salvar edição do card (Modal 2) ──────────────────────────────────────────
  const handleSaveCardEdit = async () => {
    if (!editingCard) return;
    try {
      setIsSaving(true);
      const targetPlan = planos.find((p) => p.id === editingCard.planId);
      if (!targetPlan) return;
      let parsed = typeof targetPlan.conteudo === 'string' ? JSON.parse(targetPlan.conteudo) : { ...targetPlan.conteudo };
      if (!parsed.plano_treino_semanal) parsed.plano_treino_semanal = [];
      parsed.plano_treino_semanal[editingCard.cardIndex] = editingCard.data;
      await sql.query(`UPDATE public.planos_treino SET conteudo = $1 WHERE id = $2`, [JSON.stringify(parsed), editingCard.planId]);
      setPlanos((prev) => prev.map((p) => (p.id === editingCard.planId ? { ...p, conteudo: parsed } : p)));
      setEditingCard(null);
      showToast('Treino atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar treino:', err);
      alert('Falha ao salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Salvar tabela editada (Modal 1) ──────────────────────────────────────────
  const handleSaveTable = async () => {
    if (!tableModal) return;
    try {
      setIsSaving(true);
      const targetPlan = planos.find((p) => p.id === tableModal.planId);
      if (!targetPlan) return;
      let parsed = typeof targetPlan.conteudo === 'string' ? JSON.parse(targetPlan.conteudo) : { ...targetPlan.conteudo };
      parsed.plano_treino_semanal[tableModal.cardIndex] = tableModal.card;
      await sql.query(`UPDATE public.planos_treino SET conteudo = $1 WHERE id = $2`, [JSON.stringify(parsed), tableModal.planId]);
      setPlanos((prev) => prev.map((p) => (p.id === tableModal.planId ? { ...p, conteudo: parsed } : p)));
      setTableModal((prev) => (prev ? { ...prev, dirty: false } : null));
      showToast('Tabela de exercícios salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar tabela:', err);
      alert('Falha ao salvar a tabela.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTableCell = (exIdx: number, field: keyof Exercicio, value: string) => {
    if (!tableModal) return;
    const updated = tableModal.card.exercicios.map((ex, i) => (i === exIdx ? { ...ex, [field]: value } : ex));
    setTableModal({ ...tableModal, card: { ...tableModal.card, exercicios: updated }, dirty: true });
  };

  const addTableRow = () => {
    if (!tableModal) return;
    setTableModal({
      ...tableModal,
      card: { ...tableModal.card, exercicios: [...tableModal.card.exercicios, emptyExercicio()] },
      dirty: true,
    });
  };

  const removeTableRow = (idx: number) => {
    if (!tableModal) return;
    setTableModal({
      ...tableModal,
      card: { ...tableModal.card, exercicios: tableModal.card.exercicios.filter((_, i) => i !== idx) },
      dirty: true,
    });
  };

  // ── Excluir card ──────────────────────────────────────────────────────────────
  const handleDeleteCard = async (planId: string, cardIndex: number) => {
    if (!confirm('Deseja realmente remover este treino?')) return;
    try {
      const targetPlan = planos.find((p) => p.id === planId);
      if (!targetPlan) return;
      let parsed = typeof targetPlan.conteudo === 'string' ? JSON.parse(targetPlan.conteudo) : { ...targetPlan.conteudo };
      parsed.plano_treino_semanal = parsed.plano_treino_semanal.filter((_: any, idx: number) => idx !== cardIndex);
      if (parsed.plano_treino_semanal.length === 0) {
        await sql.query(`DELETE FROM public.planos_treino WHERE id = $1`, [planId]);
        setPlanos((prev) => prev.filter((p) => p.id !== planId));
      } else {
        await sql.query(`UPDATE public.planos_treino SET conteudo = $1 WHERE id = $2`, [JSON.stringify(parsed), planId]);
        setPlanos((prev) => prev.map((p) => (p.id === planId ? { ...p, conteudo: parsed } : p)));
      }
      showToast('Treino removido com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // ── Abrir Modal Novo Treino ───────────────────────────────────────────────────
  const handleOpenNovoTreino = async () => {
    setNovoTreino({
      open: true,
      pacientes: [],
      loadingPacientes: true,
      pacienteId: '',
      dia: 'Treino A',
      titulo: '',
      tipo_treino: activeFilter !== 'all' && activeFilter !== 'other' ? activeFilter : 'Musculação',
      nivel: 'INTERMEDIÁRIO',
      frequencia: '3x por semana',
      duracao_minutos: 60,
      objetivo: '',
      exercicios: [emptyExercicio()],
    });
    try {
      const res = await sql.query(
        `SELECT id, nome FROM public.pacientes WHERE nutricionista_id = $1 ORDER BY nome`,
        [userId]
      );
      setNovoTreino((prev) =>
        prev
          ? {
              ...prev,
              pacientes: res as { id: string; nome: string }[],
              loadingPacientes: false,
              pacienteId: (res as any[])[0]?.id || '',
            }
          : null
      );
    } catch {
      setNovoTreino((prev) => (prev ? { ...prev, loadingPacientes: false } : null));
    }
  };

  const handleSaveNovoTreino = async () => {
    if (!novoTreino || !novoTreino.pacienteId) {
      alert('Selecione um paciente.');
      return;
    }
    try {
      setIsSaving(true);
      const newCard = {
        dia: novoTreino.dia,
        titulo: novoTreino.titulo,
        tipo_treino: novoTreino.tipo_treino,
        nivel: novoTreino.nivel,
        frequencia: novoTreino.frequencia,
        duracao_minutos: novoTreino.duracao_minutos,
        objetivo: novoTreino.objetivo,
        exercicios: novoTreino.exercicios,
        observacoes_do_dia: '',
      };
      const existing = planos.find((p) => p.paciente_id === novoTreino.pacienteId);
      if (existing) {
        let parsed = typeof existing.conteudo === 'string' ? JSON.parse(existing.conteudo) : { ...existing.conteudo };
        if (!parsed.plano_treino_semanal) parsed.plano_treino_semanal = [];
        parsed.plano_treino_semanal.push(newCard);
        await sql.query(`UPDATE public.planos_treino SET conteudo = $1 WHERE id = $2`, [JSON.stringify(parsed), existing.id]);
        setPlanos((prev) => prev.map((p) => (p.id === existing.id ? { ...p, conteudo: parsed } : p)));
      } else {
        const conteudo = { plano_treino_semanal: [newCard] };
        const res = await sql.query(
          `INSERT INTO public.planos_treino (paciente_id, conteudo) VALUES ($1, $2) RETURNING id, paciente_id, conteudo, created_at`,
          [novoTreino.pacienteId, JSON.stringify(conteudo)]
        );
        const inserted = (res as any[])[0];
        const pac = novoTreino.pacientes.find((p) => p.id === novoTreino.pacienteId);
        setPlanos((prev) => [...prev, { ...inserted, nome_paciente: pac?.nome || 'Paciente' }]);
      }
      setNovoTreino(null);
      showToast('Novo treino criado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar treino:', err);
      alert('Falha ao criar treino.');
    } finally {
      setIsSaving(false);
    }
  };

  const nivelColor = (nivel?: string) => {
    if (!nivel) return 'text-gray-400 bg-gray-100';
    if (nivel.includes('INICI')) return 'text-emerald-700 bg-emerald-50';
    if (nivel.includes('AVAN')) return 'text-rose-600 bg-rose-50';
    return 'text-amber-700 bg-amber-50';
  };

  const modalidadeStyle = (tipo: string) => {
    if (tipo.includes('Nat')) return { badge: 'bg-blue-100 text-blue-800', icon: '🏊' };
    if (tipo.includes('Corr') || tipo.includes('Camin')) return { badge: 'bg-orange-100 text-orange-800', icon: '🏃' };
    if (tipo.includes('Cicl')) return { badge: 'bg-purple-100 text-purple-800', icon: '🚴' };
    if (tipo.includes('Func') || tipo.includes('Cross')) return { badge: 'bg-rose-100 text-rose-800', icon: '⚡' };
    if (tipo.includes('Pilat')) return { badge: 'bg-pink-100 text-pink-800', icon: '🧘' };
    return { badge: 'bg-amber-100 text-amber-800', icon: '🏋️' };
  };

  const inputCell = 'w-full px-1.5 py-1 bg-white border border-gray-200 rounded text-xs font-medium focus:border-emerald-500 outline-none min-w-[60px]';

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER TOPO (mini) ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
            PRESCRIÇÃO DE TREINOS
          </span>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Treinos &amp; Exercícios</h2>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* ── HERO BANNER VERDE ESCURO ──────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden px-8 py-8"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 70%, #059669 100%)',
        }}
      >
        {/* Círculos decorativos de fundo */}
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #34d399, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6ee7b7, transparent)', transform: 'translateY(40%)' }} />

        <div className="relative z-10 max-w-2xl space-y-3">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[11px] font-bold px-3 py-1 rounded-full">
            <span>🏋️</span>
            <span>Nutrição Esportiva &amp; Performance</span>
          </div>

          {/* Título */}
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            Prescrição &amp; Acompanhamento de Treinos{' '}
            <span className="text-2xl">🏆</span>
          </h1>

          {/* Subtítulo */}
          <p className="text-sm text-emerald-100/90 leading-relaxed max-w-lg">
            Tenha total liberdade para criar e editar seus treinos: adicione exercícios, altere séries, reps, distâncias,
            cargas e tempos de descanso em tempo real.
          </p>

          {/* Botão CTA */}
          <button
            type="button"
            onClick={handleOpenNovoTreino}
            className="inline-flex items-center gap-2 mt-1 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Criar Nova Ficha de Treino
          </button>
        </div>
      </div>

      {/* ── FILTROS POR MODALIDADE ────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {MODALITY_FILTERS.map(({ key, label, icon: Icon }) => {
          const count = countByModality(key);
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition cursor-pointer text-center ${
                isActive
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <span className="text-[10px] font-black leading-tight">{label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── BARRA DE BUSCA + BOTÃO ────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por paciente, objetivo ou título do treino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:border-emerald-500 outline-none shadow-xs"
          />
        </div>
        <button
          type="button"
          onClick={handleOpenNovoTreino}
          className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-sm transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar + treino</span>
        </button>
      </div>

      {/* ── GRID DE CARDS ─────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs font-semibold">Carregando treinos...</span>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-white rounded-3xl p-14 text-center border border-emerald-100 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-3xl">
            🏋️
          </div>
          <h3 className="text-base font-bold text-gray-900">Nenhum treino encontrado</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {search || activeFilter !== 'all'
              ? 'Tente ajustar os filtros ou a busca.'
              : 'Clique em "+ Adicionar + treino" para criar o primeiro plano.'}
          </p>
          <button
            type="button"
            onClick={handleOpenNovoTreino}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Criar Primeiro Treino
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map(({ planId, pacienteNome, cardIndex, card }) => {
            const mStyle = modalidadeStyle(card.tipo_treino);
            return (
              <div
                key={`${planId}-${cardIndex}`}
                className="bg-white rounded-3xl border border-gray-200/90 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Badge Modalidade + Nível */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${mStyle.badge}`}>
                      <span>{mStyle.icon}</span>
                      {card.tipo_treino}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${nivelColor(card.nivel)}`}>
                      {card.nivel || 'INTERMEDIÁRIO'}
                    </span>
                  </div>

                  {/* Título */}
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight leading-tight">
                      {card.dia}{card.titulo ? ` — ${card.titulo}` : ''}
                    </h3>
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3 text-gray-400" /> {pacienteNome}
                    </p>
                  </div>

                  {/* Objetivo */}
                  {card.objetivo && (
                    <p className="text-xs text-gray-600 leading-snug">
                      <span className="font-bold text-gray-700">Objetivo: </span>{card.objetivo}
                    </p>
                  )}

                  {/* Frequência e Duração */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" /> {card.frequencia || '3x por semana'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" /> ~{card.duracao_minutos || 45} min
                    </span>
                  </div>

                  {/* Bloco Exercícios */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                      <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                        EXERCÍCIOS ({card.exercicios.length})
                      </span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        Campos Editáveis
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs">
                      {card.exercicios.slice(0, 3).map((ex, exIdx) => (
                        <li key={exIdx} className="flex items-baseline gap-1 text-gray-800 leading-snug">
                          <span className="text-emerald-500 font-bold shrink-0">•</span>
                          <span className="font-bold text-gray-900 truncate max-w-[150px]">{ex.nome}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            ({ex.series}{ex.reps && ex.reps !== '-' ? ` × ${ex.reps}` : ''}
                            {ex.distancia && ex.distancia !== '-' ? `, ${ex.distancia}` : ''})
                          </span>
                          {ex.carga && ex.carga !== '-' && (
                            <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-1 rounded shrink-0">
                              [{ex.carga}]
                            </span>
                          )}
                        </li>
                      ))}
                      {card.exercicios.length > 3 && (
                        <li className="text-[10px] text-gray-400 italic">+ {card.exercicios.length - 3} exercício(s)</li>
                      )}
                      {card.exercicios.length === 0 && (
                        <li className="text-[10px] text-gray-400 italic">Nenhum exercício adicionado</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() =>
                      setTableModal({
                        planId,
                        cardIndex,
                        card: JSON.parse(JSON.stringify(card)),
                        pacienteNome,
                        dirty: false,
                      })
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5" />
                    Ver &amp; Editar Tabela
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCard({ planId, cardIndex, data: JSON.parse(JSON.stringify(card)) })}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                    title="Editar treino"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(planId, cardIndex)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Remover treino"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 1 — VER & EDITAR TABELA
      ══════════════════════════════════════════════════════════ */}
      {tableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                  {tableModal.card.tipo_treino} • {tableModal.card.nivel || 'INTERMEDIÁRIO'} • {tableModal.pacienteNome}
                </span>
                <h3 className="text-xl font-black text-gray-900">
                  {tableModal.card.dia}{tableModal.card.titulo ? ` — ${tableModal.card.titulo}` : ''}
                </h3>
              </div>
              <button type="button" onClick={() => setTableModal(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-auto flex-1 px-6 py-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    {['#', 'Exercício', 'Séries', 'Reps', 'Distância', 'Carga', 'Intensidade', 'Descanso', ''].map((h) => (
                      <th key={h} className="py-2.5 px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableModal.card.exercicios.map((ex, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 group">
                      <td className="py-2 px-3 font-bold text-gray-400">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <input type="text" value={ex.nome} placeholder="Nome do exercício"
                          onChange={(e) => updateTableCell(idx, 'nome', e.target.value)}
                          className={`${inputCell} min-w-[160px] font-bold`} />
                      </td>
                      {(['series', 'reps', 'distancia', 'carga', 'intensidade', 'descanso'] as (keyof Exercicio)[]).map((f) => (
                        <td key={f} className="py-2 px-3">
                          <input type="text" value={(ex as any)[f]}
                            onChange={(e) => updateTableCell(idx, f, e.target.value)}
                            className={inputCell} />
                        </td>
                      ))}
                      <td className="py-2 px-2">
                        <button type="button" onClick={() => removeTableRow(idx)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={addTableRow}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition cursor-pointer">
                <PlusCircle className="w-3.5 h-3.5" /> Adicionar Exercício
              </button>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center gap-3 shrink-0">
              {tableModal.dirty && <span className="text-xs text-amber-600 font-semibold">● Alterações não salvas</span>}
              <div className="flex items-center gap-3 ml-auto">
                <button type="button" onClick={() => setTableModal(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">
                  Fechar
                </button>
                <button type="button" disabled={isSaving || !tableModal.dirty} onClick={handleSaveTable}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar Tabela
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 2 — EDITAR METADADOS DO CARD
      ══════════════════════════════════════════════════════════ */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">Editar {editingCard.data.dia}</h3>
                <p className="text-xs text-gray-500">Modifique os campos e exercícios livremente</p>
              </div>
              <button type="button" onClick={() => setEditingCard(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Nome do Treino', field: 'dia', placeholder: 'ex: Treino A' },
                  { label: 'Título / Grupo', field: 'titulo', placeholder: 'ex: Peito e Tríceps' },
                  { label: 'Frequência', field: 'frequencia', placeholder: '3x por semana' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{label}</label>
                    <input type="text" value={(editingCard.data as any)[field] || ''} placeholder={placeholder}
                      onChange={(e) => setEditingCard({ ...editingCard, data: { ...editingCard.data, [field]: e.target.value } })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500" />
                  </div>
                ))}
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Objetivo</label>
                  <input type="text" value={editingCard.data.objetivo || ''} placeholder="ex: Hipertrofia muscular..."
                    onChange={(e) => setEditingCard({ ...editingCard, data: { ...editingCard.data, objetivo: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Modalidade</label>
                  <select value={editingCard.data.tipo_treino}
                    onChange={(e) => setEditingCard({ ...editingCard, data: { ...editingCard.data, tipo_treino: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer">
                    {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nível</label>
                  <select value={editingCard.data.nivel || 'INTERMEDIÁRIO'}
                    onChange={(e) => setEditingCard({ ...editingCard, data: { ...editingCard.data, nivel: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer">
                    {NIVEIS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duração (min)</label>
                  <input type="number" value={editingCard.data.duracao_minutos || 45}
                    onChange={(e) => setEditingCard({ ...editingCard, data: { ...editingCard.data, duracao_minutos: Number(e.target.value) } })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500" />
                </div>
              </div>

              {/* Exercícios */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700 uppercase">Exercícios ({editingCard.data.exercicios.length})</span>
                  <button type="button"
                    onClick={() => setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: [...editingCard.data.exercicios, emptyExercicio()] } })}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 cursor-pointer">
                    + Adicionar
                  </button>
                </div>
                {editingCard.data.exercicios.map((ex, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                      <button type="button"
                        onClick={() => setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: editingCard.data.exercicios.filter((_, i) => i !== idx) } })}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer">Remover</button>
                    </div>
                    <input type="text" placeholder="Nome do Exercício" value={ex.nome}
                      onChange={(e) => { const u = [...editingCard.data.exercicios]; u[idx] = { ...u[idx], nome: e.target.value }; setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: u } }); }}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold" />
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(['series', 'reps', 'distancia', 'carga', 'intensidade', 'descanso'] as (keyof Exercicio)[]).map((field) => (
                        <div key={field}>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">
                            {field === 'series' ? 'Séries' : field === 'reps' ? 'Reps' : field === 'distancia' ? 'Dist.' : field === 'carga' ? 'Carga' : field === 'intensidade' ? 'Int.' : 'Desc.'}
                          </label>
                          <input type="text" value={(ex as any)[field]}
                            onChange={(e) => { const u = [...editingCard.data.exercicios]; u[idx] = { ...u[idx], [field]: e.target.value }; setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: u } }); }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setEditingCard(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancelar</button>
              <button type="button" disabled={isSaving} onClick={handleSaveCardEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 3 — NOVO TREINO
      ══════════════════════════════════════════════════════════ */}
      {novoTreino && novoTreino.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">Nova Ficha de Treino</h3>
                <p className="text-xs text-gray-500">Preencha os campos e adicione os exercícios</p>
              </div>
              <button type="button" onClick={() => setNovoTreino(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Paciente */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Paciente *</label>
                {novoTreino.loadingPacientes ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando pacientes...
                  </div>
                ) : (
                  <select value={novoTreino.pacienteId}
                    onChange={(e) => setNovoTreino({ ...novoTreino, pacienteId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer">
                    {novoTreino.pacientes.length === 0 && <option value="">Nenhum paciente cadastrado</option>}
                    {novoTreino.pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nome do Treino</label>
                  <input type="text" value={novoTreino.dia} placeholder="ex: Treino A"
                    onChange={(e) => setNovoTreino({ ...novoTreino, dia: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Título / Grupo</label>
                  <input type="text" value={novoTreino.titulo} placeholder="ex: Peito e Tríceps"
                    onChange={(e) => setNovoTreino({ ...novoTreino, titulo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Modalidade</label>
                  <select value={novoTreino.tipo_treino}
                    onChange={(e) => setNovoTreino({ ...novoTreino, tipo_treino: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer">
                    {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nível</label>
                  <select value={novoTreino.nivel}
                    onChange={(e) => setNovoTreino({ ...novoTreino, nivel: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer">
                    {NIVEIS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Frequência</label>
                  <input type="text" value={novoTreino.frequencia} placeholder="3x por semana"
                    onChange={(e) => setNovoTreino({ ...novoTreino, frequencia: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duração (min)</label>
                  <input type="number" value={novoTreino.duracao_minutos}
                    onChange={(e) => setNovoTreino({ ...novoTreino, duracao_minutos: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500" />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Objetivo</label>
                  <input type="text" value={novoTreino.objetivo} placeholder="ex: Hipertrofia muscular..."
                    onChange={(e) => setNovoTreino({ ...novoTreino, objetivo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500" />
                </div>
              </div>

              {/* Exercícios */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700 uppercase">Exercícios ({novoTreino.exercicios.length})</span>
                  <button type="button"
                    onClick={() => setNovoTreino({ ...novoTreino, exercicios: [...novoTreino.exercicios, emptyExercicio()] })}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 cursor-pointer">
                    + Adicionar
                  </button>
                </div>
                {novoTreino.exercicios.map((ex, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                      <button type="button"
                        onClick={() => setNovoTreino({ ...novoTreino, exercicios: novoTreino.exercicios.filter((_, i) => i !== idx) })}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer">Remover</button>
                    </div>
                    <input type="text" placeholder="Nome do Exercício" value={ex.nome}
                      onChange={(e) => { const u = [...novoTreino.exercicios]; u[idx] = { ...u[idx], nome: e.target.value }; setNovoTreino({ ...novoTreino, exercicios: u }); }}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold" />
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(['series', 'reps', 'distancia', 'carga', 'intensidade', 'descanso'] as (keyof Exercicio)[]).map((field) => (
                        <div key={field}>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">
                            {field === 'series' ? 'Séries' : field === 'reps' ? 'Reps' : field === 'distancia' ? 'Dist.' : field === 'carga' ? 'Carga' : field === 'intensidade' ? 'Int.' : 'Desc.'}
                          </label>
                          <input type="text" value={(ex as any)[field]}
                            onChange={(e) => { const u = [...novoTreino.exercicios]; u[idx] = { ...u[idx], [field]: e.target.value }; setNovoTreino({ ...novoTreino, exercicios: u }); }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setNovoTreino(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancelar</button>
              <button type="button" disabled={isSaving} onClick={handleSaveNovoTreino}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Criar Treino
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
