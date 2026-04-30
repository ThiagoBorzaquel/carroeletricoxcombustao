/**
 * CARRO ELÉTRICO × COMBUSTÃO — app.js
 * Simulador de Custo Total de Propriedade (TCO)
 */

'use strict';

// ──────────────────────────────────────────────
// COOKIE BANNER
// ──────────────────────────────────────────────
(function initCookieBanner() {
  const banner = document.getElementById('cookieBanner');
  const btn    = document.getElementById('acceptCookies');
  if (!banner || !btn) return;

  if (localStorage.getItem('cookieAccepted') === '1') {
    banner.classList.add('hidden');
  }

  btn.addEventListener('click', () => {
    localStorage.setItem('cookieAccepted', '1');
    banner.classList.add('hidden');
  });
})();

// ──────────────────────────────────────────────
// TAB NAVIGATION
// ──────────────────────────────────────────────
(function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels  = document.querySelectorAll('.tab-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // Update buttons
      buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Update panels
      panels.forEach(p => p.classList.remove('active'));
      const targetPanel = document.getElementById('tab-' + target);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
})();

// ──────────────────────────────────────────────
// CHART INSTANCES (stored so we can destroy/re-create)
// ──────────────────────────────────────────────
let chartLinha = null;
let chartBarra = null;

// ──────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────

/** Format BRL currency */
function brl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

/** Format percentage */
function pct(value) {
  return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
}

/** Get float from input field */
function getVal(id) {
  const el = document.getElementById(id);
  const v  = parseFloat(el ? el.value.replace(',', '.') : '0');
  return isNaN(v) ? 0 : v;
}

// ──────────────────────────────────────────────
// CORE TCO CALCULATION
// ──────────────────────────────────────────────

/**
 * Calculate cumulative TCO arrays for each year.
 * Returns {eletrico: [], combustao: [], labels: []}
 */
function calcTCO() {
  // Inputs
  const precoElet    = getVal('precoEletrico');
  const precoComb    = getVal('precoCombustao');
  const kmAno        = getVal('kmAno');
  const anos         = Math.max(1, Math.min(30, Math.round(getVal('anos'))));
  const inflacao     = getVal('inflacaoAnual') / 100;  // anual
  const depreciacaoPct = getVal('depreciacao') / 100;

  // Elétrico
  const precoEnergia       = getVal('precoEnergia');
  const consumoElet        = getVal('consumoEletrico');  // km/kWh
  const ipvaEletPct        = getVal('ipvaEletrico') / 100;
  const manutElet          = getVal('manutencaoEletrico');
  const seguroElet         = getVal('seguroEletrico');

  // Combustão
  const precoCombustivel   = getVal('precoCombustivel');
  const consumoComb        = getVal('consumoCombustao');  // km/l
  const ipvaCombPct        = getVal('ipvaCombustao') / 100;
  const manutComb          = getVal('manutencaoCombustao');
  const seguroComb         = getVal('seguroCombustao');

  const labels      = [];
  const cumulElet   = [];
  const cumulComb   = [];
  const diffAcum    = [];  // positivo = elétrico vantagem

  let totalElet = precoElet;
  let totalComb = precoComb;

  // Valor atual dos veículos para IPVA (deprecia anualmente)
  let valorElet = precoElet;
  let valorComb = precoComb;

  for (let ano = 1; ano <= anos; ano++) {
    // Fator de inflação acumulada para preços variáveis
    const infFator = Math.pow(1 + inflacao, ano - 1);

    // Depreciação no início do ano (para IPVA base)
    valorElet = valorElet * (1 - depreciacaoPct);
    valorComb = valorComb * (1 - depreciacaoPct);

    // ── Custos anuais elétrico ──
    const energiaCusto   = (kmAno / consumoElet) * (precoEnergia * infFator);
    const ipvaEletAnual  = valorElet * ipvaEletPct;
    const manutEletAnual = manutElet * infFator;
    const seguroEletAnual= seguroElet * infFator;
    const custoEletAnual = energiaCusto + ipvaEletAnual + manutEletAnual + seguroEletAnual;

    // ── Custos anuais combustão ──
    const combustivelCusto = (kmAno / consumoComb) * (precoCombustivel * infFator);
    const ipvaCombAnual    = valorComb * ipvaCombPct;
    const manutCombAnual   = manutComb * infFator;
    const seguroCombAnual  = seguroComb * infFator;
    const custoCombAnual   = combustivelCusto + ipvaCombAnual + manutCombAnual + seguroCombAnual;

    totalElet += custoEletAnual;
    totalComb += custoCombAnual;

    labels.push(`Ano ${ano}`);
    cumulElet.push(Math.round(totalElet));
    cumulComb.push(Math.round(totalComb));
    diffAcum.push(Math.round(totalComb - totalElet));  // positivo = eletrico melhor
  }

  // ── Breakdown (ano 1 para referência) ──
  const infFator1 = Math.pow(1 + inflacao, 0);
  const valorElet1 = precoElet * (1 - depreciacaoPct);
  const valorComb1 = precoComb * (1 - depreciacaoPct);

  const breakdown = {
    energia:    Math.round((kmAno / consumoElet) * (precoEnergia * infFator1)),
    ipvaElet:   Math.round(valorElet1 * ipvaEletPct),
    manutElet:  Math.round(manutElet),
    seguroElet: Math.round(seguroElet),
    combustivel:Math.round((kmAno / consumoComb) * (precoCombustivel * infFator1)),
    ipvaComb:   Math.round(valorComb1 * ipvaCombPct),
    manutComb:  Math.round(manutComb),
    seguroComb: Math.round(seguroComb),
  };

  // ── Break-even (ano em que elétrico passa a ser mais barato acumulado) ──
  let breakEvenAno = null;
  for (let i = 0; i < diffAcum.length; i++) {
    if (diffAcum[i] > 0) { breakEvenAno = i + 1; break; }
  }

  // ── Métricas ──
  const economiaTotal  = cumulComb[anos - 1] - cumulElet[anos - 1];
  const investExtra    = Math.max(0, precoElet - precoComb);
  const roi            = investExtra > 0 ? (economiaTotal / investExtra) * 100 : null;

  // Payback: ano em que economia supera investimento extra
  let paybackAno = null;
  for (let i = 0; i < diffAcum.length; i++) {
    if (diffAcum[i] >= investExtra) { paybackAno = i + 1; break; }
  }

  return {
    anos, labels, cumulElet, cumulComb, diffAcum,
    economiaTotal, breakEvenAno, paybackAno, roi,
    precoElet, precoComb, investExtra,
    breakdown,
    totalElet: cumulElet[anos - 1],
    totalComb: cumulComb[anos - 1],
  };
}

