import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import type { PlanoSemanalData } from '../components/PlanosAlimentares';

export interface PatientExportInfo {
  nome?: string;
  dataNascimento?: string;
  idade?: string | number;
  sexo?: string;
  peso?: string | number;
  altura?: string | number;
  whatsapp?: string;
  email?: string;
  objetivos?: string[];
  objetivoTexto?: string;
  nivelAtividade?: string;
  patologias?: string[];
  restricoes?: string[];
  alergias?: string[];
  medicamentos?: string;
  suplementos?: string;
  refeicoesDia?: string;
  horarioAcorda?: string;
  horarioDorme?: string;
  litrosAgua?: string;
  atividadeFisica?: string;
  observacoes?: string;
}

const REFEICOES_MAP: { key: string; label: string }[] = [
  { key: 'cafe_da_manha', label: 'Café da Manhã' },
  { key: 'lanche_manha', label: 'Lanche da Manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche_tarde', label: 'Lanche da Tarde' },
  { key: 'jantar', label: 'Jantar' },
];

/**
 * Exporta o Plano Alimentar para PDF com formatação profissional
 */
export async function exportarPlanoPDF(planoData: PlanoSemanalData, paciente: PatientExportInfo) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pacienteNome = paciente.nome || 'Paciente';
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  // Cabeçalho institucional
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PLANO ALIMENTAR PERSONALIZADO', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`NutriFit • Nutrição Clínica & Funcional | Emitido em: ${dataHoje}`, 14, 20);

  // Informações do Paciente
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Paciente: ${pacienteNome}`, 14, 37);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const metas = paciente.objetivos && paciente.objetivos.length > 0 ? paciente.objetivos.join(', ') : 'Saúde & Equilíbrio Nutricional';
  const dadosAdicionais = [
    paciente.peso ? `Peso: ${paciente.peso} kg` : '',
    paciente.altura ? `Altura: ${paciente.altura} cm` : '',
    paciente.sexo ? `Sexo: ${paciente.sexo}` : '',
  ].filter(Boolean).join(' | ');

  doc.text(dadosAdicionais, 14, 43);
  doc.text(`Objetivo Principal: ${metas}`, 14, 49);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 53, 196, 53);

  let currentY = 58;

  // Itera pelos dias da semana
  for (const diaItem of planoData.plano_semanal) {
    if (currentY > 245) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105); // Emerald 600
    doc.text(`• ${diaItem.dia.toUpperCase()}`, 14, currentY);
    currentY += 4;

    const tableRows = REFEICOES_MAP.map(({ key, label }) => {
      const opcoes = (diaItem.refeicoes as any)?.[key] || [];
      const opcoesFiltradas = opcoes
        .filter((o: string) => Boolean(o && o.trim()))
        .map((op: string, idx: number) => `Opção ${idx + 1}: ${op}`)
        .join('\n\n');

      return [label, opcoesFiltradas || 'Conforme orientação em consulta'];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Refeição', 'Opções e Substituições Sugeridas']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129], // Emerald 500
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59],
        cellPadding: 3,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 42, fontStyle: 'bold', textColor: [6, 78, 59] },
        1: { cellWidth: 140 },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 9;
  }

  // Rodapé das páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount} — NutriFit Gestão Nutricional`, 14, 290);
  }

  const cleanName = pacienteNome.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Plano_Alimentar_${cleanName}.pdf`);
}

/**
 * Exporta o Cadastro Completo do Paciente junto com o Plano Alimentar em PDF
 */
export async function exportarCadastroEPlanoPDF(planoData: PlanoSemanalData, paciente: PatientExportInfo) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pacienteNome = paciente.nome || 'Paciente';
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  // Cabeçalho institucional
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PRONTUÁRIO & PLANO ALIMENTAR', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`NutriFit • Nutrição Clínica & Funcional | Emitido em: ${dataHoje}`, 14, 20);

  let currentY = 36;

  // 1. TÍTULO: CADASTRO DO PACIENTE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 78, 59);
  doc.text('DADOS CADASTRAIS & AVALIAÇÃO NUTRICIONAL', 14, currentY);
  currentY += 4;

  const dadosPessoaisClinicos = [
    ['Nome Completo', pacienteNome, 'Sexo', paciente.sexo || 'Não informado'],
    [
      'Data de Nasc. / Idade',
      paciente.dataNascimento
        ? `${new Date(paciente.dataNascimento).toLocaleDateString('pt-BR')} ${paciente.idade ? `(${paciente.idade} anos)` : ''}`
        : (paciente.idade ? `${paciente.idade} anos` : 'Não informada'),
      'Contato / WhatsApp',
      paciente.whatsapp || 'Não informado'
    ],
    ['E-mail', paciente.email || 'Não informado', 'Peso / Altura', `${paciente.peso ? `${paciente.peso} kg` : '-'} / ${paciente.altura ? `${paciente.altura} cm` : '-'}`],
    ['Nível de Atividade', paciente.nivelAtividade || 'Não informado', 'Água Diária', paciente.litrosAgua ? `${paciente.litrosAgua} L/dia` : 'Não informado'],
    ['Horários', `Acorda: ${paciente.horarioAcorda || '-'} | Dorme: ${paciente.horarioDorme || '-'}`, 'Refeições/dia', paciente.refeicoesDia || 'Não informado'],
    [
      'Objetivos Nutricionais',
      paciente.objetivos && paciente.objetivos.length > 0 ? paciente.objetivos.join(', ') : (paciente.objetivoTexto || 'Saúde e equilíbrio'),
      'Atividade Física',
      paciente.atividadeFisica || 'Não informada'
    ],
    [
      'Patologias / Condições',
      paciente.patologias && paciente.patologias.length > 0 ? paciente.patologias.join(', ') : 'Nenhuma relatada',
      'Restrições / Intolerâncias',
      paciente.restricoes && paciente.restricoes.length > 0 ? paciente.restricoes.join(', ') : 'Nenhuma relatada'
    ],
    [
      'Alergias Alimentares',
      paciente.alergias && paciente.alergias.length > 0 ? paciente.alergias.join(', ') : 'Nenhuma relatada',
      'Medicamentos em uso',
      paciente.medicamentos || 'Nenhum'
    ],
    [
      'Suplementos em uso',
      paciente.suplementos || 'Nenhum',
      'Observações Clínicas',
      paciente.observacoes || 'Sem observações adicionais'
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    body: dadosPessoaisClinicos,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold', textColor: [6, 78, 59], fillColor: [240, 253, 244] },
      1: { cellWidth: 54 },
      2: { cellWidth: 38, fontStyle: 'bold', textColor: [6, 78, 59], fillColor: [240, 253, 244] },
      3: { cellWidth: 52 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 2. SEÇÃO PLANO ALIMENTAR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 78, 59);
  doc.text('PLANO ALIMENTAR SEMANAL', 14, currentY);
  currentY += 4;

  for (const diaItem of planoData.plano_semanal) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`• ${diaItem.dia.toUpperCase()}`, 14, currentY);
    currentY += 4;

    const tableRows = REFEICOES_MAP.map(({ key, label }) => {
      const opcoes = (diaItem.refeicoes as any)?.[key] || [];
      const opcoesFiltradas = opcoes
        .filter((o: string) => Boolean(o && o.trim()))
        .map((op: string, idx: number) => `Opção ${idx + 1}: ${op}`)
        .join('\n\n');

      return [label, opcoesFiltradas || 'Conforme orientação em consulta'];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Refeição', 'Opções e Substituições Sugeridas']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        cellPadding: 2.8,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 38, fontStyle: 'bold', textColor: [6, 78, 59] },
        1: { cellWidth: 144 }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Rodapé das páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount} — NutriFit Gestão Nutricional`, 14, 290);
  }

  // Abre o PDF em nova aba para visualização e impressão nativa do navegador
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Exporta o Plano Alimentar para Word (.DOCX)
 */
