const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: "#c7d2e2"
      }
    }
  },
  scales: {
    x: {
      ticks: { color: "#9fb1c8" },
      grid: { color: "rgba(255,255,255,0.08)" }
    },
    y: {
      ticks: { color: "#9fb1c8" },
      grid: { color: "rgba(255,255,255,0.08)" }
    }
  }
};

export function createCharts(contexts) {
  return {
    costEvolution: createLineChart(contexts.costEvolutionCtx),
    breakEven: createBarChart(contexts.breakEvenCtx),
    evBreakdown: createDoughnutChart(contexts.evBreakdownCtx),
    iceBreakdown: createDoughnutChart(contexts.iceBreakdownCtx),
    fipeHistory: createLineChart(contexts.fipeHistoryCtx)
  };
}


export function updateCharts(charts, payload) {
  const labels = payload.yearlySeries.map((point) => `Ano ${point.year}`);

  charts.costEvolution.data = {
    labels,
    datasets: [
      { label: "Elétrico", data: payload.yearlySeries.map((point) => point.evCumulative), borderColor: "#19c37d", backgroundColor: "rgba(25,195,125,0.15)", fill: true, tension: 0.32 },
      { label: "Combustão", data: payload.yearlySeries.map((point) => point.iceCumulative), borderColor: "#ffb020", backgroundColor: "rgba(255,176,32,0.12)", fill: true, tension: 0.32 },
      { label: "Sensibilidade elétrico", data: payload.sensitivity.yearlySeries.map((point) => point.evCumulative), borderColor: "#5ac8fa", borderDash: [6, 6], tension: 0.28 },
      { label: "Sensibilidade combustão", data: payload.sensitivity.yearlySeries.map((point) => point.iceCumulative), borderColor: "#ff6b6b", borderDash: [6, 6], tension: 0.28 }
    ]
  };
  charts.costEvolution.update();

  charts.breakEven.data = {
    labels,
    datasets: [{ label: "Economia acumulada", data: payload.yearlySeries.map((point) => point.difference), backgroundColor: payload.yearlySeries.map((point) => point.difference >= 0 ? "rgba(25,195,125,0.7)" : "rgba(255,107,107,0.65)"), borderRadius: 12 }]
  };
  charts.breakEven.update();

  charts.evBreakdown.data = {
    labels: ["Energia", "Seguro", "Manutenção", "IPVA"],
    datasets: [{ data: [payload.annualBreakdown.ev.energy, payload.annualBreakdown.ev.insurance, payload.annualBreakdown.ev.maintenance, payload.annualBreakdown.ev.ipva], backgroundColor: ["#19c37d", "#5ac8fa", "#8796ff", "#d1f36a"] }]
  };
  charts.evBreakdown.update();

  charts.iceBreakdown.data = {
    labels: ["Combustível", "Seguro", "Manutenção", "IPVA"],
    datasets: [{ data: [payload.annualBreakdown.ice.fuel, payload.annualBreakdown.ice.insurance, payload.annualBreakdown.ice.maintenance, payload.annualBreakdown.ice.ipva], backgroundColor: ["#ffb020", "#ff8c5a", "#ff6b6b", "#ffd166"] }]
  };
  charts.iceBreakdown.update();

  const evHistory = payload.fipeSelections.ev?.history ?? [];
  const iceHistory = payload.fipeSelections.ice?.history ?? [];
  const historyLabels = evHistory.length ? evHistory.map((point) => point.label) : iceHistory.map((point) => point.label);

  charts.fipeHistory.data = {
    labels: historyLabels.length ? historyLabels : ["Sem dados"],
    datasets: [
      { label: payload.fipeSelections.ev?.label ? `${payload.fipeSelections.ev.label} (${(payload.fipeSelections.ev.estimatedDepreciation || 0).toFixed(1)}%)` : "FIPE elétrico", data: evHistory.length ? evHistory.map((point) => point.value) : [0], borderColor: "#19c37d", backgroundColor: "rgba(25,195,125,0.15)", tension: 0.3 },
      { label: payload.fipeSelections.ice?.label ? `${payload.fipeSelections.ice.label} (${(payload.fipeSelections.ice.estimatedDepreciation || 0).toFixed(1)}%)` : "FIPE combustão", data: iceHistory.length ? iceHistory.map((point) => point.value) : [0], borderColor: "#ffb020", backgroundColor: "rgba(255,176,32,0.12)", tension: 0.3 }
    ]
  };
  charts.fipeHistory.update();
}

function createLineChart(canvas) {
  return new Chart(canvas, { type: "line", data: { labels: [], datasets: [] }, options: chartDefaults });
}

function createBarChart(canvas) {
  return new Chart(canvas, { type: "bar", data: { labels: [], datasets: [] }, options: chartDefaults });
}

function createDoughnutChart(canvas) {
  return new Chart(canvas, {
    type: "doughnut",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: "#c7d2e2" } } }
    }
  });
}

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 200
};