// ──────────────────────────────────────────────
// RENDER RESULTS
// ──────────────────────────────────────────────

function renderVeredito(data) {
  const { economiaTotal, paybackAno, anos, roi } = data;
  const card = document.getElementById('veredito');

  let icon, title, desc, cls;

  if (economiaTotal > 5000) {
    icon  = '⚡';
    cls   = 'v-electric';
    title = 'Elétrico compensa!';
    desc  = `No período de ${anos} anos, o carro elétrico gera uma economia de <strong>${brl(economiaTotal)}</strong> frente ao combustão. ${paybackAno ? `O investimento se paga em ${paybackAno} ${paybackAno === 1 ? 'ano' : 'anos'}.` : 'O payback ocorre além do período analisado.'}`;
  } else if (economiaTotal < -5000) {
    icon  = '⛽';
    cls   = 'v-combustion';
    title = 'Combustão compensa mais';
    desc  = `No cenário simulado, o carro a combustão sai ${brl(Math.abs(economiaTotal))} mais barato no período de ${anos} anos. Considere aumentar a quilometragem ou o período de análise.`;
  } else {
    icon  = '⚖️';
    cls   = 'v-tie';
    title = 'Empate técnico';
    desc  = `A diferença entre os dois no período de ${anos} anos é de apenas ${brl(Math.abs(economiaTotal))}. Fatores como autonomia, conforto e conveniência podem ser decisivos.`;
  }

  card.className = `card card--veredito ${cls}`;
  card.innerHTML = `
    <span class="veredito-icon">${icon}</span>
    <div class="veredito-title">${title}</div>
    <p class="veredito-desc">${desc}</p>
  `;
}

