import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada no servidor.' });
  }

  try {
    const { dados_do_paciente } = req.body || {};

    if (!dados_do_paciente) {
      return res.status(400).json({ error: 'Os dados do paciente são obrigatórios.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Schema com os campos solicitados: exercício, séries, reps, distância, carga, intensidade, descanso e técnica
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        plano_treino_semanal: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              dia: { type: SchemaType.STRING },
              grupo_muscular: { type: SchemaType.STRING },
              tipo_treino: { type: SchemaType.STRING },
              duracao_minutos: { type: SchemaType.NUMBER },
              exercicios: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    nome: { type: SchemaType.STRING },
                    series: { type: SchemaType.STRING },
                    reps: { type: SchemaType.STRING },
                    distancia: { type: SchemaType.STRING },
                    carga: { type: SchemaType.STRING },
                    intensidade: { type: SchemaType.STRING },
                    descanso: { type: SchemaType.STRING },
                    tecnica: { type: SchemaType.STRING },
                  },
                  required: ['nome', 'series', 'reps', 'distancia', 'carga', 'intensidade', 'descanso', 'tecnica'],
                },
              },
              observacoes_do_dia: { type: SchemaType.STRING },
            },
            required: ['dia', 'grupo_muscular', 'tipo_treino', 'duracao_minutos', 'exercicios', 'observacoes_do_dia'],
          },
        },
      },
      required: ['plano_treino_semanal'],
    };

    const promptText = `Você é um educador físico e especialista em treinamento esportivo e personalizado com vasta experiência no contexto brasileiro (musculação, corrida, natação, funcional, crossfit, etc.).
Gere um plano de treino semanal completo, progressivo e adequado com base nos dados do paciente fornecidos abaixo.

Dados do Paciente (Nível de Atividade, Objetivos, Patologias e Dados Físicos):
${typeof dados_do_paciente === 'string' ? dados_do_paciente : JSON.stringify(dados_do_paciente, null, 2)}

# Regras OBRIGATÓRIAS e Críticas de Execução:
1. DIAS DA SEMANA: Cubra obrigatoriamente todos os 7 dias: Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira, Sábado, Domingo.
2. MODALIDADES VARIADAS: Adapte o tipo de treino conforme o objetivo e preferência do paciente (Musculação, Natação, Corrida, Funcional, Ciclismo, etc.).
3. CAMPOS ESPECÍFICOS DE CADA EXERCÍCIO:
   - nome: Nome claro do exercício (ex: "Supino Reto com Barra", "Tiro de 100m Crawl", "Agachamento Livre", "Corrida Contínua").
   - series: Quantidade de séries (ex: "4", "3", "5", ou "1" para contínuo).
   - reps: Número de repetições (ex: "10-12", "15", "Até a falha", ou "-" se for corrida/natação por tempo/distância).
   - distancia: Distância ou tempo quando aplicável (ex: "100m", "5km", "400m", "500m", ou "-" para musculação padrão).
   - carga: Carga sugerida em kg ou percentual (ex: "70% 1RM", "20kg", "Peso Corporal", "Leve", "Moderada", ou "-").
   - intensidade: Nível de esforço (ex: "RPE 7-8", "Moderada", "Alta (85% FCMax)", "Z2 Aeróbica", "Leve").
   - descanso: Intervalo de descanso entre séries ou tiros (ex: "60s", "90s", "30s", "2min", "45s").
   - tecnica: Instrução técnica clara, postura e respiração para executar com segurança.
4. DIAS DE DESCANSO: No dia de repouso ou descanso ativo, retorne grupo_muscular: "Descanso" ou "Recuperação Ativa", tipo_treino: "Repouso" ou "Alongamento/Caminhada", duracao_minutos: 0 ou 30, e exercicios como array vazio [] ou contendo apenas alongamentos leves.
5. ADAPTAÇÃO: Respeite rigorosamente quaisquer dores, lesões, restrições articulares ou patologias informadas.
6. Responda APENAS o JSON puro correspondente ao schema. Sem markdown ou texto introdutório.

Exemplo de estrutura:
{
  "plano_treino_semanal": [
    {
      "dia": "Segunda-feira",
      "grupo_muscular": "Peito, Ombros e Tríceps",
      "tipo_treino": "Musculação",
      "duracao_minutos": 60,
      "exercicios": [
        {
          "nome": "Supino Reto com Barra",
          "series": "4",
          "reps": "10-12",
          "distancia": "-",
          "carga": "70% 1RM",
          "intensidade": "Moderada / RPE 8",
          "descanso": "90s",
          "tecnica": "Desça de forma controlada até a linha do peito, escápulas retraídas"
        }
      ],
      "observacoes_do_dia": "Mantenha boa hidratação e faça aquecimento articular prévio."
    }
  ]
}`;

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest'
    ];
    let lastError: any = null;
    let textResponse = '';

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema as any,
            temperature: 0.7,
          },
        });

        const result = await model.generateContent(promptText);
        textResponse = result.response.text();
        if (textResponse) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa com ${modelName} falhou:`, err?.message || err);
      }
    }

    if (!textResponse) {
      throw lastError || new Error('Nenhum modelo retornou resposta válida');
    }

    let jsonParsed;
    try {
      jsonParsed = JSON.parse(textResponse);
    } catch (parseError) {
      console.error('Falha no JSON.parse da resposta da IA:', textResponse, parseError);
      return res.status(500).json({
        error: 'Erro ao interpretar a resposta da IA como JSON estruturado.',
        raw: textResponse,
      });
    }

    return res.status(200).json(jsonParsed);
  } catch (err: any) {
    console.error('Erro ao gerar sugestão de treino com IA:', err);
    return res.status(500).json({
      error: 'Não foi possível gerar a sugestão de treino com IA no momento. Tente novamente ou crie um Plano Manual.',
      details: err?.message || String(err),
    });
  }
}
