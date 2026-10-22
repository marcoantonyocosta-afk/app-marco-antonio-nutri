import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  LogOut, 
  LayoutDashboard, 
  ChevronRight, 
  Activity,
  Sparkles
} from 'lucide-react';
import { Logo } from './Logo';
import { sql } from '../lib/neon';
import { PatientList } from './PatientList';
import { PatientForm } from './PatientForm';
import { PatientProfile } from './PatientProfile';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

interface InactivePatient {
  id: string;
  nome: string;
  dias_sem_consulta: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [totalPacientes, setTotalPacientes] = useState<number | null>(null);
  const [consultasSemana, setConsultasSemana] = useState<number | null>(null);
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState<InactivePatient[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegação: 'dashboard' | 'pacientes_list' | 'pacientes_novo' | 'pacientes_perfil'
  const [currentView, setCurrentView] = useState<'dashboard' | 'pacientes_list' | 'pacientes_novo' | 'pacientes_perfil'>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userId = user?.id;

      // 1. Total de pacientes da nutricionista logada
      const pacientesRes = await sql.query(
        `SELECT COUNT(*) as count FROM public.pacientes WHERE nutricionista_id = $1`,
        [userId]
      );
      const total = parseInt(pacientesRes[0]?.count || '0', 10);
      setTotalPacientes(total);

      // 2. Consultas da semana atual
      const consultasRes = await sql.query(
        `SELECT COUNT(*) as count 
         FROM public.consultas c
         JOIN public.pacientes p ON c.paciente_id = p.id
         WHERE p.nutricionista_id = $1
           AND c.data_consulta >= date_trunc('week', CURRENT_DATE)
           AND c.data_consulta < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'`,
        [userId]
      );
      const semConsultas = parseInt(consultasRes[0]?.count || '0', 10);
      setConsultasSemana(semConsultas);

      // 3. Pacientes cuja última consulta foi há mais de 30 dias e que não possuem próximo retorno agendado
      const semRetornoRes = await sql.query(
        `SELECT p.id, p.nome,
                EXTRACT(DAY FROM (now() - MAX(c.data_consulta)))::int as dias_sem_consulta
         FROM public.pacientes p
         JOIN public.consultas c ON c.paciente_id = p.id
         WHERE p.nutricionista_id = $1
         GROUP BY p.id, p.nome
         HAVING MAX(c.data_consulta) < (CURRENT_DATE - INTERVAL '30 days')
            AND (MAX(c.proximo_retorno) IS NULL OR MAX(c.proximo_retorno) < CURRENT_DATE)
         ORDER BY dias_sem_consulta DESC
         LIMIT 10`,
        [userId]
      );
      setPacientesSemRetorno(semRetornoRes as InactivePatient[]);
    } catch (err) {
      console.error('Erro ao carregar dados do Neon:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const handlePatientClick = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentView('pacientes_perfil');
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Painel Geral';
      case 'pacientes_list':
        return 'Gestão de Pacientes';
      case 'pacientes_novo':
        return 'Novo Paciente';
      case 'pacientes_perfil':
        return 'Perfil do Paciente';
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f7faf8] text-gray-900 font-sans">
      {/* Sidebar fixo */}
      <aside className="w-64 bg-white border-r border-emerald-100 flex flex-col justify-between p-6 shrink-0 shadow-sm">
        <div className="space-y-8">
          <div className="flex items-center justify-start px-2">
            <Logo size="md" />
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setCurrentView('dashboard');
                loadDashboardData();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentView('pacientes_list')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                currentView !== 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Pacientes</span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-gray-100 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm ring-2 ring-emerald-300/40">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'NU'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {user?.name || 'Nutricionista'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-100 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-emerald-100/70 px-8 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {getHeaderTitle()}
            </h1>
            <p className="text-xs text-emerald-700 font-medium">
              Conectado ao Neon Database em tempo real
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-50/60 border border-emerald-100 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Neon Auth Conectado</span>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* View 1: Formulário de Novo Paciente (Prompt 4) */}
          {currentView === 'pacientes_novo' && (
            <PatientForm
              userId={user.id}
              onCancel={() => setCurrentView('pacientes_list')}
              onSaved={(newId) => {
                setSelectedPatientId(newId);
                setCurrentView('pacientes_perfil');
                loadDashboardData();
              }}
            />
          )}