function renderMetrics(data) {
  const { economiaTotal, paybackAno, breakEvenAno, roi, anos } = data;

  // Economia
  const elEcon = document.getElementById('val-economia');
  const subEcon = document.getElementById('sub-economia');
  const mEcon   = document.getElementById('metric-economia');
  elEcon.textContent = brl(Math.abs(economiaTotal));
  subEcon.textContent = economiaTotal >= 0 ? 'a favor do elétrico' : 'a favor do combustão';
  mEcon.className = 'metric-card ' + (economiaTotal >= 0 ? 'positive' : 'negative');

  // Payback
  const elPay   = document.getElementById('val-payback');
  const subPay  = document.getElementById('sub-payback');
  const mPay    = document.getElementById('metric-payback');
  if (paybackAno) {
    elPay.textContent  = `${paybackAno} ${paybackAno === 1 ? 'ano' : 'anos'}`;
    subPay.textContent = 'para recuperar o investimento extra';
    mPay.className = 'metric-card positive';
  } else if (data.investExtra <= 0) {
    elPay.textContent  = 'Imediato';
    subPay.textContent = 'elétrico já custa menos';
    mPay.className = 'metric-card positive';
  } else {
    elPay.textContent  = `> ${anos} anos`;
    subPay.textContent = 'além do período analisado';
    mPay.className = 'metric-card negative';
  }

  // Break-even
  const elBe   = document.getElementById('val-breakeven');
  const subBe  = document.getElementById('sub-breakeven');
  const mBe    = document.getElementById('metric-breakeven');
  if (breakEvenAno) {
    elBe.textContent  = `Ano ${breakEvenAno}`;
    subBe.textContent = 'elétrico passa a custar menos acumulado';
    mBe.className = 'metric-card positive';
  } else if (data.cumulElet[0] <= data.cumulComb[0]) {
    elBe.textContent  = 'Já no ano 1';
    subBe.textContent = 'elétrico já é mais barato';
    mBe.className = 'metric-card positive';
  } else {
    elBe.textContent  = `> ${anos} anos`;
    subBe.textContent = 'elétrico não alcança no período';
    mBe.className = 'metric-card negative';
  }

  // ROI
  const elRoi  = document.getElementById('val-roi');
  const subRoi = document.getElementById('sub-roi');
  const mRoi   = document.getElementById('metric-roi');
  if (roi !== null) {
    elRoi.textContent  = pct(roi);
    subRoi.textContent = `sobre o investimento extra de ${brl(data.investExtra)}`;
    mRoi.className = 'metric-card ' + (roi >= 0 ? 'positive' : 'negative');
  } else {
    elRoi.textContent  = 'N/A';
    subRoi.textContent = 'preços de compra iguais';
    mRoi.className = 'metric-card neutral';
  }
}

function renderTotais(data) {
  document.getElementById('total-eletrico').textContent  = brl(data.totalElet);
  document.getElementById('total-combustao').textContent = brl(data.totalComb);
}

