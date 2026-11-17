import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Dumbbell, 
  HeartPulse, 
  User, 
  Save, 
  Loader2, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Edit3,
  Trash2,
  Users
} from 'lucide-react';
import { sql } from '../lib/neon';

interface TreinoFormProps {
  userId: string;
  initialTreinoId?: string | null;
  onCancel: () => void;
  onSaved: (treinoId: string) => void;
}

export interface ExercicioTreino {
  nome: string;
  series: string;
  reps: string;
  distancia: string;
  carga: string;
  intensidade: string;
  descanso: string;
  tecnica: string;
}

export interface DiaTreinoItem {
  dia: string;
  grupo_muscular: string;
  tipo_treino: string;
  duracao_minutos: number;
  exercicios: ExercicioTreino[];
  observacoes_do_dia: string;
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

const OBJETIVOS_LIST = [
  'Emagrecer',
  'Ganhar massa',
  'Controlar diabetes',
  'Saúde geral',
  'Performance esportiva',
  'Reeducação alimentar'
];

const NIVEIS_ATIVIDADE = [
  'Sedentário',
  'Levemente ativo',
  'Moderadamente ativo',
  'Muito ativo',
  'Extremamente ativo'
];

const PATOLOGIAS_LIST = [
  'Diabetes',
  'Hipertensão',
  'Hipotireoidismo',
  'Hipertireoidismo',
  'Síndrome do ovário policístico',
  'Doença celíaca',
  'Colesterol alto'
];

const RESTRICOES_LIST = [
  'Lactose',
  'Glúten',
  'Açúcar',
  'Carne vermelha',
  'Frutos do mar'
];

const ALERGIAS_LIST = [
  'Amendoim',
  'Leite',
  'Ovo',
  'Soja',
  'Trigo',
  'Frutos do mar'
];

const OPCOES_EXERCICIOS = [
  'Supino Reto com Barra',
  'Supino Inclinado com Halteres',
  'Crucifixo no Cabo',
  'Tríceps Corda',
  'Tríceps Pulley',
  'Puxada Frontal Aberta',
  'Remada Baixa Triângulo',
  'Remada Curvada com Barra',
  'Rosca Direta com Barra W',
  'Rosca Martelo com Halteres',
  'Agachamento Livre',
  'Leg Press 45°',
  'Cadeira Extensora',
  'Mesa Flexora',
  'Stiff com Halteres',
  'Elevação Pélvica',
  'Desenvolvimento com Halteres',
  'Elevação Lateral com Halteres',
  'Prancha Abdominal',
  'Aquecimento 200m Crawl',
  'Tiro de 50m Crawl',
  '100m Nado Peito / Costas',
  'Corrida Contínua 5km',
  'Tiro de 400m Esteira',
  'Caminhada em Esteira 30min',
  'Alongamento e Mobilidade'
];

const OPCOES_SERIES = ['1', '2', '3', '4', '5', '6'];
const OPCOES_REPS = ['-', '6-8', '8-10', '10-12', '12-15', '15-20', 'Até a falha'];
const OPCOES_DISTANCIA = ['-', '25m', '50m', '100m', '200m', '400m', '500m', '1km', '3km', '5km'];
const OPCOES_CARGA = ['Sem carga', 'Peso Corporal', 'Leve', 'Moderada', 'Pesada', '10kg', '20kg', '30kg', '70% 1RM'];
const OPCOES_INTENSIDADE = ['Leve (Z1)', 'Moderada (Z2)', 'Moderada / Alta (RPE 7-8)', 'Alta (Z4)', 'Máxima (Z5)'];
const OPCOES_DESCANSO = ['30s', '45s', '60s', '90s', '2min'];

function criarExercicioVazio(): ExercicioTreino {
  return {
    nome: '',
    series: '3',
    reps: '12',
    distancia: '-',
    carga: 'Moderada',
    intensidade: 'RPE 7-8',
    descanso: '60s',
    tecnica: ''
  };
}

function criarEstruturaSemanalPadrao(): DiaTreinoItem[] {
  return DIAS_PADRAO.map((dia, idx) => ({
    dia,
    grupo_muscular: idx === 6 ? 'Recuperação e Repouso' : (idx % 2 === 0 ? 'Membros Superiores' : 'Membros Inferiores'),
    tipo_treino: idx === 6 ? 'Repouso / Descanso' : (idx === 2 ? 'Natação' : 'Musculação'),
    duracao_minutos: idx === 6 ? 0 : 50,
    exercicios: idx === 6 ? [] : [criarExercicioVazio()],
    observacoes_do_dia: idx === 6 ? 'Descanso e boa hidratação' : 'Aquecer bem as articulações antes de iniciar'
  }));
}

export const TreinoForm: React.FC<TreinoFormProps> = ({
  userId,
  initialTreinoId,
  onCancel,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'pessoal' | 'clinico' | 'prescricao'>('pessoal');
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Buscando dados do paciente...');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pacientes existentes para vincular rapidamente
  const [pacientesCadastrados, setPacientesCadastrados] = useState<any[]>([]);
  const [pacienteIdSelecionado, setPacienteIdSelecionado] = useState<string>('');

  // Aba 1: Pessoal / Aluno
  const [nomeAluno, setNomeAluno] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [sexo, setSexo] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [modalidadePrincipal, setModalidadePrincipal] = useState('Musculação');
  const [frequenciaSemanal, setFrequenciaSemanal] = useState('3 a 5x por semana');

  // Aba 2: Clínico / Anamnese
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
  const [observacoes, setObservacoes] = useState('');

  // Aba 3: Prescrição do Treino Semanal
  const [diasTreino, setDiasTreino] = useState<DiaTreinoItem[]>(criarEstruturaSemanalPadrao());
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Carregar lista de pacientes para auto-preenchimento
  useEffect(() => {
    async function carregarPacientes() {
      try {
        const res = await sql.query(
          `SELECT id, nome, data_nascimento, sexo, whatsapp, email, peso_inicial, altura, 
                  objetivos, objetivo_texto, nivel_atividade, patologias, restricoes_alimentares, 
                  alergias, medicamentos, suplementos, observacoes
           FROM public.pacientes 
           WHERE nutricionista_id = $1 
           ORDER BY nome ASC`,
          [userId]
        );
        setPacientesCadastrados(res);
      } catch (err) {
        console.error('Erro ao carregar pacientes:', err);
      }
    }
    if (userId) carregarPacientes();
  }, [userId]);

  // Se estiver editando treino existente
  useEffect(() => {
    async function carregarTreinoExistente() {
      if (!initialTreinoId) return;
      try {
        const res = await sql.query(
          `SELECT * FROM public.fichas_treino WHERE id = $1`,
          [initialTreinoId]
        );
        if (res && res.length > 0) {
          const t = res[0];
          setNomeAluno(t.nome_aluno || '');
          setWhatsapp(t.whatsapp || '');
          setEmail(t.email || '');
          setSexo(t.sexo || '');
          setPeso(t.peso ? String(t.peso) : '');
          setAltura(t.altura ? String(t.altura) : '');
          setObjetivos(t.objetivo ? [t.objetivo] : []);
          setObjetivoTexto(t.objetivo_texto || '');
          setNivelAtividade(t.nivel_atividade || '');
          setPatologias(t.patologias || []);
          setRestricoes(t.restricoes || []);
          setAlergias(t.alergias || []);
          setMedicamentos(t.medicamentos || '');
          setSuplementos(t.suplementos || '');
          setModalidadePrincipal(t.modalidade || 'Musculação');
          setFrequenciaSemanal(t.frequencia_semanal || '');
          setObservacoes(t.observacoes || '');
          if (t.dias_treino && Array.isArray(t.dias_treino) && t.dias_treino.length > 0) {
            setDiasTreino(t.dias_treino);
          }
          if (t.paciente_id) {
            setPacienteIdSelecionado(t.paciente_id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar treino:', err);
      }
    }
    carregarTreinoExistente();
  }, [initialTreinoId]);

  // Preenchimento automático ao selecionar paciente já cadastrado
  const handleVincularPaciente = (pacienteId: string) => {
    setPacienteIdSelecionado(pacienteId);
    if (!pacienteId) return;
    const p = pacientesCadastrados.find(item => item.id === pacienteId);
    if (p) {
      setNomeAluno(p.nome || '');
      setWhatsapp(p.whatsapp || '');
      setEmail(p.email || '');
      setSexo(p.sexo || '');
      setDataNascimento(p.data_nascimento ? String(p.data_nascimento).split('T')[0] : '');
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
      setObservacoes(p.observacoes || '');
    }
  };

  // Cálculo de IMC
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

  // Helpers de toggle
  const toggleItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    if (item === 'Nenhum') {
      setList(list.includes('Nenhum') ? [] : ['Nenhum']);
      return;
    }
    const filtered = list.filter(i => i !== 'Nenhum');
    if (filtered.includes(item)) {
      setList(filtered.filter(i => i !== item));
    } else {
      setList([...filtered, item]);
    }
  };

  const addItemLivre = (list: string[], setList: (l: string[]) => void, item: string, setClear: (s: string) => void) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const filtered = list.filter(i => i !== 'Nenhum');
    if (!filtered.includes(trimmed)) {
      setList([...filtered, trimmed]);
    }
    setClear('');
  };

  // Mensagens dinâmicas de Loading da IA
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      const messages = [
        'Buscando dados do paciente...',
        'Analisando objetivos e nível de atividade física...',
        'IA calculando Sugestão de Treino (Musculação/Natação/Cardio)...',
        'Estruturando exercícios, séries, repetições e cargas...',
        'Definindo intensidades e tempos de descanso...',
        'Finalizando prescrição de treino personalizada...'
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2300);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Gerar Treino com IA
  const handleGerarTreinoIA = async () => {
    if (!nomeAluno.trim()) {
      setError('Informe o nome do aluno/paciente na aba "Identificação" antes de gerar com IA.');
      setActiveTab('pessoal');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const payload = {
        nome: nomeAluno,
        sexo,
        peso_atual_kg: peso,
        altura_cm: altura,
        objetivos,
        detalhes_objetivo: objetivoTexto,
        nivel_atividade: nivelAtividade,
        patologias,
        restricoes_alimentares: restricoes,
        alergias,
        medicamentos,
        suplementos,
        modalidade: modalidadePrincipal,
        observacoes
      };

      const res = await fetch('/api/gerar-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados_do_paciente: payload })
      });

      const data = await res.json();
      if (!res.ok || !data.plano_treino_semanal) {
        throw new Error(data.error || 'Falha ao gerar treino com IA');
      }

      setDiasTreino(data.plano_treino_semanal);
      setActiveTab('prescricao');
      setActiveDayIndex(0);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error('Erro na IA:', err);
      setError('Não foi possível gerar com IA no momento. Você pode preencher manualmente na aba "Prescrição do Treino".');
    } finally {
      setIsGenerating(false);
    }
  };

  // Manipulação de exercícios
  const handleExercicioChange = (dayIdx: number, exIdx: number, field: keyof ExercicioTreino, value: string) => {
    setDiasTreino(prev => prev.map((d, dI) => {
      if (dI !== dayIdx) return d;
      const newEx = d.exercicios.map((ex, eI) => eI === exIdx ? { ...ex, [field]: value } : ex);
      return { ...d, exercicios: newEx };
    }));
  };

  const handleDiaChange = (dayIdx: number, field: keyof DiaTreinoItem, value: any) => {
    setDiasTreino(prev => prev.map((d, dI) => dI === dayIdx ? { ...d, [field]: value } : d));
  };

  const addExercicio = (dayIdx: number) => {
    setDiasTreino(prev => prev.map((d, dI) => dI === dayIdx ? { ...d, exercicios: [...d.exercicios, criarExercicioVazio()] } : d));
  };

  const removeExercicio = (dayIdx: number, exIdx: number) => {
    setDiasTreino(prev => prev.map((d, dI) => dI === dayIdx ? { ...d, exercicios: d.exercicios.filter((_, eI) => eI !== exIdx) } : d));
  };

  // Salvar Ficha de Treino no Neon
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeAluno.trim()) {
      setError('O nome completo do aluno/paciente é obrigatório.');
      setActiveTab('pessoal');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const pesoFinal = pesoNum > 0 ? pesoNum : null;
      const alturaFinal = alturaNum > 0 ? alturaNum : null;
      const imcFinal = imcValor ? parseFloat(imcValor) : null;
      const objetivoPrincipal = objetivos.length > 0 ? objetivos[0] : null;

      let savedId = initialTreinoId;

      if (initialTreinoId) {
        // Atualizar
        await sql.query(
          `UPDATE public.fichas_treino SET
            paciente_id = $1,
            nome_aluno = $2,
            whatsapp = $3,
            email = $4,
            sexo = $5,
            peso = $6,
            altura = $7,
            imc = $8,
            objetivo = $9,
            objetivo_texto = $10,
            nivel_atividade = $11,
            patologias = $12,
            restricoes = $13,
            alergias = $14,
            medicamentos = $15,
            suplementos = $16,
            modalidade = $17,
            frequencia_semanal = $18,
            observacoes = $19,
            dias_treino = $20
          WHERE id = $21`,
          [
            pacienteIdSelecionado || null,
            nomeAluno.trim(),
            whatsapp,
            email,
            sexo,
            pesoFinal,
            alturaFinal,
            imcFinal,
            objetivoPrincipal,
            objetivoTexto,
            nivelAtividade,
            patologias,
            restricoes,
            alergias,
            medicamentos,
            suplementos,
            modalidadePrincipal,
            frequenciaSemanal,
            observacoes,
            JSON.stringify(diasTreino),
            initialTreinoId
          ]
        );
      } else {
        // Inserir
        const res = await sql.query(
          `INSERT INTO public.fichas_treino (
            nutricionista_id, paciente_id, nome_aluno, whatsapp, email, sexo,
            peso, altura, imc, objetivo, objetivo_texto, nivel_atividade,
            patologias, restricoes, alergias, medicamentos, suplementos,
            modalidade, frequencia_semanal, observacoes, dias_treino
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          ) RETURNING id`,
          [
            userId,
            pacienteIdSelecionado || null,
            nomeAluno.trim(),
            whatsapp,
            email,
            sexo,
            pesoFinal,
            alturaFinal,
            imcFinal,
            objetivoPrincipal,
            objetivoTexto,
            nivelAtividade,
            patologias,
            restricoes,
            alergias,
            medicamentos,
            suplementos,
            modalidadePrincipal,
            frequenciaSemanal,
            observacoes,
            JSON.stringify(diasTreino)
          ]
        );
        savedId = res[0]?.id;
      }

      setSuccess(true);
      setTimeout(() => {
        onSaved(savedId || '');
      }, 700);

    } catch (err: any) {
      console.error('Erro ao salvar treino:', err);
      setError('Erro ao salvar ficha de treino: ' + (err?.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const diaAtual = diasTreino[activeDayIndex];

  return (
    <div className="space-y-6">
      {/* Barra de Topo com Voltar e Botões em Destaque */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Gestão de Treinos</span>
        </button>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Botão em Destaque: Plano de Treino Manual */}
          <button
            type="button"
            disabled={isGenerating || saving}
            onClick={() => {
              setDiasTreino(criarEstruturaSemanalPadrao());
              setActiveTab('prescricao');
              setActiveDayIndex(0);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-900 border-2 border-emerald-400 font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Edit3 className="w-4 h-4 text-emerald-700" />
            <span>Plano de treino Manual</span>
          </button>

          {/* Botão em Destaque: Gerar Plano com IA */}
          <button
            type="button"
            disabled={isGenerating || saving}
            onClick={handleGerarTreinoIA}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Gerando com IA...</span>
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

      {/* Loading animado com mensagens dinâmicas da IA */}
      {isGenerating && (
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 text-white p-8 rounded-3xl shadow-xl border border-emerald-700/40 text-center space-y-4 animate-in fade-in">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-400/20 border-t-emerald-400 animate-spin" />
            <Dumbbell className="w-6 h-6 text-emerald-300 absolute animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-black tracking-tight">{loadingMessage}</h4>
            <p className="text-xs text-emerald-200/80">
              Aguarde enquanto a IA estrutura os exercícios, séries, repetições, distâncias e cargas conforme o perfil preenchido.
            </p>
          </div>
        </div>
      )}

      {/* Notificações de Erro e Sucesso */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Ficha de treino salva e atualizada com sucesso!</span>
        </div>
      )}

      {/* Formulário Principal em Estilo de Prontuário / Cadastro com 3 Abas */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        {/* Abas Superiores */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pessoal')}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'pessoal'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
            }`}
          >
            <User className="w-4 h-4 text-emerald-600" />
            <span>1. Identificação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clinico')}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'clinico'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-emerald-600" />
            <span>2. Clínico & Objetivos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prescricao')}
            className={`flex-1 min-w-[160px] py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'prescricao'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
            }`}
          >
            <Dumbbell className="w-4 h-4 text-emerald-600" />
            <span>3. Prescrição do Treino</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: IDENTIFICAÇÃO DO ALUNO / PACIENTE                 */}
        {/* ======================================================== */}
        {activeTab === 'pessoal' && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in">
            {/* Opção rápida de vincular paciente já cadastrado no sistema */}
            {pacientesCadastrados.length > 0 && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <label className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Vincular com paciente cadastrado (opcional)</span>
                </label>
                <select
                  value={pacienteIdSelecionado}
                  onChange={(e) => handleVincularPaciente(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Selecione para preencher dados automaticamente...</option>
                  {pacientesCadastrados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.whatsapp ? `• ${p.whatsapp}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-700">
                  Ao selecionar um paciente, os dados de anamnese, peso e objetivos são importados automaticamente.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-gray-700 block">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nomeAluno}
                  onChange={(e) => setNomeAluno(e.target.value)}
                  placeholder="Nome do aluno ou paciente..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-semibold outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">WhatsApp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-medium outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aluno@email.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-medium outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Sexo</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Feminino', 'Masculino', 'Outro'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSexo(s)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        sexo === s
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Data de Nascimento</label>
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-medium outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Modalidade Principal</label>
                <input
                  type="text"
                  list="modalidades-treino-list"
                  value={modalidadePrincipal}
                  onChange={(e) => setModalidadePrincipal(e.target.value)}
                  placeholder="Ex: Musculação, Natação, Corrida..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-medium outline-none transition"
                />
                <datalist id="modalidades-treino-list">
                  <option value="Musculação" />
                  <option value="Natação" />
                  <option value="Corrida / Rua" />
                  <option value="Treinamento Funcional" />
                  <option value="Crossfit" />
                  <option value="Ciclismo" />
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Frequência Semanal</label>
                <input
                  type="text"
                  value={frequenciaSemanal}
                  onChange={(e) => setFrequenciaSemanal(e.target.value)}
                  placeholder="Ex: 3x na semana, Segunda a Sexta..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-medium outline-none transition"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('clinico')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Próximo: Clínico & Objetivos →
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: CLÍNICO & ANAMNESE CONFORME ESPECIFICAÇÃO         */}
        {/* ======================================================== */}
        {activeTab === 'clinico' && (
          <div className="p-6 sm:p-8 space-y-8 animate-in fade-in">
            {/* Medidas Físicas e IMC Automático */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-gray-50/80 rounded-2xl border border-gray-200">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Peso Atual (kg)</label>
                <input
                  type="text"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="Ex: 75.5"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Altura (cm)</label>
                <input
                  type="text"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  placeholder="Ex: 175"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">IMC Calculado</label>
                <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-black text-emerald-800 flex items-center justify-between">
                  <span>{imcValor || '--'}</span>
                  <span className="text-[10px] font-bold text-emerald-700">{imcClassificacao}</span>
                </div>
              </div>
            </div>

            {/* 1. Objetivo (múltipla escolha) + texto livre */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">
                Objetivo do Treino (Múltipla Escolha)
              </label>
              <div className="flex flex-wrap gap-2">
                {OBJETIVOS_LIST.map((obj) => {
                  const selected = objetivos.includes(obj);
                  return (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => toggleItem(objetivos, setObjetivos, obj)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        selected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}{obj}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={objetivoTexto}
                onChange={(e) => setObjetivoTexto(e.target.value)}
                placeholder="Detalhes ou metas adicionais (texto livre)..."
                className="w-full mt-2 px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-medium outline-none transition"
              />
            </div>

            {/* 2. Nível de Atividade Física (seleção única) */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">
                Nível de Atividade Física (Seleção Única)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {NIVEIS_ATIVIDADE.map((nivel) => (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => setNivelAtividade(nivel)}
                    className={`p-3 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                      nivelAtividade === nivel
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {nivel}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Patologias ou Condições de Saúde */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">
                Patologias ou Condições de Saúde
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleItem(patologias, setPatologias, 'Nenhum')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    patologias.includes('Nenhum')
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Nenhum
                </button>
                {PATOLOGIAS_LIST.map((pat) => {
                  const sel = patologias.includes(pat);
                  return (
                    <button
                      key={pat}
                      type="button"
                      onClick={() => toggleItem(patologias, setPatologias, pat)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        sel
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {sel ? '✓ ' : '+ '}{pat}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={novaPatologia}
                  onChange={(e) => setNovaPatologia(e.target.value)}
                  placeholder="Adicionar outra condição ou lesão..."
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => addItemLivre(patologias, setPatologias, novaPatologia, setNovaPatologia)}
                  className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-200 transition cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {/* 4. Restrições Alimentares */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">
                Restrições Alimentares
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleItem(restricoes, setRestricoes, 'Nenhum')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    restricoes.includes('Nenhum')
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Nenhum
                </button>
                {RESTRICOES_LIST.map((res) => {
                  const sel = restricoes.includes(res);
                  return (
                    <button
                      key={res}
                      type="button"
                      onClick={() => toggleItem(restricoes, setRestricoes, res)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        sel
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {sel ? '✓ ' : '+ '}{res}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={novaRestricao}
                  onChange={(e) => setNovaRestricao(e.target.value)}
                  placeholder="Adicionar outra restrição..."
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => addItemLivre(restricoes, setRestricoes, novaRestricao, setNovaRestricao)}
                  className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-200 transition cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {/* 5. Alergias Alimentares */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">
                Alergias Alimentares
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleItem(alergias, setAlergias, 'Nenhum')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    alergias.includes('Nenhum')
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Nenhum
                </button>
                {ALERGIAS_LIST.map((ale) => {
                  const sel = alergias.includes(ale);
                  return (
                    <button
                      key={ale}
                      type="button"
                      onClick={() => toggleItem(alergias, setAlergias, ale)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        sel
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {sel ? '✓ ' : '+ '}{ale}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={novaAlergia}
                  onChange={(e) => setNovaAlergia(e.target.value)}
                  placeholder="Adicionar outra alergia..."
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => addItemLivre(alergias, setAlergias, novaAlergia, setNovaAlergia)}
                  className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-200 transition cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {/* 6. Medicamentos e Suplementos (texto livre) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Medicamentos Contínuos (Texto Livre)</label>
                <textarea
                  rows={2}
                  value={medicamentos}
                  onChange={(e) => setMedicamentos(e.target.value)}
                  placeholder="Ex: Anti-hipertensivo pela manhã..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Suplementos em Uso (Texto Livre)</label>
                <textarea
                  rows={2}
                  value={suplementos}
                  onChange={(e) => setSuplementos(e.target.value)}
                  placeholder="Ex: Creatina 5g, Whey Protein..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('pessoal')}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ← Voltar para Identificação
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('prescricao')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Avançar para Prescrição do Treino →
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: PRESCRIÇÃO DO TREINO COM CAMPOS EDITÁVEIS         */}
        {/* ======================================================== */}
        {activeTab === 'prescricao' && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in">
            {/* Seletor de Dias da Semana */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {diasTreino.map((diaItem, idx) => (
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

            {/* Configuração do Dia Selecionado */}
            {diaAtual && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Foco / Grupo Muscular</label>
                    <input
                      type="text"
                      value={diaAtual.grupo_muscular}
                      onChange={(e) => handleDiaChange(activeDayIndex, 'grupo_muscular', e.target.value)}
                      placeholder="Ex: Peito e Tríceps / Quadríceps"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Modalidade</label>
                    <input
                      type="text"
                      value={diaAtual.tipo_treino}
                      onChange={(e) => handleDiaChange(activeDayIndex, 'tipo_treino', e.target.value)}
                      placeholder="Musculação, Natação, Corrida..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Duração (min)</label>
                    <input
                      type="number"
                      value={diaAtual.duracao_minutos || ''}
                      onChange={(e) => handleDiaChange(activeDayIndex, 'duracao_minutos', Number(e.target.value))}
                      placeholder="Ex: 50"
                      min={0}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Dica / Observação do Dia</label>
                    <input
                      type="text"
                      value={diaAtual.observacoes_do_dia}
                      onChange={(e) => handleDiaChange(activeDayIndex, 'observacoes_do_dia', e.target.value)}
                      placeholder="Aquecimento, cadência..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Lista de Exercícios com Campos de Múltipla Escolha / Editáveis */}
                <div className="space-y-4">
                  {diaAtual.exercicios.map((ex, exIdx) => (
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                        <div className="col-span-2 sm:col-span-3 lg:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Exercício</label>
                          <input
                            type="text"
                            list="lista-opcoes-exercicios"
                            value={ex.nome}
                            onChange={(e) => handleExercicioChange(activeDayIndex, exIdx, 'nome', e.target.value)}
                            placeholder="Selecione ou digite..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Séries</label>
                          <input
                            type="text"
                            list="lista-opcoes-series"
                            value={ex.series}
                            onChange={(e) => handleExercicioChange(activeDayIndex, exIdx, 'series', e.target.value)}
                            placeholder="3, 4..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Reps</label>
                          <input
                            type="text"
                            list="lista-opcoes-reps"
                            value={ex.reps}
                            onChange={(e) => handleExercicioChange(activeDayIndex, exIdx, 'reps', e.target.value)}
                            placeholder="10-12..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Distância</label>
                          <input
                            type="text"
                            list="lista-opcoes-distancia"
                            value={ex.distancia}
                            onChange={(e) => handleExercicioChange(activeDayIndex, exIdx, 'distancia', e.target.value)}
                            placeholder="100m, -"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Carga</label>
                          <input
                            type="text"
                            list="lista-opcoes-carga"
                            value={ex.carga}
                            onChange={(e) => handleExercicioChange(activeDayIndex, exIdx, 'carga', e.target.value)}
                            placeholder="20kg, Leve..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Intensidade</label>
                          <input
                            type="text"
                            list="lista-opcoes-intensidade"
                            value={ex.intensidade}
                            onChange={(e) => handleExercicioChange(activeDayIndex, exIdx, 'intensidade', e.target.value)}
                            placeholder="RPE 8..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1 space-y-1">
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Descanso</label>
                          <input
                            type="text"
                            list="lista-opcoes-descanso"
                            value={ex.descanso}
                            onChange={(e) => handleExercicioChange(activeDayIndex, exIdx, 'descanso', e.target.value)}
                            placeholder="60s..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Instruções Técnicas e Postura
                        </label>
                        <input
                          type="text"
                          value={ex.tecnica}
                          onChange={(e) => handleExercicioChange(activeDayIndex, exIdx, 'tecnica', e.target.value)}
                          placeholder="Execução controlada, respiração correta, cadência..."
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addExercicio(activeDayIndex)}
                    className="w-full py-3.5 border-2 border-dashed border-emerald-300 hover:border-emerald-500 text-emerald-700 font-bold text-xs rounded-2xl transition cursor-pointer hover:bg-emerald-50/50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Incluir Exercício em {diaAtual.dia}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé com Botão Salvar Ficha de Treino */}
        <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving || isGenerating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando Treino...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Ficha de Treino</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Datalists para Múltipla Escolha */}
      <datalist id="lista-opcoes-exercicios">
        {OPCOES_EXERCICIOS.map(op => <option key={op} value={op} />)}
      </datalist>
      <datalist id="lista-opcoes-series">
        {OPCOES_SERIES.map(op => <option key={op} value={op} />)}
      </datalist>
      <datalist id="lista-opcoes-reps">
        {OPCOES_REPS.map(op => <option key={op} value={op} />)}
      </datalist>
      <datalist id="lista-opcoes-distancia">
        {OPCOES_DISTANCIA.map(op => <option key={op} value={op} />)}
      </datalist>
      <datalist id="lista-opcoes-carga">
        {OPCOES_CARGA.map(op => <option key={op} value={op} />)}
      </datalist>
      <datalist id="lista-opcoes-intensidade">
        {OPCOES_INTENSIDADE.map(op => <option key={op} value={op} />)}
      </datalist>
      <datalist id="lista-opcoes-descanso">
        {OPCOES_DESCANSO.map(op => <option key={op} value={op} />)}
      </datalist>
    </div>
  );
};
