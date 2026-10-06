/* =========================================================================
   Relatórios e Exportação · cópia de segurança (JSON) · Guia de Uso.
   ========================================================================= */

function copiaDeSeguranca() {
  const colecoes = {};
  for (const col of COLECOES) {
    if (col === 'parametros') { colecoes.parametros = S.parametrosDoc ? [{ id: 'geral', dados: docSimplesParaBanco(S.parametrosDoc) }] : []; continue; }
    colecoes[col] = [...S[col].values()].map(d => ({ id: d.id, dados: col === 'lancamentos' ? docLancamentoParaBanco(d) : docSimplesParaBanco(d) }));
  }
  return { sistema: SISTEMA, versao: VERSAO_DADOS, geradoEm: agoraISO(), colecoes };
}
async function baixarCopia() {
  if (!podeEditar()) { toast('A cópia de segurança é exclusiva de quem edita o painel.', 'erro'); return; }
  const c = copiaDeSeguranca();
  const total = Object.values(c.colecoes).reduce((s, l) => s + l.length, 0);
  await salvarArquivo(nomeArquivo(`Copia_Seguranca_Mapa_CD_Simao_${hojeISO()}`, 'json'), JSON.stringify(c, null, 1), 'application/json');
  toast(`${total} documentos na cópia de segurança.`);
}
async function restaurarCopia(arquivo) {
  if (!podeEditar()) return;
  let dados;
  try { dados = JSON.parse(decodificarTexto(await arquivo.arrayBuffer())); } catch (e) { toast('Arquivo inválido: não é um JSON.', 'erro'); return; }
  if (!dados || dados.sistema !== SISTEMA || !dados.colecoes || typeof dados.colecoes !== 'object') { toast('Este arquivo não é uma cópia de segurança do Mapa de Produtividade.', 'erro', 7000); return; }
  const cols = COLECOES.filter(c => Array.isArray(dados.colecoes[c]));
  const resumo = cols.map(c => {
    const atuais = c === 'parametros' ? (S.parametrosDoc ? ['geral'] : []) : [...S[c].keys()];
    const doArq = dados.colecoes[c].map(d => d.id);
    const sai = atuais.filter(id => !doArq.includes(id));
    return { c, arquivo: doArq.length, atuais: atuais.length, sai: sai.length, saiIds: sai };
  });
  abrirModal({
    titulo: 'Restaurar cópia de segurança', largo: true,
    corpo: `<p>Cópia gerada em <b>${esc(fDataHora(dados.geradoEm))}</b>.</p>
      <div class="tabela-wrap"><table class="tbl"><thead><tr><th>Coleção</th><th class="n">No arquivo</th><th class="n">No painel hoje</th><th class="n">Só no painel</th></tr></thead><tbody>${resumo.map(r => `<tr><td>${esc(r.c)}</td><td class="n">${fInt(r.arquivo)}</td><td class="n">${fInt(r.atuais)}</td><td class="n">${fInt(r.sai)}</td></tr>`).join('')}</tbody></table></div>
      <div class="pilha">
        <label class="check"><input type="radio" name="modo-rest" value="substituir" checked> <span><b>Substituir tudo</b>: o painel fica igual à cópia (os documentos "só no painel" são excluídos).</span></label>
        <label class="check"><input type="radio" name="modo-rest" value="mesclar"> <span><b>Mesclar</b>: grava os documentos da cópia e mantém os que só existem no painel.</span></label>
      </div>
      ${campo({ id: 'rest-conf', rotulo: 'Para confirmar, digite RESTAURAR', valor: '', attrsExtra: { autocomplete: 'off' } })}
      <div class="progresso" hidden id="rest-prog"><i></i></div>`,
    botoes: [{ rotulo: 'Cancelar', classe: 'fantasma' }, { rotulo: 'Restaurar', classe: 'perigo cheio', acao: async ctrl => {
      if (lerCampo(ctrl.el, 'rest-conf').trim().toUpperCase() !== 'RESTAURAR') { marcarErro(ctrl.el, 'rest-conf', 'Digite RESTAURAR para confirmar.'); return false; }
      const modo = $('input[name="modo-rest"]:checked', ctrl.el).value;
      const ops = [];
      for (const r of resumo) {
        for (const d of dados.colecoes[r.c]) if (d && d.id && d.dados && typeof d.dados === 'object') ops.push(opGravar(r.c, d.id, d.dados));
        if (modo === 'substituir') for (const id of r.saiIds) if (r.c !== 'historico') ops.push(opExcluir(r.c, id));
      }
      ctrl.ocupado(true);
      const prog = $('#rest-prog', ctrl.el); prog.hidden = false;
      try {
        await executarOperacoes([...ops, opHistorico({ tipo: 'restauracao', colecao: null, resumo: `Cópia de segurança restaurada (${modo}): ${ops.length} gravações, cópia de ${fDataHora(dados.geradoEm)}` })], (f, t) => { $('i', prog).style.width = Math.round(f / t * 100) + '%'; });
        toast('Cópia de segurança restaurada.', 'ok');
        ctrl.ocupado(false);
        return true;
      } catch (e) { ctrl.ocupado(false); toast(e.message, 'erro', 9000); return false; }
    } }]
  });
}