export async function exportarPlanoDOCX(planoData: PlanoSemanalData, paciente: PatientExportInfo) {
  const pacienteNome = paciente.nome || 'Paciente';
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const children: any[] = [
    new Paragraph({
      text: 'PLANO ALIMENTAR PERSONALIZADO',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `NutriFit • Nutrição Clínica & Funcional | Emitido em: ${dataHoje}`,
          italics: true,
          size: 20,
          color: '4B5563',
        }),
      ],
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Paciente: `, bold: true, size: 24 }),
        new TextRun({ text: pacienteNome, size: 24 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Objetivos: ${paciente.objetivos?.join(', ') || 'Equilíbrio nutricional e saúde'}`,
          italics: true,
          size: 20,
          color: '374151',
        }),
      ],
      spacing: { after: 360 },
    }),
  ];

  for (const diaItem of planoData.plano_semanal) {
    children.push(
      new Paragraph({
        text: diaItem.dia,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );

    const rows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: '059669' },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Refeição', bold: true, color: 'FFFFFF' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            shading: { fill: '059669' },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Opções e Alternativas', bold: true, color: 'FFFFFF' })],
              }),
            ],
          }),
        ],
      }),
    ];

    for (const ref of REFEICOES_MAP) {
      const opcoes = (diaItem.refeicoes as any)?.[ref.key] || [];
      const opcoesFiltradas = opcoes.filter((o: string) => Boolean(o && o.trim()));

      const paragraphs = opcoesFiltradas.length > 0
        ? opcoesFiltradas.map(
            (op: string, idx: number) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `Opção ${idx + 1}: `, bold: true }),
                  new TextRun({ text: op }),
                ],
                spacing: { after: 60 },
              })
          )
        : [new Paragraph({ text: 'Conforme orientação' })];

      rows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: { fill: 'F3F4F6' },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ref.label, bold: true, color: '065F46' })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: paragraphs,
            }),
          ],
        })
      );
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const cleanName = pacienteNome.replace(/[^a-zA-Z0-9]/g, '_');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Plano_Alimentar_${cleanName}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

