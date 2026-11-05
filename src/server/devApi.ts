import type { Plugin } from 'vite';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-gerar-plano',
    configureServer(server) {
      server.middlewares.use('/api/gerar-plano', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Método não permitido. Utilize POST.' }));
          return;
        }

        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Chave GEMINI_API_KEY não configurada no .env ou no servidor.' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {};
            const { dados_do_paciente } = parsedBody;

            if (!dados_do_paciente) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Os dados do paciente são obrigatórios.' }));
              return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);

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
                console.warn(`[devApi] Tentativa com ${modelName} falhou:`, err?.message || err);
              }
            }

            if (!textResponse) {
              throw lastError || new Error('Nenhum modelo retornou resposta válida');
            }

            let jsonParsed;
            try {
              jsonParsed = JSON.parse(textResponse);
            } catch (pErr) {
              console.error('Falha no JSON.parse da resposta da IA:', textResponse, pErr);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'Erro ao interpretar a resposta da IA como JSON estruturado.',
                raw: textResponse,
              }));
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(jsonParsed));
          } catch (err: any) {
            console.error('Erro na rota /api/gerar-plano:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Não foi possível gerar o plano com IA no momento. Deseja tentar novamente ou criar um Plano Manual?',
              details: err?.message || String(err),
            }));
          }
        });
      });
    },
  };
}
