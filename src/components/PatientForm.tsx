import React, { useState } from 'react';
import { 
  ArrowLeft, 
  User, 
  HeartPulse, 
  Coffee, 
  Save, 
  Loader2, 
  Plus, 
  X, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { sql } from '../lib/neon';

interface PatientFormProps {
  userId: string;
  onCancel: () => void;
  onSaved: (patientId: string) => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({ userId, onCancel, onSaved }) => {
  const [activeTab, setActiveTab] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aba 1: Pessoal
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [dataInicioTratamento, setDataInicioTratamento] = useState(() => new Date().toISOString().split('T')[0]);
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

  // Cálculos automáticos
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
      if (h >= 0 && h <= 23) {
        return `${clean.padStart(2, '0')}:00`;
      }
    } else if (clean.length === 3) {
      const h = clean.slice(0, 1).padStart(2, '0');
      const m = clean.slice(1);
      return `${h}:${m}`;
    } else if (clean.length >= 4) {
      const h = clean.slice(0, 2);
      const m = clean.slice(2, 4);
      return `${h}:${m}`;
    }
    return val;
  };

  const formatarWhatsapp = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  // Cálculo IMC
  const pesoNum = parseFloat(peso.replace(',', '.'));
  const alturaNum = parseFloat(altura.replace(',', '.'));
  let imcValor: string | null = null;
  let imcClassificacao = '';

  if (pesoNum > 0 && alturaNum > 0) {
    const alturaMetros = alturaNum > 3 ? alturaNum / 100 : alturaNum;
    const calc = pesoNum / (alturaMetros * alturaMetros);
    imcValor = calc.toFixed(1);
    if (calc < 18.5) imcClassificacao = 'Abaixo do peso';
    else if (calc < 24.9) imcClassificacao = 'Peso adequado';
    else if (calc < 29.9) imcClassificacao = 'Sobrepeso';
    else if (calc < 34.9) imcClassificacao = 'Obesidade grau I';
    else if (calc < 39.9) imcClassificacao = 'Obesidade grau II';
    else imcClassificacao = 'Obesidade grau III';
  }

  // Toggle helpers para listas
  const toggleItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    if (item === 'Nenhum') {
      if (list.includes('Nenhum')) {
        setList([]);
      } else {
        setList(['Nenhum']);
      }
      return;
    }
    const filtered = list.filter((i) => i !== 'Nenhum');
    if (filtered.includes(item)) {
      setList(filtered.filter((i) => i !== item));
    } else {
      setList([...filtered, item]);
    }
  };

  const addItemLivre = (
    list: string[], 
    setList: (l: string[]) => void, 
    item: string, 
    setClear: (s: string) => void
  ) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const filtered = list.filter((i) => i !== 'Nenhum');
    if (!filtered.includes(trimmed)) {
      setList([...filtered, trimmed]);
    }
    setClear('');
  };

  const removeItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    setList(list.filter((i) => i !== item));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError('O nome completo do paciente é obrigatório.');
      setActiveTab('pessoal');
      return;
    }

    try {
      setLoading(true);

      const pesoFinal = pesoNum > 0 ? pesoNum : null;
      const alturaFinal = alturaNum > 0 ? alturaNum : null;
      const refeicoesFinal = refeicoesDia ? parseInt(refeicoesDia, 10) : null;
      const litrosAguaFinal = litrosAgua ? parseFloat(litrosAgua.replace(',', '.')) : null;

      const res = await sql.query(
        `INSERT INTO public.pacientes (
          nutricionista_id,
          nome,
          data_nascimento,
          sexo,
          telefone,
          whatsapp,
          email,
          peso_inicial,
          altura,
          objetivos,
          objetivo_texto,
          nivel_atividade,
          patologias,
          restricoes_alimentares,
          alergias,
          medicamentos,
          suplementos,
          refeicoes_por_dia,
          horario_acorda,
          horario_dorme,
          litros_agua,
          atividade_fisica,
          atividade_fisica_descricao,
          observacoes,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, now()
        ) RETURNING id`,
        [
          userId,
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
        ]
      );

      const newId = res[0]?.id;

      // Criar a primeira consulta automaticamente com a data de início do tratamento
      if (newId && dataInicioTratamento) {
        try {
          await sql.query(
            `INSERT INTO public.consultas (
              paciente_id,
              data_consulta,
              peso,
              observacoes,
              created_at
            ) VALUES ($1, $2, $3, $4, now())`,
            [
              newId,
              dataInicioTratamento,
              pesoFinal,
              'Primeira consulta - Início do tratamento',
            ]
          );
        } catch (consultaErr) {
          console.warn('Não foi possível registrar a consulta inicial:', consultaErr);
        }
      }

      setSuccessMessage(true);

      setTimeout(() => {
        onSaved(newId);
      }, 1200);
    } catch (err: any) {
      console.error('Erro ao salvar paciente:', err);
      setError(err?.message || 'Falha ao salvar dados do paciente no Neon.');
      setLoading(false);
    }
  };

  const idadeCalculada = calcularIdade(dataNascimento);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 px-4 py-2.5 rounded-2xl border border-gray-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para pacientes</span>
        </button>

        <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
          Novo Cadastro
        </span>
      </div>

      {/* Banner / Success alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in duration-200 shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Paciente cadastrado com sucesso!</h4>
            <p className="text-xs text-emerald-700">Redirecionando para a ficha do paciente...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 animate-in fade-in duration-200 shadow-sm">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pessoal')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'pessoal'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. Pessoal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clinico')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'clinico'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>2. Clínico</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('habitos')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'habitos'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>3. Hábitos</span>
          </button>
        </div>

        {/* Tab 1: Pessoal */}
        {activeTab === 'pessoal' && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo Silveira"
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
                  {idadeCalculada !== null && (
                    <span className="absolute right-3 top-3 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg pointer-events-none">
                      {idadeCalculada} {idadeCalculada === 1 ? 'ano' : 'anos'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Data de Início do Tratamento
                </label>
                <input
                  type="date"
                  value={dataInicioTratamento}
                  onChange={(e) => setDataInicioTratamento(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Registrada automaticamente como a 1ª consulta
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))}
                  placeholder="(11) 98765-4321"
                  maxLength={15}
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

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('clinico')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                Próximo: Dados Clínicos →
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Clínico */}
        {activeTab === 'clinico' && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
            {/* Peso, Altura e IMC */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Peso atual
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    placeholder="75.5"
                    className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-semibold outline-none transition"
                  />
                  <span className="absolute right-4 top-3 text-sm font-bold text-gray-400 pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Altura
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={altura}
                    onChange={(e) => setAltura(e.target.value)}
                    placeholder="175"
                    className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-semibold outline-none transition"
                  />
                  <span className="absolute right-4 top-3 text-sm font-bold text-gray-400 pointer-events-none">
                    cm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  IMC (Automático)
                </label>
                <div className="w-full px-4 py-3 bg-emerald-100/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="text-base font-extrabold text-emerald-950">
                    {imcValor ? `${imcValor} kg/m²` : '—'}
                  </span>
                  {imcClassificacao && (
                    <span className="text-xs font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-md">
                      {imcClassificacao}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Objetivos */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Objetivos (Múltipla escolha)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Emagrecer',
                  'Ganhar massa',
                  'Controlar diabetes',
                  'Saúde geral',
                  'Performance esportiva',
                  'Reeducação alimentar'
                ].map((obj) => (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => toggleItem(objetivos, setObjetivos, obj)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      objetivos.includes(obj)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {obj}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={objetivoTexto}
                onChange={(e) => setObjetivoTexto(e.target.value)}
                placeholder="Objetivo detalhado ou observações sobre a meta..."
                className="w-full mt-3 px-4 py-2.5 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-xs font-medium outline-none transition"
              />
            </div>

            {/* Nível de Atividade */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Nível de Atividade Física
              </label>
              <select
                value={nivelAtividade}
                onChange={(e) => setNivelAtividade(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Sedentário">Sedentário (pouco ou nenhum exercício)</option>
                <option value="Levemente ativo">Levemente ativo (exercício leve 1 a 3 dias/semana)</option>
                <option value="Moderadamente ativo">Moderadamente ativo (exercício moderado 3 a 5 dias/semana)</option>
                <option value="Muito ativo">Muito ativo (exercício pesado 6 a 7 dias/semana)</option>
                <option value="Extremamente ativo">Extremamente ativo (treino pesado diário ou 2x/dia)</option>
              </select>
            </div>

            {/* Patologias */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Patologias ou condições de saúde
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  'Nenhum',
                  'Diabetes',
                  'Hipertensão',
                  'Hipotireoidismo',
                  'Hipertireoidismo',
                  'Síndrome do ovário policístico',
                  'Doença celíaca',
                  'Colesterol alto'
                ].map((pat) => (
                  <button
                    key={pat}
                    type="button"
                    onClick={() => toggleItem(patologias, setPatologias, pat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      patologias.includes(pat)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {pat}
                  </button>
                ))}
              </div>

              {/* Tags adicionadas livres */}
              {patologias.filter(p => ![
                'Nenhum', 'Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo',
                'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'
              ].includes(p)).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {patologias
                    .filter(p => !['Nenhum', 'Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'].includes(p))
                    .map((item) => (
                      <span key={item} className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-lg">
                        {item}
                        <X className="w-3.5 h-3.5 cursor-pointer hover:text-emerald-950" onClick={() => removeItem(patologias, setPatologias, item)} />
                      </span>
                    ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaPatologia}
                  onChange={(e) => setNovaPatologia(e.target.value)}
                  placeholder="Adicionar outra patologia..."
                  className="flex-1 px-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItemLivre(patologias, setPatologias, novaPatologia, setNovaPatologia);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addItemLivre(patologias, setPatologias, novaPatologia, setNovaPatologia)}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
            </div>

            {/* Restrições Alimentares */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Restrições alimentares
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Nenhum', 'Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'].map((rest) => (
                  <button
                    key={rest}
                    type="button"
                    onClick={() => toggleItem(restricoes, setRestricoes, rest)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      restricoes.includes(rest)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {rest}
                  </button>
                ))}
              </div>

              {restricoes.filter(r => !['Nenhum', 'Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'].includes(r)).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {restricoes
                    .filter(r => !['Nenhum', 'Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'].includes(r))
                    .map((item) => (
                      <span key={item} className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-lg">
                        {item}
                        <X className="w-3.5 h-3.5 cursor-pointer hover:text-emerald-950" onClick={() => removeItem(restricoes, setRestricoes, item)} />
                      </span>
                    ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaRestricao}
                  onChange={(e) => setNovaRestricao(e.target.value)}
                  placeholder="Adicionar outra restrição..."
                  className="flex-1 px-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItemLivre(restricoes, setRestricoes, novaRestricao, setNovaRestricao);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addItemLivre(restricoes, setRestricoes, novaRestricao, setNovaRestricao)}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
            </div>

            {/* Alergias Alimentares */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Alergias alimentares
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Nenhum', 'Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'].map((al) => (
                  <button
                    key={al}
                    type="button"
                    onClick={() => toggleItem(alergias, setAlergias, al)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      alergias.includes(al)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {al}
                  </button>
                ))}
              </div>

              {alergias.filter(a => !['Nenhum', 'Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'].includes(a)).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {alergias
                    .filter(a => !['Nenhum', 'Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'].includes(a))
                    .map((item) => (
                      <span key={item} className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-lg">
                        {item}
                        <X className="w-3.5 h-3.5 cursor-pointer hover:text-emerald-950" onClick={() => removeItem(alergias, setAlergias, item)} />
                      </span>
                    ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaAlergia}
                  onChange={(e) => setNovaAlergia(e.target.value)}
                  placeholder="Adicionar outra alergia..."
                  className="flex-1 px-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItemLivre(alergias, setAlergias, novaAlergia, setNovaAlergia);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addItemLivre(alergias, setAlergias, novaAlergia, setNovaAlergia)}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
            </div>

            {/* Medicamentos e Suplementos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Medicamentos contínuos
                </label>
                <textarea
                  rows={2}
                  value={medicamentos}
                  onChange={(e) => setMedicamentos(e.target.value)}
                  placeholder="Ex: Levotiroxina 50mcg em jejum..."
                  className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-xs font-medium outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Suplementos em uso
                </label>
                <textarea
                  rows={2}
                  value={suplementos}
                  onChange={(e) => setSuplementos(e.target.value)}
                  placeholder="Ex: Creatina 5g, Vitamina D3 2000UI..."
                  className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-xs font-medium outline-none transition"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('pessoal')}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                ← Voltar para Pessoal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('habitos')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                Próximo: Hábitos →
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Hábitos */}
        {activeTab === 'habitos' && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Quantas refeições faz por dia
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={refeicoesDia}
                  onChange={(e) => setRefeicoesDia(e.target.value)}
                  placeholder="Ex: 4"
                  className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Quantidade de água por dia
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={litrosAgua}
                    onChange={(e) => setLitrosAgua(e.target.value)}
                    placeholder="2.5"
                    className="w-full pl-4 pr-16 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                  />
                  <span className="absolute right-4 top-3 text-sm font-bold text-gray-400 pointer-events-none">
                    litros
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Horário que acorda
                </label>
                <input
                  type="text"
                  value={horarioAcordaInput}
                  onChange={(e) => setHorarioAcordaInput(e.target.value)}
                  onBlur={() => setHorarioAcordaInput(formatarHora(horarioAcordaInput))}
                  placeholder="Ex: 6 (06:00) ou 630 (06:30)"
                  className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Horário que dorme
                </label>
                <input
                  type="text"
                  value={horarioDormeInput}
                  onChange={(e) => setHorarioDormeInput(e.target.value)}
                  onBlur={() => setHorarioDormeInput(formatarHora(horarioDormeInput))}
                  placeholder="Ex: 23 (23:00) ou 2230 (22:30)"
                  className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                />
              </div>
            </div>

            {/* Pratica Atividade Física */}
            <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 space-y-4">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Pratica atividade física?
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPraticaAtividade(true)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    praticaAtividade === true
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setPraticaAtividade(false)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    praticaAtividade === false
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Não
                </button>
              </div>

              {praticaAtividade === true && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Qual atividade e frequência semanal?
                  </label>
                  <input
                    type="text"
                    value={atividadeDescricao}
                    onChange={(e) => setAtividadeDescricao(e.target.value)}
                    placeholder="Ex: Musculação 4x na semana + corrida no fim de semana"
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-sm font-medium outline-none transition"
                  />
                </div>
              )}
            </div>

            {/* Observações Gerais */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Observações gerais
              </label>
              <textarea
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Preferências, rotina de trabalho, viagens frequentes ou particularidades..."
                className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 text-xs font-medium outline-none transition"
              />
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('clinico')}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                ← Voltar para Clínico
              </button>
            </div>
          </div>
        )}

        {/* Form Footer with Save */}
        <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-semibold transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Salvando paciente...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Paciente</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