function renderBreakdown(data) {
  const { breakdown } = data;

  const rows = [
    {
      label: '🛒 Compra do veículo',
      e: data.precoElet, c: data.precoComb,
    },
    {
      label: '⚡/⛽ Energia/Combustível (ano 1)',
      e: breakdown.energia, c: breakdown.combustivel,
    },
    {
      label: '🏛️ IPVA (ano 1)',
      e: breakdown.ipvaElet, c: breakdown.ipvaComb,
    },
    {
      label: '🔧 Manutenção (ano 1)',
      e: breakdown.manutElet, c: breakdown.manutComb,
    },
    {
      label: '🛡️ Seguro (ano 1)',
      e: breakdown.seguroElet, c: breakdown.seguroComb,
    },
  ];

  const tbody = document.getElementById('breakdownBody');
  tbody.innerHTML = rows.map(row => {
    const diff = row.c - row.e;
    const cls  = diff > 0 ? 'td-positive' : diff < 0 ? 'td-negative' : '';
    return `<tr>
      <td>${row.label}</td>
      <td>${brl(row.e)}</td>
      <td>${brl(row.c)}</td>
      <td class="${cls}">${diff >= 0 ? '+' : ''}${brl(diff)}</td>
    </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────
// CHARTS
// ──────────────────────────────────────────────

function renderCharts(data) {
  const { labels, cumulElet, cumulComb, diffAcum } = data;

  const fontFamily = 'DM Mono, monospace';
  const gridColor  = 'rgba(30,45,61,0.8)';
  const textColor  = '#6a8099';

  // Destroy old instances
  if (chartLinha) { chartLinha.destroy(); chartLinha = null; }
  if (chartBarra) { chartBarra.destroy(); chartBarra = null; }

  // ── LINHA: custo acumulado ──
  const ctxLinha = document.getElementById('chartLinha').getContext('2d');
  chartLinha = new Chart(ctxLinha, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '⚡ Elétrico',
          data: cumulElet,
          borderColor: '#00e57a',
          backgroundColor: 'rgba(0,229,122,0.08)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#00e57a',
          fill: true,
          tension: 0.35,
        },
        {
          label: '⛽ Combustão',
          data: cumulComb,
          borderColor: '#ff6b35',
          backgroundColor: 'rgba(255,107,53,0.08)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#ff6b35',
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: fontFamily, size: 12 },
            boxWidth: 12, boxHeight: 12,
          },
        },
        tooltip: {
          backgroundColor: '#0e1318',
          borderColor: '#1e2d3d',
          borderWidth: 1,
          titleFont: { family: fontFamily },
          bodyFont: { family: fontFamily },
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${brl(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { family: fontFamily, size: 11 }, maxTicksLimit: 10 },
          grid: { color: gridColor },
        },
        y: {
          ticks: {
            color: textColor,
            font: { family: fontFamily, size: 11 },
            callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
          },
          grid: { color: gridColor },
        },
      },
    },
  });

  // ── BARRA: diferença acumulada ──
  const ctxBarra = document.getElementById('chartBarra').getContext('2d');
  chartBarra = new Chart(ctxBarra, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Diferença Acumulada (Combustão − Elétrico)',
          data: diffAcum,
          backgroundColor: diffAcum.map(v => v >= 0 ? 'rgba(0,229,122,0.6)' : 'rgba(255,107,53,0.6)'),
          borderColor:      diffAcum.map(v => v >= 0 ? '#00e57a' : '#ff6b35'),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: fontFamily, size: 12 },
            boxWidth: 12, boxHeight: 12,
          },
        },
        tooltip: {
          backgroundColor: '#0e1318',
          borderColor: '#1e2d3d',
          borderWidth: 1,
          titleFont: { family: fontFamily },
          bodyFont: { family: fontFamily },
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              return ` ${v >= 0 ? 'Elétrico economiza' : 'Combustão economiza'} ${brl(Math.abs(v))}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { family: fontFamily, size: 11 }, maxTicksLimit: 10 },
          grid: { color: gridColor },
        },
        y: {
          ticks: {
            color: textColor,
            font: { family: fontFamily, size: 11 },
            callback: v => (v >= 0 ? '+' : '') + 'R$' + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
          },
          grid: { color: gridColor },
        },
      },
    },
  });
}

// ──────────────────────────────────────────────
// MAIN: CALCULATE
// ──────────────────────────────────────────────

function calcular() {
  // Wait for Chart.js to load
  if (typeof Chart === 'undefined') {
    alert('Aguarde o carregamento completo da página e tente novamente.');
    return;
  }

  const data = calcTCO();

  // Show results
  document.getElementById('resultadoEmpty').classList.add('hidden');
  document.getElementById('resultadoContent').classList.remove('hidden');
  document.getElementById('graficosEmpty').classList.add('hidden');
  document.getElementById('graficosContent').classList.remove('hidden');

  // Render
  renderVeredito(data);
  renderMetrics(data);
  renderTotais(data);
  renderBreakdown(data);
  renderCharts(data);

  // Switch to result tab
  document.querySelector('[data-tab="resultado"]').click();

  // Scroll to top of results
  setTimeout(() => {
    document.getElementById('tab-resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ──────────────────────────────────────────────
// SHARE
// ──────────────────────────────────────────────

function shareResult() {
  const data = calcTCO();
  const msg  = `🚗 Simulei no carroeletricoxcombustao.com.br:\n`
             + `⚡ Custo total elétrico: ${brl(data.totalElet)}\n`
             + `⛽ Custo total combustão: ${brl(data.totalComb)}\n`
             + `💰 Economia: ${brl(Math.abs(data.economiaTotal))}\n`
             + `https://carroeletricoxcombustao.com.br`;

  if (navigator.share) {
    navigator.share({ title: 'Elétrico × Combustão — Resultado', text: msg })
      .catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(msg).then(() => {
      const btn = document.getElementById('btnShare');
      const orig = btn.textContent;
      btn.textContent = '✅ Copiado!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  }
}

// ──────────────────────────────────────────────
// EVENT LISTENERS
// ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const calcBtn  = document.getElementById('calcularBtn');
  const shareBtn = document.getElementById('btnShare');

  if (calcBtn)  calcBtn.addEventListener('click', calcular);
  if (shareBtn) shareBtn.addEventListener('click', shareResult);

  // Allow Enter key on inputs to trigger calculation
  document.querySelectorAll('.input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') calcular();
    });
  });
});
