import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Calendar, 
  Plus, 
  User, 
  HeartPulse, 
  Coffee, 
  TrendingUp, 
  UtensilsCrossed, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Scale, 
  ChevronRight,
  FileText
} from 'lucide-react';
import { sql } from '../lib/neon';

interface PatientProfileProps {
  patientId: string;
  onBack: () => void;
}

interface Consulta {
  id: string;
  data_consulta: string;
  peso: number | null;
  cintura: number | null;
  quadril: number | null;
  percentual_gordura: number | null;
  observacoes: string | null;
  proximo_retorno: string | null;
  created_at: string;
}

interface PlanoAlimentar {
  id: string;
  conteudo: any;
  created_at: string;
}

export const PatientProfile: React.FC<PatientProfileProps> = ({ patientId, onBack }) => {
  // Seções da Página
  const [activeSection, setActiveSection] = useState<'dados' | 'consultas' | 'planos'>('dados');
  
  // Abas da Seção 1 (Dados do Paciente)
  const [activeDataTab, setActiveDataTab] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal');

  const [loading, setLoading] = useState(true);
  const [savingData, setSavingData] = useState(false);
  const [dataSuccess, setDataSuccess] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Consultas
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingConsulta, setSavingConsulta] = useState(false);
  const [consultaError, setConsultaError] = useState<string | null>(null);

  // Form Nova Consulta
  const [consultaData, setConsultaData] = useState(() => new Date().toISOString().split('T')[0]);
  const [consultaPeso, setConsultaPeso] = useState('');
  const [consultaCintura, setConsultaCintura] = useState('');
  const [consultaQuadril, setConsultaQuadril] = useState('');
  const [consultaGordura, setConsultaGordura] = useState('');
  const [consultaObs, setConsultaObs] = useState('');
  const [consultaRetorno, setConsultaRetorno] = useState('');

  // Planos Alimentares
  const [planos, setPlanos] = useState<PlanoAlimentar[]>([]);
  const [selectedPlano, setSelectedPlano] = useState<PlanoAlimentar | null>(null);

  // Dados do Paciente (Editáveis)
  // Aba 1: Pessoal
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Aba 2: Clínico
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [objetivoTexto, setObjetivoTexto] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('');
  const [patologias, setPatologias] = useState<string[]>([]);
  const [novaPatologia, setNovaPatologia] = useState('');
  const [restricoes, setRestricoes] = useState<string[]>([]);
  const [novaRestricao, setNovaRestricao] = useState('');
  const [alergias, setAlergias] = useState<string[]>([]);
  const [novaAlergia, setNovaAlergia] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [suplementos, setSuplementos] = useState('');

  // Aba 3: Hábitos
  const [refeicoesDia, setRefeicoesDia] = useState('');
  const [horarioAcordaInput, setHorarioAcordaInput] = useState('');
  const [horarioDormeInput, setHorarioDormeInput] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [praticaAtividade, setPraticaAtividade] = useState<boolean | null>(null);
  const [atividadeDescricao, setAtividadeDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Carregar dados gerais do paciente, consultas e planos
  const loadPatientData = async () => {
    try {
      setLoading(true);
      
      // 1. Paciente
      const patientRes = await sql.query(
        `SELECT * FROM public.pacientes WHERE id = $1`,
        [patientId]
      );

      if (patientRes.length > 0) {
        const p = patientRes[0];
        setNome(p.nome || '');
        setDataNascimento(p.data_nascimento ? p.data_nascimento.toString().split('T')[0] : '');
        setSexo(p.sexo || '');
        setWhatsapp(p.whatsapp || p.telefone || '');
        setEmail(p.email || '');

        setPeso(p.peso_inicial ? String(p.peso_inicial) : '');
        setAltura(p.altura ? String(p.altura) : '');
        setObjetivos(p.objetivos || []);
        setObjetivoTexto(p.objetivo_texto || '');
        setNivelAtividade(p.nivel_atividade || '');
        setPatologias(p.patologias || []);
        setRestricoes(p.restricoes_alimentares || []);
        setAlergias(p.alergias || []);
        setMedicamentos(p.medicamentos || '');
        setSuplementos(p.suplementos || '');

        setRefeicoesDia(p.refeicoes_por_dia ? String(p.refeicoes_por_dia) : '');
        setHorarioAcordaInput(p.horario_acorda || '');
        setHorarioDormeInput(p.horario_dorme || '');
        setLitrosAgua(p.litros_agua ? String(p.litros_agua) : '');
        setPraticaAtividade(p.atividade_fisica ?? null);
        setAtividadeDescricao(p.atividade_fisica_descricao || '');
        setObservacoes(p.observacoes || '');
      }

      // 2. Consultas
      const consultasRes = await sql.query(
        `SELECT id, data_consulta, peso, cintura, quadril, percentual_gordura, observacoes, proximo_retorno, created_at
         FROM public.consultas
         WHERE paciente_id = $1
         ORDER BY data_consulta DESC, created_at DESC`,
        [patientId]
      );
      setConsultas(consultasRes as Consulta[]);

      // 3. Planos Alimentares
      const planosRes = await sql.query(
        `SELECT id, conteudo, created_at
         FROM public.planos_alimentares
         WHERE paciente_id = $1
         ORDER BY created_at DESC`,
        [patientId]
      );
      setPlanos(planosRes as PlanoAlimentar[]);

    } catch (err) {
      console.error('Erro ao carregar prontuário do paciente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  // Helpers de formatação e IMC
  const calcularIdade = (dataStr: string): number | null => {
    if (!dataStr) return null;
    const nasc = new Date(dataStr);
    if (isNaN(nasc.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    return idade >= 0 ? idade : null;
  };

  const formatarHora = (val: string): string => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    if (!clean) return val;
    if (clean.length === 1 || clean.length === 2) {
      const h = parseInt(clean, 10);
      if (h >= 0 && h <= 23) return `${clean.padStart(2, '0')}:00`;
    } else if (clean.length === 3) {
      return `${clean.slice(0, 1).padStart(2, '0')}:${clean.slice(1)}`;
    } else if (clean.length >= 4) {
      return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
    }
    return val;
  };

  const formatarWhatsapp = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  const toggleItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    if (item === 'Nenhum') {
      setList(list.includes('Nenhum') ? [] : ['Nenhum']);
      return;
    }
    const filtered = list.filter((i) => i !== 'Nenhum');
    if (filtered.includes(item)) {
      setList(filtered.filter((i) => i !== item));
    } else {
      setList([...filtered, item]);
    }
  };

  const addItemLivre = (list: string[], setList: (l: string[]) => void, item: string, setClear: (s: string) => void) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const filtered = list.filter((i) => i !== 'Nenhum');
    if (!filtered.includes(trimmed)) {
      setList([...filtered, trimmed]);
    }
    setClear('');
  };

  // IMC atual
  const pesoNum = parseFloat(peso.replace(',', '.'));
  const alturaNum = parseFloat(altura.replace(',', '.'));
  let imcValor: string | null = null;
  let imcClassificacao = '';
  if (pesoNum > 0 && alturaNum > 0) {
    const altMetros = alturaNum > 3 ? alturaNum / 100 : alturaNum;
    const calc = pesoNum / (altMetros * altMetros);
    imcValor = calc.toFixed(1);
    if (calc < 18.5) imcClassificacao = 'Abaixo do peso';
    else if (calc < 24.9) imcClassificacao = 'Peso adequado';
    else if (calc < 29.9) imcClassificacao = 'Sobrepeso';
    else if (calc < 34.9) imcClassificacao = 'Obesidade grau I';
    else if (calc < 39.9) imcClassificacao = 'Obesidade grau II';
    else imcClassificacao = 'Obesidade grau III';
  }

  // Salvar alterações nos Dados do Paciente (Seção 1)
  const handleSavePatientData = async (e: React.FormEvent) => {
    e.preventDefault();
    setDataError(null);
    setDataSuccess(false);

    if (!nome.trim()) {
      setDataError('O nome completo do paciente é obrigatório.');
      setActiveDataTab('pessoal');
      return;
    }

    try {
      setSavingData(true);
      const pesoFinal = pesoNum > 0 ? pesoNum : null;
      const alturaFinal = alturaNum > 0 ? alturaNum : null;
      const refeicoesFinal = refeicoesDia ? parseInt(refeicoesDia, 10) : null;
      const litrosAguaFinal = litrosAgua ? parseFloat(litrosAgua.replace(',', '.')) : null;

      await sql.query(
        `UPDATE public.pacientes SET
          nome = $1,
          data_nascimento = $2,
          sexo = $3,
          telefone = $4,
          whatsapp = $5,
          email = $6,
          peso_inicial = $7,
          altura = $8,
          objetivos = $9,
          objetivo_texto = $10,
          nivel_atividade = $11,
          patologias = $12,
          restricoes_alimentares = $13,
          alergias = $14,
          medicamentos = $15,
          suplementos = $16,
          refeicoes_por_dia = $17,
          horario_acorda = $18,
          horario_dorme = $19,
          litros_agua = $20,
          atividade_fisica = $21,
          atividade_fisica_descricao = $22,
          observacoes = $23
        WHERE id = $24`,
        [
          nome.trim(),
          dataNascimento || null,
          sexo || null,
          whatsapp || null,
          whatsapp || null,
          email.trim().toLowerCase() || null,
          pesoFinal,
          alturaFinal,
          objetivos.length > 0 ? objetivos : null,
          objetivoTexto.trim() || null,
          nivelAtividade || null,
          patologias.length > 0 ? patologias : null,
          restricoes.length > 0 ? restricoes : null,
          alergias.length > 0 ? alergias : null,
          medicamentos.trim() || null,
          suplementos.trim() || null,
          refeicoesFinal,
          formatarHora(horarioAcordaInput) || null,
          formatarHora(horarioDormeInput) || null,
          litrosAguaFinal,
          praticaAtividade,
          praticaAtividade ? atividadeDescricao.trim() || null : null,
          observacoes.trim() || null,
          patientId
        ]
      );

      setDataSuccess(true);
      setTimeout(() => setDataSuccess(false), 4000);
    } catch (err: any) {
      console.error('Erro ao atualizar paciente:', err);
      setDataError(err?.message || 'Falha ao salvar alterações no Neon.');
    } finally {
      setSavingData(false);
    }
  };

  // Salvar Nova Consulta (Seção 2)
  const handleSaveConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsultaError(null);

    if (!consultaData) {
      setConsultaError('A data da consulta é obrigatória.');
      return;
    }

    try {
      setSavingConsulta(true);
      const pesoVal = consultaPeso ? parseFloat(consultaPeso.replace(',', '.')) : null;
      const cinturaVal = consultaCintura ? parseFloat(consultaCintura.replace(',', '.')) : null;
      const quadrilVal = consultaQuadril ? parseFloat(consultaQuadril.replace(',', '.')) : null;
      const gorduraVal = consultaGordura ? parseFloat(consultaGordura.replace(',', '.')) : null;

      await sql.query(
        `INSERT INTO public.consultas (
          paciente_id,
          data_consulta,
          peso,
          cintura,
          quadril,
          percentual_gordura,
          observacoes,
          proximo_retorno,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
        [
          patientId,
          consultaData,
          pesoVal,
          cinturaVal,
          quadrilVal,
          gorduraVal,
          consultaObs.trim() || null,
          consultaRetorno || null,
        ]
      );

      // Recarregar lista de consultas
      const consultasAtualizadas = await sql.query(
        `SELECT id, data_consulta, peso, cintura, quadril, percentual_gordura, observacoes, proximo_retorno, created_at
         FROM public.consultas
         WHERE paciente_id = $1
         ORDER BY data_consulta DESC, created_at DESC`,
        [patientId]
      );
      setConsultas(consultasAtualizadas as Consulta[]);

      // Fechar modal e resetar formulário
      setIsModalOpen(false);
      setConsultaPeso('');
      setConsultaCintura('');
      setConsultaQuadril('');
      setConsultaGordura('');
      setConsultaObs('');
      setConsultaRetorno('');
    } catch (err: any) {
      console.error('Erro ao salvar consulta:', err);
      setConsultaError(err?.message || 'Falha ao salvar consulta no Neon.');
    } finally {
      setSavingConsulta(false);
    }
  };

  // Preparar dados do gráfico de evolução do peso (ordem cronológica crescente)
  const consultasCronologicas = [...consultas]
    .filter((c) => c.peso !== null && Number(c.peso) > 0)
    .sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime());

  // Render do Gráfico SVG de Peso
  const renderWeightChart = () => {
    if (consultasCronologicas.length === 0) {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 bg-emerald-50/20 rounded-2xl border border-dashed border-emerald-200">
          <Scale className="w-8 h-8 text-emerald-400" />
          <p className="text-sm font-semibold text-gray-700">Nenhuma consulta registrada ainda</p>
          <p className="text-xs text-gray-500">
            Cadastre uma nova consulta para visualizar o gráfico de evolução de peso.
          </p>
        </div>
      );
    }

    const pesos = consultasCronologicas.map((c) => Number(c.peso));
    const minPeso = Math.floor(Math.min(...pesos) - 2);
    const maxPeso = Math.ceil(Math.max(...pesos) + 2);
    const range = Math.max(maxPeso - minPeso, 1);

    const width = 640;
    const height = 200;
    const padding = { top: 25, right: 35, bottom: 35, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const points = consultasCronologicas.map((c, index) => {
      const x =
        consultasCronologicas.length === 1
          ? padding.left + chartW / 2
          : padding.left + (index / (consultasCronologicas.length - 1)) * chartW;
      const y = padding.top + chartH - ((Number(c.peso) - minPeso) / range) * chartH;
      return { x, y, peso: Number(c.peso), data: c.data_consulta };
    });

    const pathD = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaD =
      points.length > 1
        ? `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
        : '';

    return (
      <div className="w-full overflow-x-auto bg-gradient-to-b from-emerald-50/30 to-white p-4 rounded-2xl border border-emerald-100">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontais */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = padding.top + chartH * pct;
            const val = (maxPeso - pct * range).toFixed(1);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-gray-400 font-medium"
                >
                  {val} kg
                </text>
              </g>
            );
          })}

          {/* Área preenchida */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {/* Linha do gráfico */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Pontos com círculos e tooltips */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#ffffff"
                stroke="#059669"
                strokeWidth="2.5"
                className="hover:r-7 transition-all duration-200 cursor-pointer"
              />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                className="text-[11px] font-bold fill-emerald-950"
              >
                {p.peso} kg
              </text>
              <text
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] fill-gray-500 font-medium"
              >
                {new Date(p.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-emerald-800">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold">Carregando prontuário do paciente...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 px-4 py-2.5 rounded-2xl border border-gray-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para pacientes</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Prontuário Ativo
          </span>
        </div>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-emerald-600/20">
              {nome ? nome.slice(0, 2).toUpperCase() : 'PA'}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                {nome || 'Sem nome'}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                {sexo && <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">{sexo}</span>}
                {dataNascimento && (
                  <span>
                    Nasc: {new Date(dataNascimento).toLocaleDateString('pt-BR')} ({calcularIdade(dataNascimento)} anos)
                  </span>
                )}
                {whatsapp && <span>• {whatsapp}</span>}
                {email && <span>• {email}</span>}
              </div>
            </div>
          </div>

          {imcValor && (
            <div className="bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-2xl text-right">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                IMC Atual
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-emerald-900">{imcValor}</span>
                <span className="text-xs font-semibold text-emerald-700">{imcClassificacao}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs (3 Seções Principais do Prompt 5) */}
        <div className="flex border-b border-gray-100 mt-8 gap-2 sm:gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection('dados')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSection === 'dados'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Dados do Paciente</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('consultas')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSection === 'consultas'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Consultas</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
              {consultas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('planos')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSection === 'planos'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Planos Alimentares</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-extrabold rounded-full">
              {planos.length}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SEÇÃO 1: DADOS DO PACIENTE                               */}
      {/* ======================================================== */}
      {activeSection === 'dados' && (
        <form onSubmit={handleSavePatientData} className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
          {/* Sub-tabs: Pessoal, Clínico, Hábitos */}
          <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveDataTab('pessoal')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeDataTab === 'pessoal'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Pessoal</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDataTab('clinico')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeDataTab === 'clinico'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Clínico</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDataTab('habitos')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeDataTab === 'habitos'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>Hábitos</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Feedback de sucesso / erro */}
            {dataSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>Alterações do paciente salvas com sucesso no banco de dados!</span>
              </div>
            )}
            {dataError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 text-sm font-semibold">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span>{dataError}</span>
              </div>
            )}

            {/* ABA 1: PESSOAL */}
            {activeDataTab === 'pessoal' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Data de Nascimento
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                      />
                      {calcularIdade(dataNascimento) !== null && (
                        <span className="absolute right-3 top-3 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg pointer-events-none">
                          {calcularIdade(dataNascimento)} anos
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Sexo
                    </label>
                    <select
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))}
                      placeholder="(11) 98765-4321"
                      className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="paciente@exemplo.com"
                      className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: CLÍNICO */}
            {activeDataTab === 'clinico' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Peso Atual (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={peso}
                        onChange={(e) => setPeso(e.target.value)}
                        placeholder="70.5"
                        className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition pr-12"
                      />
                      <span className="absolute right-4 top-3.5 text-xs font-bold text-gray-400">kg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Altura (cm)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={altura}
                        onChange={(e) => setAltura(e.target.value)}
                        placeholder="175"
                        className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition pr-12"
                      />
                      <span className="absolute right-4 top-3.5 text-xs font-bold text-gray-400">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      IMC (Automático)
                    </label>
                    <div className="px-4 py-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between">
                      <span className="text-base font-black text-emerald-950">{imcValor ? `${imcValor} kg/m²` : '—'}</span>
                      {imcClassificacao && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-xs">
                          {imcClassificacao}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Objetivos */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Objetivos
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      'Emagrecer',
                      'Ganhar massa',
                      'Controlar diabetes',
                      'Saúde geral',
                      'Performance esportiva',
                      'Reeducação alimentar'
                    ].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(objetivos, setObjetivos, item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          objetivos.includes(item)
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={objetivoTexto}
                    onChange={(e) => setObjetivoTexto(e.target.value)}
                    placeholder="Outro objetivo ou observação específica..."
                    className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs outline-none"
                  />
                </div>

                {/* Nível de Atividade */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Nível de Atividade Física
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {['Sedentário', 'Levemente ativo', 'Moderadamente ativo', 'Muito ativo', 'Extremamente ativo'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setNivelAtividade(lvl)}
                        className={`p-2.5 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                          nivelAtividade === lvl
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patologias */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Patologias ou Condições de Saúde
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Nenhum', 'Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(patologias, setPatologias, item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          patologias.includes(item)
                            ? item === 'Nenhum' ? 'bg-gray-700 text-white border-gray-700' : 'bg-rose-600 text-white border-rose-600'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novaPatologia}
                      onChange={(e) => setNovaPatologia(e.target.value)}
                      placeholder="Adicionar outra patologia..."
                      className="flex-1 px-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addItemLivre(patologias, setPatologias, novaPatologia, setNovaPatologia)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Restrições Alimentares */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Restrições Alimentares
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Nenhum', 'Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(restricoes, setRestricoes, item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          restricoes.includes(item)
                            ? item === 'Nenhum' ? 'bg-gray-700 text-white border-gray-700' : 'bg-amber-600 text-white border-amber-600'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novaRestricao}
                      onChange={(e) => setNovaRestricao(e.target.value)}
                      placeholder="Adicionar outra restrição..."
                      className="flex-1 px-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addItemLivre(restricoes, setRestricoes, novaRestricao, setNovaRestricao)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Alergias Alimentares */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Alergias Alimentares
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Nenhum', 'Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(alergias, setAlergias, item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          alergias.includes(item)
                            ? item === 'Nenhum' ? 'bg-gray-700 text-white border-gray-700' : 'bg-red-600 text-white border-red-600'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novaAlergia}
                      onChange={(e) => setNovaAlergia(e.target.value)}
                      placeholder="Adicionar outra alergia..."
                      className="flex-1 px-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addItemLivre(alergias, setAlergias, novaAlergia, setNovaAlergia)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Medicamentos & Suplementos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Medicamentos Contínuos
                    </label>
                    <textarea
                      rows={2}
                      value={medicamentos}
                      onChange={(e) => setMedicamentos(e.target.value)}
                      placeholder="Ex: Puran T4 50mcg em jejum..."
                      className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Suplementos em Uso
                    </label>
                    <textarea
                      rows={2}
                      value={suplementos}
                      onChange={(e) => setSuplementos(e.target.value)}
                      placeholder="Ex: Creatina 5g, Vitamina D 2000UI..."
                      className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: HÁBITOS */}
            {activeDataTab === 'habitos' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Refeições / Dia
                    </label>
                    <input
                      type="number"
                      value={refeicoesDia}
                      onChange={(e) => setRefeicoesDia(e.target.value)}
                      placeholder="Ex: 4"
                      className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 rounded-xl text-sm font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Horário Acorda
                    </label>
                    <input
                      type="text"
                      value={horarioAcordaInput}
                      onChange={(e) => setHorarioAcordaInput(e.target.value)}
                      onBlur={() => setHorarioAcordaInput(formatarHora(horarioAcordaInput))}
                      placeholder="Ex: 06:30"
                      className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 rounded-xl text-sm font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Horário Dorme
                    </label>
                    <input
                      type="text"
                      value={horarioDormeInput}
                      onChange={(e) => setHorarioDormeInput(e.target.value)}
                      onBlur={() => setHorarioDormeInput(formatarHora(horarioDormeInput))}
                      placeholder="Ex: 22:30"
                      className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 rounded-xl text-sm font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Água / Dia (Litros)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={litrosAgua}
                        onChange={(e) => setLitrosAgua(e.target.value)}
                        placeholder="Ex: 2.5"
                        className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 rounded-xl text-sm font-medium outline-none pr-14"
                      />
                      <span className="absolute right-4 top-3.5 text-xs font-bold text-gray-400">litros</span>
                    </div>
                  </div>
                </div>

                {/* Atividade física */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Pratica Atividade Física?
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setPraticaAtividade(true)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        praticaAtividade === true
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setPraticaAtividade(false)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        praticaAtividade === false
                          ? 'bg-gray-700 text-white border-gray-700'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                  {praticaAtividade && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={atividadeDescricao}
                        onChange={(e) => setAtividadeDescricao(e.target.value)}
                        placeholder="Qual atividade e frequência semanal? (Ex: Musculação 4x/semana)"
                        className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Observações Gerais
                  </label>
                  <textarea
                    rows={3}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Outras anotações sobre hábitos ou preferências do paciente..."
                    className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer com Botão de Salvar Alterações */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">
              Dados sincronizados diretamente com o banco de dados Neon
            </span>
            <button
              type="submit"
              disabled={savingData}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {savingData ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO 2: CONSULTAS & EVOLUÇÃO DE PESO                    */}
      {/* ======================================================== */}
      {activeSection === 'consultas' && (
        <div className="space-y-6">
          {/* Card do Gráfico de Evolução de Peso */}
          <div className="bg-white rounded-3xl border border-emerald-100 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span>Evolução de Peso</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Histórico e progressão ponderal registrada ao longo das consultas
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Consulta</span>
              </button>
            </div>

            {/* Gráfico */}
            {renderWeightChart()}
          </div>

          {/* Lista de Consultas */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900">
                Histórico de Consultas ({consultas.length})
              </h4>
              <span className="text-xs text-gray-400 font-medium">Ordem cronológica decrescente</span>
            </div>

            {consultas.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                Nenhuma consulta registrada para este paciente ainda.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {consultas.map((c) => (
                  <div key={c.id} className="p-6 hover:bg-emerald-50/30 transition">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-base text-gray-900">
                            {new Date(c.data_consulta).toLocaleDateString('pt-BR')}
                          </span>
                          {c.proximo_retorno && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                              <Calendar className="w-3 h-3 text-teal-600" />
                              Retorno: {new Date(c.proximo_retorno).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>

                        {c.observacoes && (
                          <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-3 rounded-xl">
                            {c.observacoes}
                          </p>
                        )}
                      </div>

                      {/* Medidas da Consulta */}
                      <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                        {c.peso !== null && (
                          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-900 rounded-xl text-center border border-emerald-100">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Peso</span>
                            <span className="text-xs font-black">{c.peso} kg</span>
                          </div>
                        )}
                        {c.cintura !== null && (
                          <div className="px-3 py-1.5 bg-gray-50 text-gray-900 rounded-xl text-center border border-gray-200">
                            <span className="text-[10px] uppercase font-bold text-gray-500 block">Cintura</span>
                            <span className="text-xs font-black">{c.cintura} cm</span>
                          </div>
                        )}
                        {c.quadril !== null && (
                          <div className="px-3 py-1.5 bg-gray-50 text-gray-900 rounded-xl text-center border border-gray-200">
                            <span className="text-[10px] uppercase font-bold text-gray-500 block">Quadril</span>
                            <span className="text-xs font-black">{c.quadril} cm</span>
                          </div>
                        )}
                        {c.percentual_gordura !== null && (
                          <div className="px-3 py-1.5 bg-teal-50 text-teal-900 rounded-xl text-center border border-teal-100">
                            <span className="text-[10px] uppercase font-bold text-teal-600 block">% Gordura</span>
                            <span className="text-xs font-black">{c.percentual_gordura}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO 3: PLANOS ALIMENTARES                              */}
      {/* ======================================================== */}
      {activeSection === 'planos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-emerald-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
                <span>Planos Alimentares</span>
              </h3>
              <p className="text-xs text-gray-500">
                Gere e consulte prescrições dietéticas personalizadas
              </p>
            </div>

            {/* Botão em destaque conforme especificado no Prompt 5 */}
            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Gerar Plano Alimentar</span>
            </button>
          </div>

          {/* Histórico de Planos */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h4 className="text-base font-bold text-gray-900">
                Histórico de Planos Salvos
              </h4>
            </div>

            {planos.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-gray-800">
                  Nenhum plano alimentar gerado ainda
                </h5>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Clique no botão acima para criar o primeiro plano nutricional personalizado do paciente.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {planos.map((plano) => (
                  <div
                    key={plano.id}
                    onClick={() => setSelectedPlano(selectedPlano?.id === plano.id ? null : plano)}
                    className="p-6 hover:bg-emerald-50/40 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900 block">
                            Plano Alimentar
                          </span>
                          <span className="text-xs text-gray-500">
                            Gerado em {new Date(plano.created_at).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(plano.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                        <span>{selectedPlano?.id === plano.id ? 'Recolher' : 'Visualizar plano'}</span>
                        <ChevronRight className={`w-4 h-4 transition ${selectedPlano?.id === plano.id ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Exibição completa ao expandir */}
                    {selectedPlano?.id === plano.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-800 space-y-2">
                        <div className="font-bold text-emerald-900 mb-2">Conteúdo do Plano:</div>
                        <pre className="whitespace-pre-wrap font-sans text-xs bg-white p-4 rounded-xl border border-gray-100 leading-relaxed">
                          {typeof plano.conteudo === 'string'
                            ? plano.conteudo
                            : JSON.stringify(plano.conteudo, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVA CONSULTA (Prompt 5)                          */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>Nova Consulta</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Registre as medidas e observações do atendimento
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {consultaError && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{consultaError}</span>
              </div>
            )}

            <form onSubmit={handleSaveConsulta} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Data da Consulta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={consultaData}
                    onChange={(e) => setConsultaData(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Peso Atual (kg)
                  </label>
                  <input
                    type="text"
                    value={consultaPeso}
                    onChange={(e) => setConsultaPeso(e.target.value)}
                    placeholder="Ex: 72.4"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Cintura (cm)
                  </label>
                  <input
                    type="text"
                    value={consultaCintura}
                    onChange={(e) => setConsultaCintura(e.target.value)}
                    placeholder="Ex: 82"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Quadril (cm)
                  </label>
                  <input
                    type="text"
                    value={consultaQuadril}
                    onChange={(e) => setConsultaQuadril(e.target.value)}
                    placeholder="Ex: 101"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    % Gordura
                  </label>
                  <input
                    type="text"
                    value={consultaGordura}
                    onChange={(e) => setConsultaGordura(e.target.value)}
                    placeholder="Ex: 18.5"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Próximo Retorno
                </label>
                <input
                  type="date"
                  value={consultaRetorno}
                  onChange={(e) => setConsultaRetorno(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Observações
                </label>
                <textarea
                  rows={3}
                  value={consultaObs}
                  onChange={(e) => setConsultaObs(e.target.value)}
                  placeholder="Evolução do paciente, adesão à dieta, novas queixas..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl text-xs font-medium outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingConsulta}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {savingConsulta ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar consulta</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
