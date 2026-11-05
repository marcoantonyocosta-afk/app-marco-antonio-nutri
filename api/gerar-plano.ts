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

    // Schema rígido para garantir que o Gemini retorne exatamente o formato esperado
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        plano_semanal: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              dia: { type: SchemaType.STRING },
              refeicoes: {
                type: SchemaType.OBJECT,
                properties: {
                  cafe_da_manha: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  lanche_manha: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  almoco: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  lanche_tarde: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  jantar: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                },
                required: ['cafe_da_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'],
              },
            },
            required: ['dia', 'refeicoes'],
          },
        },
      },
      required: ['plano_semanal'],
    };

    const promptText = `Você é um nutricionista clínico profissional especialista na culinária e rotina brasileira.
Gere um plano alimentar semanal completo, saudável e diversificado com base nos dados do paciente fornecidos abaixo.

Dados do Paciente (Metas, Alergias, Restrições e Histórico):
${typeof dados_do_paciente === 'string' ? dados_do_paciente : JSON.stringify(dados_do_paciente, null, 2)}

# Regras Críticas de Execução:
- Você deve responder APENAS e estritamente o objeto JSON solicitado.
- Não inclua blocos de código markdown (como \`\`\`json ... \`\`\`), explicações, introduções ou textos complementares.
- Adapte o cardápio rigorosamente a quaisquer alergias ou restrições descritas nos dados.
- Utilize alimentos comuns, acessíveis e culturalmente aceitos no Brasil.
- Evite repetições monótonas de alimentos nos dias seguidos.

O formato do JSON retornado deve seguir exatamente esta estrutura:
{
  "plano_semanal": [
    {
      "dia": "Segunda-feira",
      "refeicoes": {
        "cafe_da_manha": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "lanche_manha": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "almoco": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "lanche_tarde": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "jantar": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"]
      }
    }
  ]
}`;

    // Tentativa com gemini-3.8-flash priorizado, com fallback para gemini-3.1-flash-lite / gemini-3.5-flash / gemini-flash-latest caso haja sobrecarga momentânea (503)
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
    console.error('Erro ao gerar plano alimentar com IA:', err);
    return res.status(500).json({
      error: 'Não foi possível gerar o plano com IA no momento. Deseja tentar novamente ou criar um Plano Manual?',
      details: err?.message || String(err),
    });
  }
}
