import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  ChevronRight, 
  Calendar, 
  Target, 
  Loader2, 
  UserX 
} from 'lucide-react';
import { sql } from '../lib/neon';

interface PatientListProps {
  userId: string;
  onNewPatient: () => void;
  onSelectPatient: (patientId: string) => void;
}

interface PatientSummary {
  id: string;
  nome: string;
  objetivos: string[] | null;
  objetivo_texto: string | null;
  ultima_consulta: string | null;
}

export const PatientList: React.FC<PatientListProps> = ({ 
  userId, 
  onNewPatient, 
  onSelectPatient 
}) => {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        const res = await sql.query(
          `SELECT p.id, p.nome, p.objetivos, p.objetivo_texto,
                  (SELECT MAX(c.data_consulta) FROM public.consultas c WHERE c.paciente_id = p.id) as ultima_consulta
           FROM public.pacientes p
           WHERE p.nutricionista_id = $1
           ORDER BY p.created_at DESC`,
          [userId]
        );
        setPatients(res as PatientSummary[]);
      } catch (err) {
        console.error('Erro ao buscar lista de pacientes:', err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadPatients();
    }
  }, [userId]);

  const filteredPatients = patients.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top action bar: Search & Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente por nome..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-gray-900 text-sm font-medium transition outline-none shadow-sm"
          />
        </div>

        <button
          type="button"
          onClick={onNewPatient}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-emerald-600/25 transition cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Paciente</span>
        </button>
      </div>

      {/* Patient List Card */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-emerald-800">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-sm font-semibold text-gray-500">
              Carregando seus pacientes do Neon...
            </p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-16 px-6 text-center">
            {patients.length === 0 ? (
              <div className="max-w-sm mx-auto space-y-4">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  Nenhum paciente cadastrado ainda
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Comece agora a organizar seus atendimentos clínicos cadastrando seu primeiro paciente.
                </p>
                <button
                  type="button"
                  onClick={onNewPatient}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Paciente</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <UserX className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm font-medium text-gray-500">
                  Nenhum paciente encontrado com "{search}"
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPatients.map((paciente) => {
              const objetivoExibido =
                (paciente.objetivos && paciente.objetivos[0]) ||
                paciente.objetivo_texto ||
                'Não informado';

              return (
                <div
                  key={paciente.id}
                  onClick={() => onSelectPatient(paciente.id)}
                  className="p-5 sm:px-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-emerald-50/40 transition duration-150 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-800 font-bold flex items-center justify-center text-sm ring-1 ring-emerald-200/60 group-hover:scale-105 transition">
                      {paciente.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition">
                        {paciente.nome}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md">
                          <Target className="w-3.5 h-3.5" />
                          {objetivoExibido}
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          Última consulta:{' '}
                          {paciente.ultima_consulta
                            ? new Date(paciente.ultima_consulta).toLocaleDateString('pt-BR')
                            : 'Nenhuma registrada'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition self-end sm:self-center">
                    <span>Ver prontuário</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
