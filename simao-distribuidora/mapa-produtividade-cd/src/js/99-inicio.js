/* =========================================================================
   Inicialização.
   ========================================================================= */

function iniciar() {
  restaurarPreferencias();
  montarCasca();
  ligarEventos();
  iniciarDicas();
  document.addEventListener('input', ev => { if (ev.target && ev.target.id === 'busca-ficha') atualizarSugestoes(ev.target); });
  document.addEventListener('keydown', ev => {
    if (!ev.target || ev.target.id !== 'busca-ficha') return;
    const caixa = document.getElementById('sugestoes-ficha');
    if (!caixa || caixa.hidden) return;
    const itens = $$('button', caixa);
    let i = itens.findIndex(b => b.classList.contains('ativo'));
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (itens[i]) itens[i].classList.remove('ativo');
      i = ev.key === 'ArrowDown' ? Math.min(itens.length - 1, i + 1) : Math.max(0, i - 1);
      if (itens[i]) { itens[i].classList.add('ativo'); itens[i].scrollIntoView({ block: 'nearest' }); }
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const b = itens[i >= 0 ? i : 0];
      if (b) { UI.buscaFicha = ''; b.click(); }
    } else if (ev.key === 'Escape') { caixa.hidden = true; }
  });
  document.addEventListener('click', ev => {
    const caixa = document.getElementById('sugestoes-ficha');
    if (caixa && !caixa.hidden && !ev.target.closest('.busca')) caixa.hidden = true;
    if (ev.target.closest && ev.target.closest('#sugestoes-ficha button')) UI.buscaFicha = '';
  });
  render();
  conectar();
  DOM_PRONTO.then(async () => {
    if (!window.Chart) await garantirBiblioteca('chart');
    render();
  });
  /* acesso para conferência automática (somente leitura dos cálculos) */
  window.__mapa = Object.freeze({
    S, UI, P, ranking, totaisFuncao, totaisCD, linhasFuncao, auditoria, operacao, alertasDoMes, multifuncao, presenca, mesesComDados,
    infoMes, metaVigente, sugerirMetas, interpretarExtracao, validarImportacao, leituraGerencial, ymDe, chaveYM, abasExcelCompleto,
    exportarTelaPDF, exportarTelaExcel, exportarRelatorioExecutivo, exportarFichaPDF, exportarExcelCompleto, copiaDeSeguranca, navegar, render
  });
}
iniciar();