VIEWS.relatorios = () => {
  const meses = mesesComDados().slice().reverse();
  const ed = podeEditar();
  const optMeses = meses.map(y => ({ valor: y, rotulo: rotuloYM(y) }));
  const optColab = todosCodigos().filter(c => lancamentosDoColab(c).length).map(c => ({ valor: c, rotulo: `${nomeExib(c)} (${c})` }));
  const baixa = podeBaixar();
  const semBaixa = '<p class="muted">Indisponível neste visualizador: ele não permite salvar arquivos.</p>';
  const html = `${cabecalhoTela('Relatórios e Exportação', 'Arquivos para o CEO, a gerência e as conversas de retorno. Os botões "Exportar PDF" e "Exportar Excel" no topo exportam a tela que estiver aberta.')}
    ${baixa ? '' : avisoHTML('atencao', 'Este visualizador não permite salvar arquivos, então os relatórios, o Excel e a cópia de segurança não podem ser gerados aqui. Abra o Mapa de Produtividade pelo claude.ai num navegador de computador ou no aplicativo e tente de novo.')}
    <div class="grade-2">
      ${bloco({ titulo: 'Relatório Executivo Mensal (PDF)', desc: 'Capa com logo, resumo do mês em 5 frases, cartões principais, ranking completo das três funções, destaques e menores índices, alertas, multifunção, fluxo e capacidade, quebra de série quando houver e glossário com os limites dos dados. A4 retrato.',
        corpo: !baixa ? semBaixa : meses.length ? `<div class="form">${campo({ id: 'rel-mes', rotulo: 'Mês', valor: UI.ym, opcoes: optMeses })}</div><div class="linha" style="margin-top:12px">${botao('Gerar Relatório Executivo', 'rel-executivo', null, { classe: 'primario', ic: 'pdf' })}</div>` : '<p class="muted">Importe um mês para gerar o relatório.</p>' })}
      ${bloco({ titulo: 'Excel completo', desc: 'Abas: Resumo, Ranking Mensal (3 funções), Ranking Acumulado (3 funções), Evolução de Posições, Multifunção, Fluxo e Capacidade, Alertas, Plano de Ação, Lançamentos (base completa) e Parâmetros. Cabeçalhos formatados e números no formato brasileiro.',
        corpo: !baixa ? semBaixa : meses.length ? `<div class="form">${campo({ id: 'xls-mes', rotulo: 'Mês de referência', valor: UI.ym, opcoes: optMeses })}</div><div class="linha" style="margin-top:12px">${botao('Gerar Excel completo', 'rel-excel', null, { classe: 'primario', ic: 'excel' })}</div>` : '<p class="muted">Importe um mês para gerar o Excel.</p>' })}
      ${bloco({ titulo: 'Ficha individual (PDF)', desc: 'Indicadores do mês e do acumulado, evolução contra a meta, colocação, multifunção, planos de ação e espaço para a conversa de retorno com o colaborador.',
        corpo: !baixa ? semBaixa : optColab.length ? `<div class="form">${campo({ id: 'fic-colab', rotulo: 'Colaborador', valor: optColab[0].valor, opcoes: optColab })}</div><div class="linha" style="margin-top:12px">${botao('Gerar ficha em PDF', 'rel-ficha', null, { classe: 'primario', ic: 'pdf' })}</div>` : '<p class="muted">Sem colaboradores com lançamento.</p>' })}
      ${bloco({ titulo: 'Cópia de segurança', desc: 'Todos os dados do painel (colaboradores, lançamentos, meses, parâmetros, metas, importações, plano de ação e histórico) em um arquivo JSON. Restaurar regrava o banco a partir do arquivo.',
        corpo: ed ? `<div class="linha">${baixa ? botao('Baixar cópia de segurança (JSON)', 'copia-baixar', null, { ic: 'baixar' }) : ''}${botao('Restaurar a partir do JSON', 'copia-restaurar', null, { classe: 'perigo', ic: 'restaurar' })}<input type="file" id="arquivo-copia" accept=".json,application/json" hidden></div>` : '<p class="muted">Exclusivo de quem edita o painel.</p>' })}
    </div>`;
  return { html };
};
Object.assign(ACOES, {
  'rel-executivo': () => { const y = Number(lerCampo(document, 'rel-mes')); exportarRelatorioExecutivo(Number.isFinite(y) ? y : UI.ym); },
  'rel-excel': () => { const y = Number(lerCampo(document, 'xls-mes')); exportarExcelCompleto(Number.isFinite(y) ? y : UI.ym); },
  'rel-ficha': () => { const c = lerCampo(document, 'fic-colab'); if (c) exportarFichaPDF(c); },
  'copia-baixar': () => baixarCopia(),
  'copia-restaurar': () => { const inp = document.getElementById('arquivo-copia'); if (!inp) return; inp.onchange = () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) restaurarCopia(f); }; inp.click(); }
});