          {/* View 2: Perfil do Paciente (Prompt 4) */}
          {currentView === 'pacientes_perfil' && selectedPatientId && (
            <PatientProfile
              patientId={selectedPatientId}
              onBack={() => setCurrentView('pacientes_list')}
            />
          )}

          {/* View 3: Listagem de Pacientes (Prompt 4) */}
          {currentView === 'pacientes_list' && (
            <PatientList
              userId={user.id}
              onNewPatient={() => setCurrentView('pacientes_novo')}
              onSelectPatient={(id) => {
                setSelectedPatientId(id);
                setCurrentView('pacientes_perfil');
              }}
            />
          )}

          {/* View 4: Dashboard Principal (Prompt 3) */}
          {currentView === 'dashboard' && (
            <>
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 rounded-3xl p-8 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-medium text-emerald-100 mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Bem-vinda(o) à nova versão NutriFit</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                    Olá, {user?.name || 'Nutricionista'}!
                  </h2>
                  <p className="text-emerald-100/90 text-sm leading-relaxed">
                    Aqui está o resumo da sua clínica hoje. Acompanhe seus pacientes ativos e retornos pendentes.
                  </p>
                </div>
                <div className="absolute -right-8 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              </div>

              {/* Cards Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1 — Total de pacientes ativos */}
                <div 
                  onClick={() => setCurrentView('pacientes_list')}
                  className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Total de pacientes ativos
                    </span>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100/60 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                      {loading ? '...' : totalPacientes ?? 0}
                    </span>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Ativos na sua base
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 flex items-center justify-between">
                    <span>Pacientes vinculados à sua conta clínica</span>
                    <span className="text-emerald-600 font-semibold group-hover:translate-x-1 transition flex items-center gap-1">
                      Ver todos →
                    </span>
                  </p>
                </div>

                {/* Card 2 — Consultas da semana */}
                <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Consultas da semana
                    </span>
                    <div className="w-11 h-11 rounded-2xl bg-teal-100/60 text-teal-700 flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                      {loading ? '...' : consultasSemana ?? 0}
                    </span>
                    <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                      Semana vigente
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Atendimentos agendados ou concluídos esta semana
                  </p>
                </div>
              </div>

              {/* Card 3 — Pacientes sem retorno */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Pacientes sem retorno
                      </h3>
                      <p className="text-xs text-gray-500">
                        Última consulta realizada há mais de 30 dias sem agendamento futuro
                      </p>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-sm text-gray-400 animate-pulse">
                    Carregando registros do banco...
                  </div>
                ) : pacientesSemRetorno.length === 0 ? (
                  <div className="py-12 px-4 rounded-2xl bg-emerald-50/40 border border-dashed border-emerald-200/80 text-center">
                    <Activity className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-80" />
                    <p className="text-sm font-semibold text-emerald-900">
                      Nenhum paciente sem retorno no momento
                    </p>
                    <p className="text-xs text-emerald-600/80 mt-1">
                      Parabéns! Todos os seus pacientes estão em dia ou com retornos programados.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pacientesSemRetorno.map((paciente) => (
                      <div
                        key={paciente.id}
                        onClick={() => handlePatientClick(paciente.id)}
                        className="py-4 px-3 flex items-center justify-between hover:bg-emerald-50/50 rounded-xl transition duration-150 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-full bg-emerald-100/70 text-emerald-800 font-semibold flex items-center justify-center text-xs">
                            {paciente.nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition">
                              {paciente.nome}
                            </p>
                            <p className="text-xs text-amber-600 font-medium">
                              {paciente.dias_sem_consulta} dias desde a última consulta
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition duration-150">
                          <span>Ver perfil</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
