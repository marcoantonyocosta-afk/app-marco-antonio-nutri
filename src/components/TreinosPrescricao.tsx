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

const MODALIDADES = ['Musculação', 'Natação', 'Corrida', 'Ciclismo', 'Funcional', 'Pilates', 'CrossFit', 'Outro'];
const NIVEIS = ['INICIANTE', 'INTERMEDIÁRIO', 'AVANÇADO'];

function emptyExercicio(): Exercicio {
  return { nome: '', series: '3', reps: '12', distancia: '-', carga: '-', intensidade: 'RPE 7', descanso: '60s' };
}

export const TreinosPrescricao: React.FC<TreinosPrescricaoProps> = ({ userId }) => {
  const [planos, setPlanos] = useState<PlanoTreinoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal 1 — Ver & Editar Tabela (inline edit na tabela)
  const [tableModal, setTableModal] = useState<{
    planId: string;
    cardIndex: number;
    card: CardTreinoItem;
    pacienteNome: string;
    dirty: boolean;
  } | null>(null);

  // Modal 2 — Editar Card (meta dados + exercícios completos)
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

  const filteredCards = allCards.filter(
    (item) =>
      item.pacienteNome.toLowerCase().includes(search.toLowerCase()) ||
      item.card.dia.toLowerCase().includes(search.toLowerCase()) ||
      (item.card.titulo || '').toLowerCase().includes(search.toLowerCase()) ||
      item.card.tipo_treino.toLowerCase().includes(search.toLowerCase())
  );

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
      setTableModal((prev) => prev ? { ...prev, dirty: false } : null);
      showToast('Tabela de exercícios salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar tabela:', err);
      alert('Falha ao salvar a tabela.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Atualizar célula na tabela ────────────────────────────────────────────────
  const updateTableCell = (exIdx: number, field: keyof Exercicio, value: string) => {
    if (!tableModal) return;
    const updated = tableModal.card.exercicios.map((ex, i) =>
      i === exIdx ? { ...ex, [field]: value } : ex
    );
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
      tipo_treino: 'Musculação',
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
      setNovoTreino((prev) => prev ? { ...prev, pacientes: res as { id: string; nome: string }[], loadingPacientes: false, pacienteId: (res as any[])[0]?.id || '' } : null);
    } catch {
      setNovoTreino((prev) => prev ? { ...prev, loadingPacientes: false } : null);
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

      // Verificar se já existe plano para esse paciente
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
    if (!nivel) return 'text-gray-400';
    if (nivel.includes('INICI')) return 'text-emerald-600';
    if (nivel.includes('AVAN')) return 'text-rose-600';
    return 'text-amber-600';
  };

  const modalidadeColor = (tipo: string) => {
    if (tipo === 'Natação') return 'bg-blue-100/80 text-blue-800';
    if (tipo === 'Corrida') return 'bg-orange-100/80 text-orange-800';
    if (tipo === 'Ciclismo') return 'bg-purple-100/80 text-purple-800';
    if (tipo === 'Funcional' || tipo === 'CrossFit') return 'bg-rose-100/80 text-rose-800';
    return 'bg-amber-100/70 text-amber-800';
  };

  const inputCell =
    'w-full px-1.5 py-1 bg-white border border-gray-200 rounded text-xs font-medium focus:border-emerald-500 outline-none min-w-[60px]';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">
            PRESCRIÇÃO DE TREINOS
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Treinos &amp; Exercícios
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar treino ou aluno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-emerald-500 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenNovoTreino}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Treino</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs font-semibold">Carregando treinos e exercícios...</span>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-emerald-100 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Nenhum treino prescrito no momento</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Clique em <strong>"+ Novo Treino"</strong> para criar o primeiro plano de treino para um paciente.
          </p>
          <button
            type="button"
            onClick={handleOpenNovoTreino}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Criar Primeiro Treino
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map(({ planId, pacienteNome, cardIndex, card }) => (
            <div
              key={`${planId}-${cardIndex}`}
              className="bg-white rounded-3xl border border-gray-200/90 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Badge Modalidade + Nível */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Dumbbell className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${modalidadeColor(card.tipo_treino)}`}>
                      {card.tipo_treino}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${nivelColor(card.nivel)}`}>
                    {card.nivel || 'INTERMEDIÁRIO'}
                  </span>
                </div>

                {/* Título */}
                <div>
                  <h3 className="text-sm font-black text-gray-900 tracking-tight leading-tight">
                    {card.dia}{card.titulo ? ` — ${card.titulo}` : ''}
                  </h3>
                  <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3 text-gray-400" />
                    {pacienteNome}
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
                <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                      EXERCÍCIOS ({card.exercicios.length})
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                      Campos Editáveis
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs">
                    {card.exercicios.slice(0, 3).map((ex, exIdx) => (
                      <li key={exIdx} className="flex items-baseline gap-1 text-gray-800 leading-snug">
                        <span className="text-emerald-600 font-bold shrink-0">•</span>
                        <span className="font-bold text-gray-900 truncate max-w-[160px]">{ex.nome}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          ({ex.series}{ex.reps && ex.reps !== '-' ? ` × ${ex.reps}` : ''}{ex.distancia && ex.distancia !== '-' ? `, ${ex.distancia}` : ''})
                        </span>
                        {ex.carga && ex.carga !== '-' && (
                          <span className="text-[9px] text-rose-500 font-semibold bg-rose-50 px-1 rounded shrink-0">
                            [{ex.carga}]
                          </span>
                        )}
                      </li>
                    ))}
                    {card.exercicios.length > 3 && (
                      <li className="text-[10px] text-gray-400 italic">
                        + {card.exercicios.length - 3} exercício(s)
                      </li>
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
                  <span>Ver &amp; Editar Tabela</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setEditingCard({ planId, cardIndex, data: JSON.parse(JSON.stringify(card)) })
                  }
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
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1 — VER & EDITAR TABELA COMPLETA DE EXERCÍCIOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                  {tableModal.card.tipo_treino} • {tableModal.card.nivel || 'INTERMEDIÁRIO'} • {tableModal.pacienteNome}
                </span>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                  {tableModal.card.dia}{tableModal.card.titulo ? ` — ${tableModal.card.titulo}` : ''}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTableModal(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabela editável */}
            <div className="overflow-auto flex-1 px-6 py-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Exercício</th>
                    <th className="py-2.5 px-3 min-w-[80px]">Séries</th>
                    <th className="py-2.5 px-3 min-w-[80px]">Reps</th>
                    <th className="py-2.5 px-3 min-w-[80px]">Distância</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Carga</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Intensidade</th>
                    <th className="py-2.5 px-3 min-w-[80px]">Descanso</th>
                    <th className="py-2.5 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableModal.card.exercicios.map((ex, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 group">
                      <td className="py-2 px-3 font-bold text-gray-400">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ex.nome}
                          placeholder="Nome do exercício"
                          onChange={(e) => updateTableCell(idx, 'nome', e.target.value)}
                          className={`${inputCell} min-w-[160px] font-bold`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ex.series}
                          placeholder="ex: 4"
                          onChange={(e) => updateTableCell(idx, 'series', e.target.value)}
                          className={inputCell}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ex.reps}
                          placeholder="ex: 12"
                          onChange={(e) => updateTableCell(idx, 'reps', e.target.value)}
                          className={inputCell}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ex.distancia}
                          placeholder="ex: 50m"
                          onChange={(e) => updateTableCell(idx, 'distancia', e.target.value)}
                          className={inputCell}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ex.carga}
                          placeholder="ex: 20kg"
                          onChange={(e) => updateTableCell(idx, 'carga', e.target.value)}
                          className={inputCell}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ex.intensidade}
                          placeholder="RPE / %"
                          onChange={(e) => updateTableCell(idx, 'intensidade', e.target.value)}
                          className={inputCell}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ex.descanso}
                          placeholder="ex: 60s"
                          onChange={(e) => updateTableCell(idx, 'descanso', e.target.value)}
                          className={inputCell}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <button
                          type="button"
                          onClick={() => removeTableRow(idx)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          title="Remover linha"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Adicionar linha */}
              <button
                type="button"
                onClick={addTableRow}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Adicionar Exercício
              </button>

              {/* Observações */}
              {tableModal.card.observacoes_do_dia && (
                <div className="mt-4 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-900 font-medium">
                  <span className="font-bold">Observações: </span>
                  {tableModal.card.observacoes_do_dia}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-between shrink-0 gap-3">
              {tableModal.dirty && (
                <span className="text-xs text-amber-600 font-semibold">● Alterações não salvas</span>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setTableModal(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={isSaving || !tableModal.dirty}
                  onClick={handleSaveTable}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar Tabela
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2 — EDITAR METADADOS DO CARD (LÁPIS)
      ══════════════════════════════════════════════════════════════════════ */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">Editar {editingCard.data.dia}</h3>
                <p className="text-xs text-gray-500">Modifique os campos e exercícios livremente</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Meta campos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Nome do Treino (Dia)', field: 'dia' as const, placeholder: 'ex: Treino A' },
                  { label: 'Título / Grupo', field: 'titulo' as const, placeholder: 'ex: Peito e Tríceps' },
                  { label: 'Objetivo', field: 'objetivo' as const, placeholder: 'Hipertrofia...' },
                  { label: 'Frequência', field: 'frequencia' as const, placeholder: '3x por semana' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field} className={field === 'objetivo' ? 'col-span-2 sm:col-span-3' : ''}>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{label}</label>
                    <input
                      type="text"
                      value={(editingCard.data as any)[field] || ''}
                      placeholder={placeholder}
                      onChange={(e) =>
                        setEditingCard({ ...editingCard, data: { ...editingCard.data, [field]: e.target.value } })
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Modalidade</label>
                  <select
                    value={editingCard.data.tipo_treino}
                    onChange={(e) =>
                      setEditingCard({ ...editingCard, data: { ...editingCard.data, tipo_treino: e.target.value } })
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nível</label>
                  <select
                    value={editingCard.data.nivel || 'INTERMEDIÁRIO'}
                    onChange={(e) =>
                      setEditingCard({ ...editingCard, data: { ...editingCard.data, nivel: e.target.value } })
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {NIVEIS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duração (min)</label>
                  <input
                    type="number"
                    value={editingCard.data.duracao_minutos || 45}
                    onChange={(e) =>
                      setEditingCard({ ...editingCard, data: { ...editingCard.data, duracao_minutos: Number(e.target.value) } })
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Exercícios */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Exercícios ({editingCard.data.exercicios.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCard({
                        ...editingCard,
                        data: { ...editingCard.data, exercicios: [...editingCard.data.exercicios, emptyExercicio()] },
                      })
                    }
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 transition cursor-pointer"
                  >
                    + Adicionar
                  </button>
                </div>

                {editingCard.data.exercicios.map((ex, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingCard({
                            ...editingCard,
                            data: {
                              ...editingCard.data,
                              exercicios: editingCard.data.exercicios.filter((_, i) => i !== idx),
                            },
                          })
                        }
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>

                    {/* Linha 1: nome */}
                    <input
                      type="text"
                      placeholder="Nome do Exercício"
                      value={ex.nome}
                      onChange={(e) => {
                        const updated = [...editingCard.data.exercicios];
                        updated[idx] = { ...updated[idx], nome: e.target.value };
                        setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: updated } });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                    />

                    {/* Linha 2: campos */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(['series', 'reps', 'distancia', 'carga', 'intensidade', 'descanso'] as (keyof Exercicio)[]).map((field) => (
                        <div key={field}>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">
                            {field === 'series' ? 'Séries' : field === 'reps' ? 'Reps' : field === 'distancia' ? 'Dist.' : field === 'carga' ? 'Carga' : field === 'intensidade' ? 'Int.' : 'Desc.'}
                          </label>
                          <input
                            type="text"
                            value={(ex as any)[field]}
                            onChange={(e) => {
                              const updated = [...editingCard.data.exercicios];
                              updated[idx] = { ...updated[idx], [field]: e.target.value };
                              setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: updated } });
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveCardEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3 — NOVO TREINO
      ══════════════════════════════════════════════════════════════════════ */}
      {novoTreino && novoTreino.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">Novo Plano de Treino</h3>
                <p className="text-xs text-gray-500">Preencha os campos e adicione os exercícios</p>
              </div>
              <button
                type="button"
                onClick={() => setNovoTreino(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition cursor-pointer"
              >
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
                  <select
                    value={novoTreino.pacienteId}
                    onChange={(e) => setNovoTreino({ ...novoTreino, pacienteId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {novoTreino.pacientes.length === 0 && <option value="">Nenhum paciente cadastrado</option>}
                    {novoTreino.pacientes.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Meta campos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nome do Treino</label>
                  <input type="text" value={novoTreino.dia} placeholder="ex: Treino A"
                    onChange={(e) => setNovoTreino({ ...novoTreino, dia: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Título / Grupo</label>
                  <input type="text" value={novoTreino.titulo} placeholder="ex: Peito e Tríceps"
                    onChange={(e) => setNovoTreino({ ...novoTreino, titulo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Modalidade</label>
                  <select value={novoTreino.tipo_treino}
                    onChange={(e) => setNovoTreino({ ...novoTreino, tipo_treino: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nível</label>
                  <select value={novoTreino.nivel}
                    onChange={(e) => setNovoTreino({ ...novoTreino, nivel: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {NIVEIS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Frequência</label>
                  <input type="text" value={novoTreino.frequencia} placeholder="3x por semana"
                    onChange={(e) => setNovoTreino({ ...novoTreino, frequencia: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duração (min)</label>
                  <input type="number" value={novoTreino.duracao_minutos}
                    onChange={(e) => setNovoTreino({ ...novoTreino, duracao_minutos: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Objetivo</label>
                  <input type="text" value={novoTreino.objetivo} placeholder="ex: Hipertrofia muscular..."
                    onChange={(e) => setNovoTreino({ ...novoTreino, objetivo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Exercícios */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Exercícios ({novoTreino.exercicios.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setNovoTreino({ ...novoTreino, exercicios: [...novoTreino.exercicios, emptyExercicio()] })}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 transition cursor-pointer"
                  >
                    + Adicionar
                  </button>
                </div>

                {novoTreino.exercicios.map((ex, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setNovoTreino({ ...novoTreino, exercicios: novoTreino.exercicios.filter((_, i) => i !== idx) })}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Nome do Exercício"
                      value={ex.nome}
                      onChange={(e) => {
                        const updated = [...novoTreino.exercicios];
                        updated[idx] = { ...updated[idx], nome: e.target.value };
                        setNovoTreino({ ...novoTreino, exercicios: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                    />
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(['series', 'reps', 'distancia', 'carga', 'intensidade', 'descanso'] as (keyof Exercicio)[]).map((field) => (
                        <div key={field}>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">
                            {field === 'series' ? 'Séries' : field === 'reps' ? 'Reps' : field === 'distancia' ? 'Dist.' : field === 'carga' ? 'Carga' : field === 'intensidade' ? 'Int.' : 'Desc.'}
                          </label>
                          <input
                            type="text"
                            value={(ex as any)[field]}
                            onChange={(e) => {
                              const updated = [...novoTreino.exercicios];
                              updated[idx] = { ...updated[idx], [field]: e.target.value };
                              setNovoTreino({ ...novoTreino, exercicios: updated });
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setNovoTreino(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveNovoTreino}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
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
