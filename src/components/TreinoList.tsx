import React, { useEffect, useState } from 'react';
import { 
  Dumbbell, 
  Search, 
  Plus, 
  ChevronRight, 
  Target, 
  Loader2, 
  Activity,
  Trash2,
  Clock
} from 'lucide-react';
import { sql } from '../lib/neon';

interface TreinoListProps {
  userId: string;
  onNewTreino: () => void;
  onSelectTreino: (treinoId: string) => void;
}

interface TreinoSummary {
  id: string;
  nome_aluno: string;
  objetivo: string | null;
  modalidade: string | null;
  nivel_atividade: string | null;
  created_at: string;
  dias_treino: any;
}

export const TreinoList: React.FC<TreinoListProps> = ({
  userId,
  onNewTreino,
  onSelectTreino
}) => {
  const [treinos, setTreinos] = useState<TreinoSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTreinos = async () => {
    try {
      setLoading(true);
      const res = await sql.query(
        `SELECT id, nome_aluno, objetivo, modalidade, nivel_atividade, created_at, dias_treino
         FROM public.fichas_treino
         WHERE nutricionista_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      setTreinos(res as TreinoSummary[]);
    } catch (err) {
      console.error('Erro ao listar treinos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadTreinos();
  }, [userId]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta ficha de treino?')) return;
    try {
      setDeletingId(id);
      await sql.query(`DELETE FROM public.fichas_treino WHERE id = $1`, [id]);
      setTreinos(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Erro ao excluir treino:', err);
      alert('Falha ao excluir o treino.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTreinos = treinos.filter(t => 
    (t.nome_aluno || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.objetivo || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.modalidade || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header com Busca e Botão "Novo Treino" */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome do aluno, objetivo ou modalidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition"
          />
        </div>

        <button
          onClick={onNewTreino}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Treino</span>
        </button>
      </div>

      {/* Conteúdo da Listagem */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-emerald-100 text-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-semibold">Carregando fichas de treino...</p>
        </div>
      ) : filteredTreinos.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-emerald-100 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {search ? 'Nenhum treino encontrado' : 'Nenhuma ficha de treino cadastrada ainda'}
            </h3>
            <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
              {search 
                ? 'Tente buscar por outro termo ou limpe o filtro.' 
                : 'Cadastre prescrições de musculação, natação e corrida com auxílio de IA ou plano manual.'}
            </p>
          </div>
          {!search && (
            <button
              onClick={onNewTreino}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Treino</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTreinos.map((treino) => {
            let totalExercicios = 0;
            if (Array.isArray(treino.dias_treino)) {
              treino.dias_treino.forEach((d: any) => {
                if (Array.isArray(d.exercicios)) totalExercicios += d.exercicios.length;
              });
            }

            return (
              <div
                key={treino.id}
                onClick={() => onSelectTreino(treino.id)}
                className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition duration-200 cursor-pointer flex flex-col justify-between group space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                        <Dumbbell className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900 group-hover:text-emerald-700 transition">
                          {treino.nome_aluno}
                        </h4>
                        <span className="text-xs text-gray-400 block mt-0.5">
                          {treino.modalidade || 'Musculação'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={deletingId === treino.id}
                      onClick={(e) => handleDelete(e, treino.id)}
                      className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Excluir treino"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Informações e Badges */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    {treino.objetivo && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{treino.objetivo}</span>
                      </div>
                    )}
                    {treino.nivel_atividade && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Activity className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{treino.nivel_atividade}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Cadastrado em {new Date(treino.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span>{totalExercicios} exercícios estruturados</span>
                  <div className="flex items-center gap-1 group-hover:translate-x-1 transition">
                    <span>Editar Ficha</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
