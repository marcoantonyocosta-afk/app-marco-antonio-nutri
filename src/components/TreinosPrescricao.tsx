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
  Save
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

export const TreinosPrescricao: React.FC<TreinosPrescricaoProps> = ({ userId }) => {
  const [planos, setPlanos] = useState<PlanoTreinoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCard, setEditingCard] = useState<{ planId: string; cardIndex: number; data: CardTreinoItem } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedTableCard, setSelectedTableCard] = useState<CardTreinoItem | null>(null);

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

  // Extrair todos os cards de treinos individuais dos planos cadastrados
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

  const handleOpenEdit = (planId: string, cardIndex: number, card: CardTreinoItem) => {
    setEditingCard({
      planId,
      cardIndex,
      data: JSON.parse(JSON.stringify(card)),
    });
  };

  const handleSaveCardEdit = async () => {
    if (!editingCard) return;
    try {
      setIsSaving(true);
      const targetPlan = planos.find((p) => p.id === editingCard.planId);
      if (!targetPlan) return;

      let parsed = typeof targetPlan.conteudo === 'string' ? JSON.parse(targetPlan.conteudo) : targetPlan.conteudo;
      if (!parsed.plano_treino_semanal) parsed.plano_treino_semanal = [];
      parsed.plano_treino_semanal[editingCard.cardIndex] = editingCard.data;

      await sql.query(
        `UPDATE public.planos_treino SET conteudo = $1 WHERE id = $2`,
        [JSON.stringify(parsed), editingCard.planId]
      );

      setPlanos((prev) =>
        prev.map((p) => (p.id === editingCard.planId ? { ...p, conteudo: parsed } : p))
      );
      setEditingCard(null);
      showToast('Exercícios e treino atualizados com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar treino:', err);
      alert('Falha ao salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCard = async (planId: string, cardIndex: number) => {
    if (!confirm('Deseja realmente remover este card de treino?')) return;
    try {
      const targetPlan = planos.find((p) => p.id === planId);
      if (!targetPlan) return;

      let parsed = typeof targetPlan.conteudo === 'string' ? JSON.parse(targetPlan.conteudo) : targetPlan.conteudo;
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
      console.error('Erro ao excluir card:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header exatamente como na foto */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">
            PRESCRIÇÃO DE TREINOS
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Treinos &amp; Exercícios
          </h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar treino, aluno ou modalidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-emerald-500 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Grade de Cards exatamente no estilo da foto */}
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
            Prescreva um treino no prontuário do paciente usando IA ou o botão manual para visualizá-lo aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map(({ planId, pacienteNome, cardIndex, card }) => {
            return (
              <div
                key={`${planId}-${cardIndex}`}
                className="bg-white rounded-3xl border border-gray-200/90 shadow-xs hover:shadow-md transition p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Linha Superior: Ícone + Modalidade (badge) + Nível */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-md">
                        {card.tipo_treino}
                      </span>
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      {card.nivel || 'INTERMEDIÁRIO'}
                    </span>
                  </div>

                  {/* Título Principal do Treino (ex: Treino A - Peito, Tríceps...) */}
                  <div>
                    <h3 className="text-base font-black text-gray-900 tracking-tight">
                      {card.dia} {card.titulo ? `- ${card.titulo}` : ''}
                    </h3>
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>{pacienteNome}</span>
                    </p>
                  </div>

                  {/* Objetivo */}
                  {card.objetivo && (
                    <div className="text-xs text-gray-600">
                      <span className="font-bold text-gray-700">Objetivo: </span>
                      <span>{card.objetivo}</span>
                    </div>
                  )}

                  {/* Metadados: Frequência e Duração */}
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{card.frequencia || '3x por semana'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>~{card.duracao_minutos || 45} minutos</span>
                    </div>
                  </div>

                  {/* Bloco de Exercícios (com tag 'Campos Editáveis') */}
                  <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                      <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider">
                        EXERCÍCIOS ({card.exercicios.length})
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400">
                        Campos Editáveis
                      </span>
                    </div>

                    <ul className="space-y-1.5 text-xs">
                      {card.exercicios.slice(0, 3).map((ex, exIdx) => (
                        <li key={exIdx} className="flex items-baseline gap-1.5 text-gray-800 leading-snug">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span className="font-bold text-gray-900 truncate max-w-[190px]">
                            {ex.nome}
                          </span>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            ({ex.series}{ex.distancia && ex.distancia !== '-' ? `, ${ex.distancia}` : ''})
                          </span>
                          {ex.carga && ex.carga !== '-' && (
                            <span className="text-[10px] text-rose-500 font-semibold bg-rose-50 px-1 rounded shrink-0">
                              [{ex.carga}]
                            </span>
                          )}
                        </li>
                      ))}
                      {card.exercicios.length > 3 && (
                        <li className="text-[11px] text-gray-400 pt-1 italic font-medium">
                          + {card.exercicios.length - 3} exercício(s) adicionais
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Rodapé com botões exatamente como na foto */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedTableCard(card)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Ver &amp; Editar Tabela</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(planId, cardIndex, card)}
                    className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                    title="Editar treino"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCard(planId, cardIndex)}
                    className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
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

      {/* Modal 1: Ver & Editar Tabela de Exercícios */}
      {selectedTableCard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                  {selectedTableCard.tipo_treino} • {selectedTableCard.nivel || 'INTERMEDIÁRIO'}
                </span>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                  Tabela Completa de Exercícios — {selectedTableCard.dia}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTableCard(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Exercício</th>
                    <th className="py-3 px-3">Séries</th>
                    <th className="py-3 px-3">Reps</th>
                    <th className="py-3 px-3">Distância</th>
                    <th className="py-3 px-3">Carga</th>
                    <th className="py-3 px-3">Intensidade</th>
                    <th className="py-3 px-3">Descanso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {selectedTableCard.exercicios.map((ex, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-bold text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{ex.nome}</td>
                      <td className="py-3 px-3 text-gray-700">{ex.series || '-'}</td>
                      <td className="py-3 px-3 text-gray-700">{ex.reps || '-'}</td>
                      <td className="py-3 px-3 text-gray-700">{ex.distancia || '-'}</td>
                      <td className="py-3 px-3 text-gray-700">{ex.carga || '-'}</td>
                      <td className="py-3 px-3 text-gray-700">{ex.intensidade || '-'}</td>
                      <td className="py-3 px-3 text-gray-700">{ex.descanso || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedTableCard.observacoes_do_dia && (
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-900 font-medium">
                <span className="font-bold">Observações / Dicas: </span>
                {selectedTableCard.observacoes_do_dia}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTableCard(null)}
                className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar Tabela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Edição dos Campos do Card */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Editar {editingCard.data.dia}
                </h3>
                <p className="text-xs text-gray-500">
                  Modifique os campos livremente, adicione ou remova exercícios
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Título / Grupo</label>
                <input
                  type="text"
                  value={editingCard.data.titulo || ''}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      data: { ...editingCard.data, titulo: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Modalidade</label>
                <input
                  type="text"
                  value={editingCard.data.tipo_treino}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      data: { ...editingCard.data, tipo_treino: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Duração (min)</label>
                <input
                  type="number"
                  value={editingCard.data.duracao_minutos || 45}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      data: { ...editingCard.data, duracao_minutos: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Lista de Exercícios Editáveis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  Exercícios ({editingCard.data.exercicios.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingCard({
                      ...editingCard,
                      data: {
                        ...editingCard.data,
                        exercicios: [
                          ...editingCard.data.exercicios,
                          { nome: '', series: '3', reps: '12', distancia: '-', carga: 'Moderada', intensidade: 'RPE 8', descanso: '60s' },
                        ],
                      },
                    })
                  }
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 transition cursor-pointer"
                >
                  + Adicionar Exercício
                </button>
              </div>

              {editingCard.data.exercicios.map((ex, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">Exercício #{idx + 1}</span>
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
                      className="text-rose-600 hover:text-rose-800 text-xs font-semibold cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Nome do Exercício"
                        value={ex.nome}
                        onChange={(e) => {
                          const updated = [...editingCard.data.exercicios];
                          updated[idx].nome = e.target.value;
                          setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: updated } });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Séries (ex: 4x 10)"
                        value={ex.series}
                        onChange={(e) => {
                          const updated = [...editingCard.data.exercicios];
                          updated[idx].series = e.target.value;
                          setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: updated } });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Carga (ex: 20kg, Progressiva)"
                        value={ex.carga}
                        onChange={(e) => {
                          const updated = [...editingCard.data.exercicios];
                          updated[idx].carga = e.target.value;
                          setEditingCard({ ...editingCard, data: { ...editingCard.data, exercicios: updated } });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
