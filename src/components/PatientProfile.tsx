import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Loader2
} from 'lucide-react';
import { sql } from '../lib/neon';

interface PatientProfileProps {
  patientId: string;
  onBack: () => void;
}

export const PatientProfile: React.FC<PatientProfileProps> = ({ patientId, onBack }) => {
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatient() {
      try {
        setLoading(true);
        const res = await sql.query(
          `SELECT p.*,
                  (SELECT MAX(data_consulta) FROM public.consultas WHERE paciente_id = p.id) as ultima_consulta
           FROM public.pacientes p
           WHERE p.id = $1`,
          [patientId]
        );
        if (res.length > 0) {
          setPatient(res[0]);
        }
      } catch (err) {
        console.error('Erro ao buscar paciente:', err);
      } finally {
        setLoading(false);
      }
    }

    if (patientId) {
      loadPatient();
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-emerald-800">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold">Carregando ficha do paciente...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center space-y-4">
        <p className="text-gray-600 font-medium">Paciente não encontrado.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold"
        >
          Voltar para listagem
        </button>
      </div>
    );
  }

  const pesoNum = patient.peso_inicial ? parseFloat(patient.peso_inicial) : null;
  const alturaNum = patient.altura ? parseFloat(patient.altura) : null;
  let imcValor: string | null = null;
  let imcClassificacao = '';

  if (pesoNum && alturaNum) {
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

        <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
          Prontuário Ativo
        </span>
      </div>

      {/* Main Patient Card */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-emerald-600/20">
              {patient.nome.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                {patient.nome}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                {patient.sexo && <span>{patient.sexo}</span>}
                {patient.data_nascimento && (
                  <span>
                    • Nasc: {new Date(patient.data_nascimento).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {patient.whatsapp && <span>• {patient.whatsapp}</span>}
                {patient.email && <span>• {patient.email}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Informações Clínicas & IMC */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <span className="text-xs font-bold uppercase text-gray-500 block mb-1">
              Peso Inicial
            </span>
            <span className="text-2xl font-black text-emerald-950">
              {patient.peso_inicial ? `${patient.peso_inicial} kg` : '—'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100">
            <span className="text-xs font-bold uppercase text-gray-500 block mb-1">
              Altura
            </span>
            <span className="text-2xl font-black text-teal-950">
              {patient.altura ? `${patient.altura} cm` : '—'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <span className="text-xs font-bold uppercase text-gray-500 block mb-1">
              IMC Calculado
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-950">
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
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Objetivos
          </h4>
          <div className="flex flex-wrap gap-2">
            {patient.objetivos && patient.objetivos.length > 0 ? (
              patient.objetivos.map((obj: string) => (
                <span key={obj} className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold">
                  {obj}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400">Não informado</span>
            )}
          </div>
          {patient.objetivo_texto && (
            <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl mt-2">
              {patient.objetivo_texto}
            </p>
          )}
        </div>

        {/* Patologias, Restrições e Alergias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Patologias / Condições
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {patient.patologias && patient.patologias.length > 0 ? (
                patient.patologias.map((p: string) => (
                  <span key={p} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-semibold">
                    {p}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400">Nenhuma relatada</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Restrições Alimentares
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {patient.restricoes_alimentares && patient.restricoes_alimentares.length > 0 ? (
                patient.restricoes_alimentares.map((r: string) => (
                  <span key={r} className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-semibold">
                    {r}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400">Nenhuma relatada</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Alergias Alimentares
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {patient.alergias && patient.alergias.length > 0 ? (
                patient.alergias.map((a: string) => (
                  <span key={a} className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-semibold">
                    {a}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400">Nenhuma relatada</span>
              )}
            </div>
          </div>
        </div>

        {/* Hábitos e Rotina */}
        <div className="border-t border-gray-100 pt-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Hábitos e Rotina
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-gray-400 block uppercase">
                Refeições/dia
              </span>
              <span className="text-base font-bold text-gray-800">
                {patient.refeicoes_por_dia || '—'}
              </span>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-gray-400 block uppercase">
                Água/dia
              </span>
              <span className="text-base font-bold text-gray-800">
                {patient.litros_agua ? `${patient.litros_agua} L` : '—'}
              </span>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-gray-400 block uppercase">
                Acorda às
              </span>
              <span className="text-base font-bold text-gray-800">
                {patient.horario_acorda || '—'}
              </span>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-gray-400 block uppercase">
                Dorme às
              </span>
              <span className="text-base font-bold text-gray-800">
                {patient.horario_dorme || '—'}
              </span>
            </div>
          </div>

          {patient.atividade_fisica && (
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900">
              <span className="font-bold">Atividade Física: </span>
              {patient.atividade_fisica_descricao || 'Pratica atividade física regularmente.'}
            </div>
          )}

          {patient.observacoes && (
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-700">
              <span className="font-bold">Observações: </span>
              {patient.observacoes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
