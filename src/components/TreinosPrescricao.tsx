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
  Loader2,
  X,
  Save,
  Plus,
  PlusCircle,
} from 'lucide-react';
import { sql } from '../lib/neon';

/* ─── Tipos ──────────────────────────────────────────────────────────────── */
interface Exercicio {
  nome: string;
  series: string;
  reps: string;
  distancia: string;
  carga: string;
  intensidade: string;
  descanso: string;
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
}

/* ─── Constantes ──────────────────────────────────────────────────────────── */
const MODALIDADES = ['Musculação', 'Natação', 'Corrida', 'Ciclismo', 'Funcional', 'CrossFit', 'Pilates', 'Outro'];
const NIVEIS      = ['INICIANTE', 'INTERMEDIÁRIO', 'AVANÇADO'];

function emptyEx(): Exercicio {
  return { nome: '', series: '3', reps: '12', distancia: '-', carga: '-', intensidade: 'RPE 7', descanso: '60s' };
}

function modalStyle(tipo: string) {
  if (tipo.includes('Nat'))                        return { badge: 'bg-blue-100 text-blue-800',   icon: '🏊' };
  if (tipo.includes('Corr') || tipo.includes('Camin')) return { badge: 'bg-orange-100 text-orange-800', icon: '🏃' };
  if (tipo.includes('Cicl'))                       return { badge: 'bg-purple-100 text-purple-800', icon: '🚴' };
  if (tipo.includes('Func') || tipo.includes('Cross')) return { badge: 'bg-rose-100 text-rose-800',   icon: '⚡' };
  if (tipo.includes('Pilat'))                      return { badge: 'bg-pink-100 text-pink-800',   icon: '🧘' };
  return                                                  { badge: 'bg-amber-100 text-amber-800', icon: '🏋️' };
}

function nivelCls(nivel?: string) {
  if (!nivel)                   return 'text-gray-400 bg-gray-100';
  if (nivel.includes('INICI'))  return 'text-emerald-700 bg-emerald-50';
  if (nivel.includes('AVAN'))   return 'text-rose-600 bg-rose-50';
  return                               'text-amber-700 bg-amber-50';
}

