/* =========================================================================
   Auditoria: amarração (base = painéis mensais = acumulado), totais por mês
   e função, problemas de consistência e achados conhecidos (A1 a A7).
   ========================================================================= */

VIEWS.auditoria = () => {
  const ano = UI.ym != null ? anoDe(UI.ym) : new Date().getFullYear();
  const a = auditoria(ano);
  const amarrado = a.amarracao.every(x => Math.abs(x.dif.dias) < 0.005 && Math.abs(x.dif.itens) < 0.005 && Math.abs(x.dif.unidades) < 0.005);
  const linhasAm = [];
  for (const [k, rot, fmt] of [['dias', 'Dias-função', 'int'], ['itens', 'Itens (SKU)', 'int'], ['unidades', 'Unidades', 'dx']]) {
    linhasAm.push({ _grupo: rot });
    linhasAm.push({ rot: 'Total lançado na base', k, fmt, v: f => a.amarracao.find(x => x.funcao === f).base[k] });
    linhasAm.push({ rot: 'Soma dos painéis mensais', k, fmt, v: f => a.amarracao.find(x => x.funcao === f).mensal[k] });
    linhasAm.push({ rot: 'Acumulado por colaborador', k, fmt, v: f => a.amarracao.find(x => x.funcao === f).acum[k] });
    linhasAm.push({ rot: 'Diferença (deve ser zero)', k, fmt: 'd2', dif: true, v: f => a.amarracao.find(x => x.funcao === f).dif[k] });
  }
  const mAm = modeloSimples([
    { id: 'rot', rotulo: 'Verificação', valor: l => l.rot, prim: true, html: l => l.dif ? `<b>► ${esc(l.rot)}</b>` : esc(l.rot) },
    ...FUNCOES.map(f => ({ id: f.id, rotulo: f.nome, tipo: 'dx', valor: l => l.v(f.id), texto: l => fNum(l.v(f.id), l.fmt), html: l => l.dif ? `<span class="${Math.abs(l.v(f.id)) < 0.005 ? '' : 'dif-erro'}">${fD2(l.v(f.id))}</span>` : esc(fNum(l.v(f.id), l.fmt)) })),
    { id: 'sit', rotulo: 'Situação', valor: l => l.dif ? (FUNCOES.every(f => Math.abs(l.v(f.id)) < 0.005) ? 'Amarrado' : 'Divergente') : '', html: l => l.dif ? (FUNCOES.every(f => Math.abs(l.v(f.id)) < 0.005) ? '<span class="pill acima">' + icone('certo') + 'Amarrado</span>' : '<span class="pill abaixo">' + icone('atencao') + 'Divergente</span>') : '' }
  ], linhasAm, { cartoes: false });
  const mTot = modeloSimples([
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.ym) },
    { id: 'f', rotulo: 'Função', valor: l => FUNC[l.funcao].nome, html: l => funcTag(l.funcao) },
    { id: 'lin', rotulo: 'Linhas', tipo: 'int', valor: l => l.linhas },
    { id: 'dias', rotulo: 'Dias-função', tipo: 'int', valor: l => l.dias },
    { id: 'docs', rotulo: 'Documentos', tipo: 'int', valor: l => l.documentos },
    { id: 'itens', rotulo: 'Itens (SKU)', tipo: 'int', valor: l => l.itens },
    { id: 'unid', rotulo: 'Unidades', tipo: 'int', valor: l => l.unidades, html: l => `${fInt(l.unidades)}${Math.abs(l.unidades - Math.round(l.unidades)) > 1e-9 ? ` <span class="fraco" data-dica="Valor exato: ${esc(fDx(l.unidades))}">(${esc(fDx(l.unidades))})</span>` : ''}` }
  ], a.totais, { rodape: { mes: `${a.linhas} lançamentos`, lin: soma(a.totais, t => t.linhas), dias: soma(a.totais, t => t.dias), docs: soma(a.totais, t => t.documentos), itens: soma(a.totais, t => t.itens), unid: soma(a.totais, t => t.unidades) }, linhaAttrs: l => ({ acao: 'ir', params: { rota: 'funcao', params: { f: l.funcao, ym: l.ym } } }), nota: 'Unidades arredondadas para exibição; quando a extração traz frações, o valor exato aparece entre parênteses. As somas usam sempre o valor exato.' });
  const ordemG = { alta: 0, media: 1, info: 2 };
  const probs = a.problemas.slice().sort((x, y) => ordemG[x.gravidade] - ordemG[y.gravidade]);
  const mProb = modeloSimples([
    { id: 'g', rotulo: 'Prioridade', valor: l => ({ alta: 'Alta', media: 'Média', info: 'Informativa' }[l.gravidade]), html: l => `<span class="pill ${l.gravidade === 'alta' ? 'abaixo' : l.gravidade === 'media' ? 'na' : 'insuf'}">${{ alta: 'Alta', media: 'Média', info: 'Informativa' }[l.gravidade]}</span>` },
    { id: 't', rotulo: 'Tipo', valor: l => l.tipo },
    { id: 'tx', rotulo: 'O que foi encontrado', valor: l => l.texto }
  ], probs, { linhaAttrs: l => l.acao ? ({ acao: 'ir', params: { rota: l.acao, params: l.params || {} } }) : ({}), vazio: 'Nenhum problema de consistência encontrado.' });
  const dups = a.meses.flatMap(y => duplicidades(y).map(par => ({ y, par })));
  const fat = a.fatiados.slice().sort((x, y) => (y.diasFuncao - y.presenca) - (x.diasFuncao - x.presenca));
  const achados = [
    { id: 'A1', titulo: 'Duplicidade', texto: dups.length ? `${dups.length} ${dups.length === 1 ? 'par' : 'pares'} de lançamentos idênticos em duas funções: ${dups.map(d => `${nomeExib(d.par[0].codigo)} em ${rotuloYM(d.y).toLowerCase()} (${FUNC[d.par[0].funcao].nome} e ${FUNC[d.par[1].funcao].nome}: ${d.par[0].diasFuncao} dias, ${fInt(d.par[0].documentos)} pedidos, ${fInt(d.par[0].skus)} itens, ${fInt(d.par[0].unidades)} unidades, mesma lista de dias)`).join('; ')}.` : 'Nenhum par de lançamentos idênticos em funções diferentes.',
      rec: 'Muito provavelmente o mesmo trabalho lançado duas vezes. Os lançamentos estão marcados como suspeitos e continuam somando até você decidir: confirme com o suporte Kaizen e exclua um dos dois em Lançamentos.',
      acoes: dups.map(d => botao(`Abrir ${FUNC[d.par[0].funcao].nome}`, 'ir', { rota: 'lancamento', params: { id: d.par[0].id } }, { classe: 'peq' }) + botao(`Abrir ${FUNC[d.par[1].funcao].nome}`, 'ir', { rota: 'lancamento', params: { id: d.par[1].id } }, { classe: 'peq' })).join('') },
    { id: 'A2', titulo: 'Dias sobrepostos', texto: fat.length ? `Em ${fat.length} casos de ${ano}, a soma dos dias por função passa dos dias em que a pessoa esteve no CD. Maiores: ${fat.slice(0, 4).map(p => `${nomeExib(p.codigo)} em ${rotuloYM(p.ym).toLowerCase()} (${p.diasFuncao} dias-função em ${p.presenca} de presença, ${p.funcoes.length} funções)`).join('; ')}.` : 'Nenhum caso de dias-função acima da presença.',
      rec: 'A produtividade por dia dessas pessoas está subestimada: um dia dividido entre funções conta como um dia inteiro em cada uma. Leia Multifunção antes de cobrar resultado individual. (A planilha de referência citava 11 casos em jan–jul; o painel conta direto pelas listas de dias.)', acoes: botao('Abrir Multifunção', 'menu', { rota: 'multifuncao', params: {} }, { classe: 'peq' }) },
    { id: 'A3', titulo: 'Peso e volume não são reais', texto: a.comPeso ? `Em ${a.pesoIgual} de ${a.comPeso} linhas com peso (${fPct(div(a.pesoIgual, a.comPeso))}), o "Peso Kg" é exatamente igual às unidades; em ${a.volIgual} de ${a.comVol} linhas, o "Volume M³" é exatamente unidades ÷ 10.000.` : 'Sem linhas com peso e volume na base deste ano.',
      rec: 'O cadastro logístico dos produtos (peso bruto e cubagem) não está preenchido no sistema de origem. Peso e volume ficam guardados como dado bruto de auditoria e fora de todos os índices. Pedir ao Winthor/Kaizen o cadastro logístico.' },
    { id: 'A4', titulo: 'Unidades com casas decimais', texto: a.fracionadas.length ? `${a.fracionadas.length} lançamentos trazem unidades fracionadas: ${a.fracionadas.slice(0, 6).map(l => `${nomeExib(l.codigo)} ${rotuloYMCurto(l.ym)} (${fDx(l.unidades)})`).join(', ')}${a.fracionadas.length > 6 ? '…' : ''}.` : 'Nenhuma unidade fracionada.',
      rec: 'Indica rateio de caixa/fardo. Não invalida a análise, mas vale pedir ao suporte Kaizen o critério de conversão de embalagem para unidade.' },
    { id: 'A5', titulo: 'Média do Kaizen arredondada', texto: a.comMedia ? `Em ${a.truncada} de ${a.comMedia} lançamentos a "Média Skus dia" do Kaizen é a parte inteira de itens ÷ dias (as casas decimais são cortadas).` : 'Sem média do Kaizen na base.',
      rec: 'O painel recalcula itens ÷ dias com as casas decimais e guarda a média do Kaizen só para auditoria.' },
    { id: 'A6', titulo: 'Quebra de série', texto: (() => { const q = mesesDisponiveis().filter(y => infoMes(y).quebraSerie); return q.length ? `Quebra marcada em ${q.map(y => rotuloYM(y).toLowerCase()).join(', ')}: ${infoMes(q[q.length - 1]).escopo}.` : 'Nenhum mês com quebra de série marcada.'; })(),
      rec: 'A separação e a conferência das rotas externas eram manuais e passaram para o coletor no fim de setembro/2026. O aumento de volume a partir daí não é ganho de produtividade. Todo gráfico de evolução marca a quebra.', acoes: botao('Confirmar data em Parâmetros', 'ir', { rota: 'parametros', params: { aba: 'gerais' } }, { classe: 'peq' }) },
    { id: 'A7', titulo: 'Sem dado diário e sem qualidade', texto: (() => { const ls = lancamentosPeriodo(ymDe(ano, 1), ymDe(ano, 12)); const comDiv = ls.filter(l => ok(Number(l.divergencias)) && l.divergencias !== null).length; const comDiario = ls.filter(l => Array.isArray(l.diario) && l.diario.length).length; return `A extração é mensal: sem hora, sem turno e sem divergência de conferência. Lançamentos com divergência informada: ${comDiv}; com detalhe diário: ${comDiario}.`; })(),
      rec: 'Pedir ao suporte Kaizen a extração analítica por data e a coluna de divergências de conferência. O importador já aceita as colunas "Data", "Destino"/"Canal" e "Itens divergentes"/"Divergências" quando vierem.' }
  ];
  const html = `${cabecalhoTela('Auditoria', `Ano de ${ano} · ${a.linhas} lançamentos na base`)}
    ${amarrado ? avisoHTML('ok', '<b>Amarrado:</b> total da base = soma dos painéis mensais = acumulado, por função, para dias, itens e unidades. Diferença zero.') : avisoHTML('erro', '<b>Diferença encontrada na amarração.</b> Confira a tabela abaixo e os problemas de consistência.')}
    ${bloco({ titulo: '1. Amarração: base × painéis mensais × acumulado', desc: 'Três caminhos de cálculo independentes que precisam chegar ao mesmo total.', corpo: tabelaHTML(mAm) })}
    ${bloco({ titulo: '2. Totais por mês e função', desc: 'Confira com os números de fechamento. Clique numa linha para abrir a função no mês.', corpo: tabelaHTML(mTot) })}
    ${bloco({ titulo: `3. Problemas de consistência (${probs.length})`, desc: 'Lista viva: some quando o problema é resolvido.', corpo: tabelaHTML(mProb) })}
    ${bloco({ titulo: '4. Achados conhecidos na extração do Kaizen', corpo: `<div class="lista-alertas">${achados.map(x => `<div class="alerta media"><span class="ic"><b style="font-size:11px">${x.id}</b></span><div><div class="tt">${esc(x.titulo)}</div><div class="tx" style="color:var(--text)">${esc(x.texto)}</div><div class="tx">${esc(x.rec)}</div></div><div class="acs">${x.acoes || ''}</div></div>`).join('')}</div>` })}`;
  const mAch = modeloSimples([{ id: 'id', rotulo: 'Achado', valor: l => `${l.id} — ${l.titulo}` }, { id: 'tx', rotulo: 'O que foi encontrado', valor: l => l.texto }, { id: 'rec', rotulo: 'Recomendação', valor: l => l.rec }], achados);
  return { html, exportar: { titulo: 'Auditoria', subtitulo: `Ano de ${ano}`, secoes: [{ tipo: 'tabela', titulo: 'Amarração', modelo: mAm }, { tipo: 'tabela', titulo: 'Totais por mês e função', modelo: mTot }, { tipo: 'tabela', titulo: 'Problemas de consistência', modelo: mProb }, { tipo: 'tabela', titulo: 'Achados conhecidos', modelo: mAch }] } };
};