/* ---------- Guia de Uso ---------- */
VIEWS.guia = () => {
  const p = P();
  const ym = UI.ym;
  let ex = null;
  if (ym != null) {
    const rk = ranking(ym, ym, 'separacao', 'todos');
    ex = rk.eleg[0] || null;
  }
  const exTxt = ex ? `Exemplo (${rotuloYM(ym).toLowerCase()}): ${ex.nome}, separação, ${fInt(ex.ag.skus)} itens em ${ex.ag.dias} dias = ${fD1(ex.ind.itensDia)} itens/dia; ${fInt(ex.ag.unidades)} unidades ÷ ${ex.ag.dias} = ${fInt(ex.ind.unidDia)} unidades/dia; meta de ${fD1(ex.ind.metaItens)} itens/dia e ${fInt(ex.ind.metaUnid)} unidades/dia → ${fPct(ex.ind.pctItens)} e ${fPct(ex.ind.pctUnid)} → índice ${fPct(ex.ind.pctItens)} × ${fNum(p.pesoItens * 100, 'int')}% + ${fPct(ex.ind.pctUnid)} × ${fNum(p.pesoQuantidade * 100, 'int')}% = ${fPct(ex.ind.indice)}.` : '';
  const termos = [
    ['Documentos', 'pedidos + NF', 'Pedidos (OM) na separação e na conferência de expedição; notas fiscais no recebimento.'],
    ['Itens/dia (SKU/dia)', 'itens ÷ dias na função', 'Complexidade: quantas referências diferentes foram tocadas por dia.'],
    ['Unidades/dia', 'unidades ÷ dias na função', 'Volume físico movimentado por dia.'],
    ['Documentos/dia', 'documentos ÷ dias na função', 'Ritmo de pedidos ou notas.'],
    ['Itens por documento', 'itens ÷ documentos', 'Tamanho médio do pedido ou da nota.'],
    ['Unidades por item', 'unidades ÷ itens', 'Perfil do trabalho: alto = carga fechada; baixo = picking fracionado.'],
    ['% da meta de itens', 'itens/dia ÷ meta de itens/dia da função', 'Usa a meta vigente no mês. No acumulado: soma dos itens ÷ soma de (dias × meta de cada mês).'],
    ['% da meta de quantidade', 'unidades/dia ÷ meta de unidades/dia da função', 'Mesma regra do % da meta de itens.'],
    ['Índice de Eficiência', `% meta itens × ${fNum(p.pesoItens * 100, 'int')}% + % meta quantidade × ${fNum(p.pesoQuantidade * 100, 'int')}%`, `Só é calculado com ${p.minimoDias} dias ou mais na função. É o critério do ranking; desempate pelo total de itens. ${exTxt}`],
    ['Situação', `≥ 100% acima · ≥ ${fPct(p.tolerancia)} na meta · abaixo disso abaixo da meta`, `Com menos de ${p.minimoDias} dias: "dias insuficientes" (aparece em cinza, fora do ranking).`],
    ['Visão acumulada', 'somar itens, unidades, documentos e dias do período e só depois dividir', 'Nunca é média de percentuais mensais. O mínimo de dias vale para o total do período.'],
    ['Leitura do ranking', 'Função principal × Todos os lançamentos', 'Função principal (padrão): só quem tem a função como principal no cadastro; quem atua como apoio aparece separado. Todos os lançamentos: todos juntos, com o selo "apoio".'],
    ['Presença e dias-função', 'presença = dias distintos no CD; dias-função = soma dos dias de cada função', 'Fatiamento = dias-função ÷ presença (acima de 1: dia dividido). Alocação = dias-função ÷ dias de operação do mês.'],
    ['Dias de operação', 'dias distintos com movimento em todas as linhas do mês', 'Calculado na importação; pode ser ajustado em Parâmetros e Metas.'],
    ['Cobertura da conferência', 'itens conferidos ÷ itens separados (e pedidos conferidos ÷ separados)', 'Perto de 100%: tudo o que foi separado passou pela conferência.'],
    ['Relação de mão de obra', 'dias-função de separação ÷ dias-função de conferência de expedição', 'Quantos dias de separação para cada dia de conferência.'],
    ['Saldo de fluxo', 'unidades recebidas − unidades separadas', 'Positivo: entrou mais do que saiu.'],
    ['Pessoas-equivalentes', 'dias-função ÷ dias de operação', 'Quantas pessoas a função ocupou, em média, por dia de operação.'],
    ['Produtividade da equipe', 'itens da função ÷ dias-função da função', 'O itens/dia de todos juntos.'],
    ['Concentração', 'maior participação individual nos itens da função', `Alerta acima de ${fPct(p.limiteConcentracao)}: risco de dependência de uma pessoa.`],
    ['Capacidade potencial', 'para cada elegível abaixo de 100%: dias × (1 − índice)', 'Soma = dias-função liberáveis; ÷ dias de operação = pessoas-equivalentes liberáveis. Não considera qualidade nem função de apoio.'],
    ['Meta (P75)', '3º quartil do desempenho da equipe', 'As metas atuais são o P75 de jan–jul/2026, só com registros de 10+ dias na função: o patamar que os 25% melhores da própria casa já entregam.']
  ];
  const telas = [
    ['Painel Geral', 'Cartões do período com variação contra o mês anterior (clique para detalhar), leitura gerencial automática, pódio, evolução, itens/dia contra a meta, situação por função e mapa de calor colaborador × mês.'],
    ['Recebimento, Separação, Conferência de Expedição', 'Mesma estrutura por função: cartões, ranking com movimento de posição, barras de itens/dia com a meta, perfil de trabalho, concentração e evolução da equipe. No Recebimento, leia o volume recebido antes de comparar pessoas.'],
    ['Rankings', 'Mensal, acumulado, evolução de posições e campeões. O ranking nunca mistura funções.'],
    ['Ficha do Colaborador', 'Tudo de uma pessoa: cartões, evolução contra a meta, colocação, calendário dos dias trabalhados, multifunção, avisos e planos de ação. Exporta a ficha em PDF para a conversa de retorno.'],
    ['Multifunção e Alocação', 'Leia antes de cobrar produtividade individual: mostra quem dividiu o dia entre funções.'],
    ['Fluxo e Capacidade', 'Recebido × separado, cobertura da conferência, relação de mão de obra e capacidade potencial.'],
    ['Alertas e Plano de Ação', 'Alertas automáticos do mês com o botão "Criar ação"; quadro do plano por situação.'],
    ['Lançamentos, Importar, Colaboradores, Parâmetros e Metas, Auditoria', 'O grupo DADOS: base completa, importação mensal, cadastro (ativo ou desligado), metas com vigência, meses e a conferência de que tudo amarra.']
  ];
  const html = `${cabecalhoTela('Guia de Uso', 'Rotina mensal, glossário com fórmulas e limites dos dados.')}
    ${bloco({ titulo: 'Rotina dos próximos meses (5 minutos)', corpo: `<div class="texto"><ol>
      <li>Pedir ao suporte Kaizen a extração de produtividade do mês fechado (mesmo layout).</li>
      <li>Abrir o sistema → <b>Importar Extração</b> → soltar o arquivo → conferir a pré-visualização → confirmar.</li>
      <li>Revisar os colaboradores novos e a função principal deles em <b>Colaboradores</b> (e marcar quem foi desligado).</li>
      <li>Conferir dias de operação e escopo da coleta do mês em <b>Parâmetros e Metas › Meses</b>.</li>
      <li>Abrir <b>Auditoria</b>: diferença zero.</li>
      <li>Fechar o mês, gerar o <b>Relatório Executivo em PDF</b> e enviar ao CEO e ao gerente do CD.</li>
    </ol></div>` })}
    ${bloco({ titulo: 'Glossário: cada indicador com a fórmula', corpo: `<dl class="glossario">${termos.map(t => `<div class="termo"><dt>${esc(t[0])}</dt><dd><span class="formula">${esc(t[1])}</span><span>${esc(t[2])}</span></dd></div>`).join('')}</dl>` })}
    ${bloco({ titulo: 'Como ler cada tela', corpo: `<div class="glossario">${telas.map(t => `<div class="termo"><dt>${esc(t[0])}</dt><dd>${esc(t[1])}</dd></div>`).join('')}</div>` })}
    ${bloco({ titulo: 'Limites dos dados', corpo: `<div class="texto"><ul>${limitesPDF().map(l => `<li>${esc(l)}</li>`).join('')}<li>Indicador que não pode ser calculado aparece como "${TRACO}", com o motivo ao passar o mouse.</li></ul></div>` })}
    ${bloco({ titulo: 'Quem pode o quê', corpo: `<div class="texto"><p><b>Leitor</b> (CEO, gerente): vê todos os módulos de análise, filtra, detalha e exporta PDF e Excel.</p><p><b>Editor</b> (o responsável pelo painel e quem ele promover a editor no compartilhamento): também importa, inclui, edita, exclui, fecha meses, ajusta parâmetros e metas e faz a cópia de segurança. Toda alteração fica no histórico.</p><p>Você está em: <b>${podeEditar() ? 'modo editor' : 'somente leitura'}</b>.</p></div>` })}`;
  return { html, exportar: { titulo: 'Guia de Uso', subtitulo: '', secoes: [{ tipo: 'texto', titulo: 'Rotina mensal', paragrafos: ['1. Pedir ao suporte Kaizen a extração do mês fechado (mesmo layout).', '2. Importar Extração: soltar o arquivo, conferir a pré-visualização, confirmar.', '3. Revisar colaboradores novos e a função principal; marcar desligados.', '4. Conferir dias de operação e escopo da coleta do mês.', '5. Auditoria: diferença zero.', '6. Fechar o mês e enviar o Relatório Executivo ao CEO e ao gerente.'] }, { tipo: 'tabela', titulo: 'Glossário', modelo: modeloSimples([{ id: 't', rotulo: 'Indicador', valor: l => l[0] }, { id: 'f', rotulo: 'Fórmula', valor: l => l[1] }, { id: 'o', rotulo: 'O que mede', valor: l => l[2] }], termos) }, { tipo: 'texto', titulo: 'Limites dos dados', paragrafos: limitesPDF(), marcadores: true }] } };
};