/* ─── Componente ──────────────────────────────────────────────────────────── */
export const TreinosPrescricao: React.FC<TreinosPrescricaoProps> = ({ userId }) => {
  const [planos,      setPlanos]      = useState<PlanoTreinoDB[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);

  /* modais */
  const [tableModal,   setTableModal]   = useState<{ planId: string; cardIndex: number; card: CardTreinoItem; pacienteNome: string; dirty: boolean } | null>(null);
  const [editingCard,  setEditingCard]  = useState<{ planId: string; cardIndex: number; data: CardTreinoItem } | null>(null);
  const [novoModal,    setNovoModal]    = useState<{
    pacientes: { id: string; nome: string }[];
    loadingPac: boolean; pacienteId: string;
    dia: string; titulo: string; tipo_treino: string; nivel: string;
    frequencia: string; duracao_minutos: number; objetivo: string;
    exercicios: Exercicio[];
  } | null>(null);

  /* ── helpers ── */
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  /* ── carregar planos ── */
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (userId) loadData(); }, [userId]);

  /* ── extrair cards ── */
  const allCards: { planId: string; pacienteNome: string; cardIndex: number; card: CardTreinoItem }[] = [];
  planos.forEach((p) => {
    let parsed: any = null;
    try { parsed = typeof p.conteudo === 'string' ? JSON.parse(p.conteudo) : p.conteudo; } catch { return; }
    if (parsed?.plano_treino_semanal?.length) {
      parsed.plano_treino_semanal.forEach((c: any, idx: number) => {
        allCards.push({
          planId: p.id,
          pacienteNome: p.nome_paciente || 'Paciente',
          cardIndex: idx,
          card: {
            dia:              c.dia            || `Treino ${String.fromCharCode(65 + idx)}`,
            titulo:           c.titulo         || c.grupo_muscular || '',
            tipo_treino:      c.tipo_treino    || parsed.modalidade || 'Musculação',
            nivel:            c.nivel          || parsed.nivel      || 'INTERMEDIÁRIO',
            frequencia:       c.frequencia     || parsed.frequencia || '3x por semana',
            duracao_minutos:  c.duracao_minutos || 45,
            objetivo:         c.objetivo       || '',
            exercicios:       Array.isArray(c.exercicios) ? c.exercicios : [],
            observacoes_do_dia: c.observacoes_do_dia || '',
          },
        });
      });
    }
  });

  const filtered = allCards.filter((item) =>
    [item.pacienteNome, item.card.dia, item.card.titulo || '', item.card.tipo_treino]
      .some((v) => v.toLowerCase().includes(search.toLowerCase()))
  );

  /* ── save card edit ── */
  const saveCardEdit = async () => {
    if (!editingCard) return;
    try {
      setIsSaving(true);
      const plan = planos.find((p) => p.id === editingCard.planId);
      if (!plan) return;
      const parsed = typeof plan.conteudo === 'string' ? JSON.parse(plan.conteudo) : { ...plan.conteudo };
      parsed.plano_treino_semanal[editingCard.cardIndex] = editingCard.data;
      await sql.query(`UPDATE public.planos_treino SET conteudo = $1 WHERE id = $2`, [JSON.stringify(parsed), plan.id]);
      setPlanos((prev) => prev.map((p) => p.id === plan.id ? { ...p, conteudo: parsed } : p));
      setEditingCard(null);
      showToast('Treino atualizado!');
    } catch (e) { alert('Falha ao salvar.'); }
    finally { setIsSaving(false); }
  };

  /* ── save table ── */
  const saveTable = async () => {
    if (!tableModal) return;
    try {
      setIsSaving(true);
      const plan = planos.find((p) => p.id === tableModal.planId);
      if (!plan) return;
      const parsed = typeof plan.conteudo === 'string' ? JSON.parse(plan.conteudo) : { ...plan.conteudo };
      parsed.plano_treino_semanal[tableModal.cardIndex] = tableModal.card;
      await sql.query(`UPDATE public.planos_treino SET conteudo = $1 WHERE id = $2`, [JSON.stringify(parsed), plan.id]);
      setPlanos((prev) => prev.map((p) => p.id === plan.id ? { ...p, conteudo: parsed } : p));
      setTableModal((prev) => prev ? { ...prev, dirty: false } : null);
      showToast('Tabela salva!');
    } catch { alert('Falha ao salvar tabela.'); }
    finally { setIsSaving(false); }
  };

  const updCell = (i: number, f: keyof Exercicio, v: string) => {
    if (!tableModal) return;
    const exs = tableModal.card.exercicios.map((ex, idx) => idx === i ? { ...ex, [f]: v } : ex);
    setTableModal({ ...tableModal, card: { ...tableModal.card, exercicios: exs }, dirty: true });
  };

  /* ── delete card ── */
  const deleteCard = async (planId: string, cardIndex: number) => {
    if (!confirm('Remover este treino?')) return;
    try {
      const plan = planos.find((p) => p.id === planId);
      if (!plan) return;
      const parsed = typeof plan.conteudo === 'string' ? JSON.parse(plan.conteudo) : { ...plan.conteudo };
      parsed.plano_treino_semanal = parsed.plano_treino_semanal.filter((_: any, i: number) => i !== cardIndex);
      if (parsed.plano_treino_semanal.length === 0) {
        await sql.query(`DELETE FROM public.planos_treino WHERE id = $1`, [planId]);
        setPlanos((prev) => prev.filter((p) => p.id !== planId));
      } else {
        await sql.query(`UPDATE public.planos_treino SET conteudo = $1 WHERE id = $2`, [JSON.stringify(parsed), planId]);
        setPlanos((prev) => prev.map((p) => p.id === planId ? { ...p, conteudo: parsed } : p));
      }
      showToast('Treino removido.');
    } catch { /* ignore */ }
  };

  /* ── abrir modal novo ── */
  const openNovoModal = async () => {
    setNovoModal({
      pacientes: [], loadingPac: true, pacienteId: '',
      dia: 'Treino A', titulo: '', tipo_treino: 'Musculação',
      nivel: 'INTERMEDIÁRIO', frequencia: '3x por semana',
      duracao_minutos: 60, objetivo: '', exercicios: [emptyEx()],
    });
    try {
      const res = await sql.query(`SELECT id, nome FROM public.pacientes WHERE nutricionista_id = $1 ORDER BY nome`, [userId]);
      setNovoModal((prev) => prev ? { ...prev, pacientes: res as any[], loadingPac: false, pacienteId: (res as any[])[0]?.id || '' } : null);
    } catch { setNovoModal((prev) => prev ? { ...prev, loadingPac: false } : null); }
  };

  const saveNovo = async () => {
    if (!novoModal?.pacienteId) { alert('Selecione um paciente.'); return; }
    try {
      setIsSaving(true);
      const newCard = {
        dia: novoModal.dia, titulo: novoModal.titulo, tipo_treino: novoModal.tipo_treino,
        nivel: novoModal.nivel, frequencia: novoModal.frequencia,
        duracao_minutos: novoModal.duracao_minutos, objetivo: novoModal.objetivo,
        exercicios: novoModal.exercicios, observacoes_do_dia: '',
      };
      const existing = planos.find((p) => p.paciente_id === novoModal.pacienteId);
      if (existing) {
        const parsed = typeof existing.conteudo === 'string' ? JSON.parse(existing.conteudo) : { ...existing.conteudo };
        parsed.plano_treino_semanal = [...(parsed.plano_treino_semanal || []), newCard];
        await sql.query(`UPDATE public.planos_treino SET conteudo = $1 WHERE id = $2`, [JSON.stringify(parsed), existing.id]);
        setPlanos((prev) => prev.map((p) => p.id === existing.id ? { ...p, conteudo: parsed } : p));
      } else {
        const conteudo = { plano_treino_semanal: [newCard] };
        const res = await sql.query(
          `INSERT INTO public.planos_treino (paciente_id, conteudo) VALUES ($1, $2) RETURNING id, paciente_id, conteudo, created_at`,
          [novoModal.pacienteId, JSON.stringify(conteudo)]
        );
        const pac = novoModal.pacientes.find((p) => p.id === novoModal.pacienteId);
        setPlanos((prev) => [...prev, { ...(res as any[])[0], nome_paciente: pac?.nome || 'Paciente' }]);
      }
      setNovoModal(null);
      showToast('Treino criado com sucesso!');
    } catch { alert('Falha ao criar treino.'); }
    finally { setIsSaving(false); }
  };

  /* ─── estilos comuns ─────────────────────────────────────────────────────── */
  const inputSm = 'w-full px-1.5 py-1 bg-white border border-gray-200 rounded text-xs font-medium focus:border-emerald-500 outline-none';
  const inputMd = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500';

  /* ─── render campos de exercício ─────────────────────────────────────────── */
  const exFields: { key: keyof Exercicio; label: string }[] = [
    { key: 'series',     label: 'Séries' },
    { key: 'reps',       label: 'Reps'   },
    { key: 'distancia',  label: 'Dist.'  },
    { key: 'carga',      label: 'Carga'  },
    { key: 'intensidade',label: 'Int.'   },
    { key: 'descanso',   label: 'Desc.'  },
  ];

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          {toast}
        </div>
      )}

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">PRESCRIÇÃO DE TREINOS</span>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Treinos &amp; Exercícios</h2>
        </div>
        <button onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer">
          <RotateCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* ══ BARRA DE BUSCA + CONTADOR + BOTÃO ════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Buscar por paciente, objetivo ou título do treino..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:border-emerald-500 outline-none shadow-xs" />
        </div>
        {!loading && (
          <span className="text-xs font-semibold text-gray-500 shrink-0 whitespace-nowrap">
            Exibindo {filtered.length} treino(s)
          </span>
        )}
        <button onClick={openNovoModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-sm transition cursor-pointer shrink-0">
          <Plus className="w-3.5 h-3.5" /> Adicionar + treino
        </button>
      </div>

      {/* ══ GRID DE CARDS ════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs font-semibold">Carregando treinos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-14 text-center border border-emerald-100 space-y-4">
          <div className="text-5xl mx-auto">🏋️</div>
          <h3 className="text-base font-bold text-gray-900">Nenhum treino encontrado</h3>
          <p className="text-xs text-gray-500">
            {search ? 'Tente ajustar a busca.' : 'Clique em "+ Adicionar + treino" para começar.'}
          </p>
          <button onClick={openNovoModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
            <Plus className="w-4 h-4" /> Criar Primeiro Treino
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(({ planId, pacienteNome, cardIndex, card }) => {
            const ms = modalStyle(card.tipo_treino);
            return (
              <div key={`${planId}-${cardIndex}`}
                className="bg-white rounded-3xl border border-gray-200/90 shadow-xs hover:shadow-md transition p-5 flex flex-col gap-4">

                {/* topo do card */}
                <div className="space-y-2.5">
                  {/* badge modalidade + nível */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${ms.badge}`}>
                      {ms.icon} {card.tipo_treino}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${nivelCls(card.nivel)}`}>
                      {card.nivel || 'INTERMEDIÁRIO'}
                    </span>
                  </div>

                  {/* título + paciente */}
                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-tight">
                      {card.dia}{card.titulo ? ` — ${card.titulo}` : ''}
                    </h3>
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3 text-gray-400" /> {pacienteNome}
                    </p>
                  </div>

                  {/* objetivo */}
                  {card.objetivo && (
                    <p className="text-xs text-gray-600 leading-snug">
                      <span className="font-bold text-gray-700">Objetivo: </span>{card.objetivo}
                    </p>
                  )}

                  {/* frequência + duração */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" /> {card.frequencia}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" /> ~{card.duracao_minutos} min</span>
                  </div>

                  {/* exercícios */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                      <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                        EXERCÍCIOS ({card.exercicios.length})
                      </span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        Campos Editáveis
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs">
                      {card.exercicios.slice(0, 4).map((ex, i) => (
                        <li key={i} className="flex items-baseline gap-1 leading-snug">
                          <span className="text-emerald-500 font-bold shrink-0">•</span>
                          <span className="font-bold text-gray-900 truncate max-w-[140px]">{ex.nome || '—'}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            ({ex.series}{ex.reps && ex.reps !== '-' ? ` × ${ex.reps}` : ''}{ex.distancia && ex.distancia !== '-' ? `, ${ex.distancia}` : ''})
                          </span>
                          {ex.carga && ex.carga !== '-' && (
                            <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-1 rounded shrink-0">[{ex.carga}]</span>
                          )}
                        </li>
                      ))}
                      {card.exercicios.length > 4 && (
                        <li className="text-[10px] text-gray-400 italic">+ {card.exercicios.length - 4} exercício(s)</li>
                      )}
                      {card.exercicios.length === 0 && (
                        <li className="text-[10px] text-gray-400 italic">Nenhum exercício adicionado</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* rodapé */}
                <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                  <button
                    onClick={() => setTableModal({ planId, cardIndex, card: JSON.parse(JSON.stringify(card)), pacienteNome, dirty: false })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer">
                    <Table className="w-3.5 h-3.5" /> Ver &amp; Editar Tabela
                  </button>
                  <button onClick={() => setEditingCard({ planId, cardIndex, data: JSON.parse(JSON.stringify(card)) })}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition cursor-pointer" title="Editar">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteCard(planId, cardIndex)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer" title="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL 1 — VER & EDITAR TABELA ════════════════════════════════════ */}
      {tableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh]">
            {/* header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                  {tableModal.card.tipo_treino} · {tableModal.card.nivel || 'INTERMEDIÁRIO'} · {tableModal.pacienteNome}
                </span>
                <h3 className="text-xl font-black text-gray-900">
                  {tableModal.card.dia}{tableModal.card.titulo ? ` — ${tableModal.card.titulo}` : ''}
                </h3>
              </div>
              <button onClick={() => setTableModal(null)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* tabela */}
            <div className="overflow-auto flex-1 px-6 py-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 font-bold text-gray-600 border-b border-gray-200">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Exercício</th>
                    {['Séries','Reps','Distância','Carga','Intensidade','Descanso'].map(h => (
                      <th key={h} className="py-2.5 px-3 min-w-[80px]">{h}</th>
                    ))}
                    <th className="py-2.5 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableModal.card.exercicios.map((ex, i) => (
                    <tr key={i} className="hover:bg-gray-50/60 group">
                      <td className="py-2 px-3 font-bold text-gray-400">{i + 1}</td>
                      <td className="py-2 px-3">
                        <input type="text" value={ex.nome} placeholder="Nome do exercício"
                          onChange={e => updCell(i, 'nome', e.target.value)}
                          className={`${inputSm} min-w-[160px] font-bold`} />
                      </td>
                      {(['series','reps','distancia','carga','intensidade','descanso'] as (keyof Exercicio)[]).map(f => (
                        <td key={f} className="py-2 px-3">
                          <input type="text" value={(ex as any)[f]} onChange={e => updCell(i, f, e.target.value)} className={inputSm} />
                        </td>
                      ))}
                      <td className="py-2 px-2">
                        <button onClick={() => {
                          const exs = tableModal.card.exercicios.filter((_, idx) => idx !== i);
                          setTableModal({ ...tableModal, card: { ...tableModal.card, exercicios: exs }, dirty: true });
                        }} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => setTableModal({ ...tableModal, card: { ...tableModal.card, exercicios: [...tableModal.card.exercicios, emptyEx()] }, dirty: true })}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-xl cursor-pointer">
                <PlusCircle className="w-3.5 h-3.5" /> Adicionar Exercício
              </button>
            </div>

            {/* footer */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center gap-3 shrink-0">
              {tableModal.dirty && <span className="text-xs text-amber-600 font-semibold">● Alterações não salvas</span>}
              <div className="ml-auto flex gap-3">
                <button onClick={() => setTableModal(null)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Fechar</button>
                <button disabled={isSaving || !tableModal.dirty} onClick={saveTable}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar Tabela
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL 2 — EDITAR CARD ════════════════════════════════════════════ */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">Editar {editingCard.data.dia}</h3>
                <p className="text-xs text-gray-500">Modifique os campos e exercícios livremente</p>
              </div>
              <button onClick={() => setEditingCard(null)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {/* meta campos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Nome do Treino', field: 'dia',       ph: 'ex: Treino A' },
                  { label: 'Título / Grupo', field: 'titulo',    ph: 'ex: Peito e Tríceps' },
                  { label: 'Frequência',     field: 'frequencia', ph: '3x por semana' },
                ].map(({ label, field, ph }) => (
                  <div key={field}>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{label}</label>
                    <input type="text" value={(editingCard.data as any)[field] || ''} placeholder={ph}
                      onChange={e => setEditingCard({ ...editingCard, data: { ...editingCard.data, [field]: e.target.value } })}
                      className={inputMd} />
                  </div>
                ))}
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Objetivo</label>
                  <input type="text" value={editingCard.data.objetivo || ''} placeholder="ex: Hipertrofia muscular..."
                    onChange={e => setEditingCard({ ...editingCard, data: { ...editingCard.data, objetivo: e.target.value } })}
                    className={inputMd} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Modalidade</label>
                  <select value={editingCard.data.tipo_treino}
                    onChange={e => setEditingCard({ ...editingCard, data: { ...editingCard.data, tipo_treino: e.target.value } })}
                    className={`${inputMd} cursor-pointer`}>
                    {MODALIDADES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nível</label>
                  <select value={editingCard.data.nivel || 'INTERMEDIÁRIO'}
                    onChange={e => setEditingCard({ ...editingCard, data: { ...editingCard.data, nivel: e.target.value } })}
                    className={`${inputMd} cursor-pointer`}>
                    {NIVEIS.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duração (min)</label>
                  <input type="number" value={editingCard.data.duracao_minutos || 45}
                    onChange={e => setEditingCard({ ...editingCard, data: { ...editingCard.data, duracao_minutos: Number(e.target.value) } })}
                    className={inputMd} />
                </div>
              </div>

              {/* exercícios */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700 uppercase">Exercícios ({editingCard.data.exercicios.length})</span>
                  <button onClick={() => setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: [...editingCard.data.exercicios, emptyEx()] } })}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 cursor-pointer">+ Adicionar</button>
                </div>
                {editingCard.data.exercicios.map((ex, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">#{i + 1}</span>
                      <button onClick={() => setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: editingCard.data.exercicios.filter((_, idx) => idx !== i) } })}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer">Remover</button>
                    </div>
                    <input type="text" placeholder="Nome do Exercício" value={ex.nome}
                      onChange={e => { const u = [...editingCard.data.exercicios]; u[i] = { ...u[i], nome: e.target.value }; setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: u } }); }}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold" />
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {exFields.map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">{label}</label>
                          <input type="text" value={(ex as any)[key]}
                            onChange={e => { const u = [...editingCard.data.exercicios]; u[i] = { ...u[i], [key]: e.target.value }; setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: u } }); }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingCard(null)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancelar</button>
              <button disabled={isSaving} onClick={saveCardEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL 3 — NOVO TREINO ════════════════════════════════════════════ */}
      {novoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">Nova Ficha de Treino</h3>
                <p className="text-xs text-gray-500">Preencha os campos e adicione os exercícios</p>
              </div>
              <button onClick={() => setNovoModal(null)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {/* paciente */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Paciente *</label>
                {novoModal.loadingPac ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...</div>
                ) : (
                  <select value={novoModal.pacienteId} onChange={e => setNovoModal({ ...novoModal, pacienteId: e.target.value })} className={`${inputMd} cursor-pointer`}>
                    {novoModal.pacientes.length === 0 && <option value="">Nenhum paciente cadastrado</option>}
                    {novoModal.pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                )}
              </div>

              {/* meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Nome do Treino', field: 'dia',       ph: 'ex: Treino A'      },
                  { label: 'Título / Grupo', field: 'titulo',    ph: 'ex: Peito e Tríceps' },
                  { label: 'Frequência',     field: 'frequencia', ph: '3x por semana'    },
                ].map(({ label, field, ph }) => (
                  <div key={field}>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{label}</label>
                    <input type="text" value={(novoModal as any)[field]} placeholder={ph}
                      onChange={e => setNovoModal({ ...novoModal, [field]: e.target.value })} className={inputMd} />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Modalidade</label>
                  <select value={novoModal.tipo_treino} onChange={e => setNovoModal({ ...novoModal, tipo_treino: e.target.value })} className={`${inputMd} cursor-pointer`}>
                    {MODALIDADES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nível</label>
                  <select value={novoModal.nivel} onChange={e => setNovoModal({ ...novoModal, nivel: e.target.value })} className={`${inputMd} cursor-pointer`}>
                    {NIVEIS.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duração (min)</label>
                  <input type="number" value={novoModal.duracao_minutos} onChange={e => setNovoModal({ ...novoModal, duracao_minutos: Number(e.target.value) })} className={inputMd} />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Objetivo</label>
                  <input type="text" value={novoModal.objetivo} placeholder="ex: Hipertrofia muscular..." onChange={e => setNovoModal({ ...novoModal, objetivo: e.target.value })} className={inputMd} />
                </div>
              </div>

              {/* exercícios */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700 uppercase">Exercícios ({novoModal.exercicios.length})</span>
                  <button onClick={() => setNovoModal({ ...novoModal, exercicios: [...novoModal.exercicios, emptyEx()] })}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 cursor-pointer">+ Adicionar</button>
                </div>
                {novoModal.exercicios.map((ex, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">#{i + 1}</span>
                      <button onClick={() => setNovoModal({ ...novoModal, exercicios: novoModal.exercicios.filter((_, idx) => idx !== i) })}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer">Remover</button>
                    </div>
                    <input type="text" placeholder="Nome do Exercício" value={ex.nome}
                      onChange={e => { const u = [...novoModal.exercicios]; u[i] = { ...u[i], nome: e.target.value }; setNovoModal({ ...novoModal, exercicios: u }); }}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold" />
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {exFields.map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">{label}</label>
                          <input type="text" value={(ex as any)[key]}
                            onChange={e => { const u = [...novoModal.exercicios]; u[i] = { ...u[i], [key]: e.target.value }; setNovoModal({ ...novoModal, exercicios: u }); }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setNovoModal(null)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancelar</button>
              <button disabled={isSaving} onClick={saveNovo}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Criar Treino
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
