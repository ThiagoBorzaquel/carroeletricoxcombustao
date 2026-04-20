import { calculateScenario, buildSensitivityScenario, formatCurrency, formatNumber, getDemoValues } from "./js/calculator.js";
import { createCharts, updateCharts } from "./js/charts.js";
import { createFipeService } from "./js/fipe.js";

const state = { ipvaRates: {}, depreciationProfiles: {}, charts: null, fipeSelections: { ev: {}, ice: {} } };
const form = document.querySelector("#tcoForm");
const siteHeading = document.querySelector("header h1");
const themeToggle = document.querySelector("#themeToggle");
const loadDemoBtn = document.querySelector("#loadDemoBtn");
const resetBtn = document.querySelector("#resetBtn");
const clearFipeBtn = document.querySelector("#clearFipeBtn");
const tableBody = document.querySelector("#summaryTableBody");
const fipeStatus = document.querySelector("#fipeStatus");
const htmlRoot = document.documentElement;
const fipeService = createFipeService();

const kpis = {
  savings: document.querySelector("#kpiSavings"),
  payback: document.querySelector("#kpiPayback"),
  breakEven: document.querySelector("#kpiBreakEven"),
  roi: document.querySelector("#kpiRoi"),
  co2: document.querySelector("#kpiCo2"),
  ipva: document.querySelector("#kpiIpva")
};

const verdict = {
  badge: document.querySelector("#verdictBadge"),
  headline: document.querySelector("#verdictHeadline"),
  body: document.querySelector("#verdictBody")
};

const sliderLabels = {
  fuelIncrease: document.querySelector("#fuelIncreaseValue"),
  energyIncrease: document.querySelector("#energyIncreaseValue"),
  kmVariation: document.querySelector("#kmVariationValue")
};

async function bootstrap() {
  document.title = "carroeletricoxcombustao.com.br | Simulador TCO, FIPE e Payback";
  if (siteHeading) {
    siteHeading.textContent = "Carro Elétrico x Combustão";
  }

  const [ipvaRates, depreciationProfiles] = await Promise.all([
    fetch("./data/ipva-rates.json").then((response) => response.json()),
    fetch("./data/depreciation-rates.json").then((response) => response.json())
  ]);
  state.ipvaRates = ipvaRates.states;
  state.depreciationProfiles = depreciationProfiles;
  populateStateSelect();
  bindEvents();
  await Promise.all([populateBrandOptions("ev"), populateBrandOptions("ice")]);
  state.charts = createCharts({
    costEvolutionCtx: document.querySelector("#costEvolutionChart"),
    breakEvenCtx: document.querySelector("#breakEvenChart"),
    evBreakdownCtx: document.querySelector("#evBreakdownChart"),
    iceBreakdownCtx: document.querySelector("#iceBreakdownChart"),
    fipeHistoryCtx: document.querySelector("#fipeHistoryChart")
  });
  if (localStorage.getItem("theme") === "light") {
    htmlRoot.classList.remove("dark");
    htmlRoot.classList.add("light");
  }
  syncThemeButton();
  runCalculation();
}

function bindEvents() {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runCalculation();
  });

  form.addEventListener("input", (event) => {
    if (event.target.name in sliderLabels) sliderLabels[event.target.name].textContent = `${event.target.value}%`;
    runCalculation();
  });

  loadDemoBtn.addEventListener("click", () => {
    Object.entries(getDemoValues()).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = value;
    });
    runCalculation();
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    form.elements.namedItem("state").value = "SP";
    sliderLabels.fuelIncrease.textContent = "15%";
    sliderLabels.energyIncrease.textContent = "8%";
    sliderLabels.kmVariation.textContent = "10%";
    runCalculation();
  });

  themeToggle.addEventListener("click", () => {
    htmlRoot.classList.toggle("light");
    htmlRoot.classList.toggle("dark");
    localStorage.setItem("theme", htmlRoot.classList.contains("light") ? "light" : "dark");
    syncThemeButton();
  });

  clearFipeBtn.addEventListener("click", () => {
    state.fipeSelections = { ev: {}, ice: {} };
    fipeStatus.textContent = "Consulta FIPE limpa. Os preços manuais continuam valendo.";
    runCalculation();
  });

  document.querySelectorAll("[data-role='load-fipe']").forEach((button) => {
    button.addEventListener("click", async () => {
      await loadSelectedFipeVehicle(button.dataset.vehicle);
    });
  });

  document.querySelectorAll("[data-fipe='vehicleType']").forEach((select) => {
    select.addEventListener("change", async (event) => populateBrandOptions(event.target.dataset.vehicle));
  });
  document.querySelectorAll("[data-fipe='brand']").forEach((select) => {
    select.addEventListener("change", async (event) => populateModelOptions(event.target.dataset.vehicle));
  });
  document.querySelectorAll("[data-fipe='model']").forEach((select) => {
    select.addEventListener("change", async (event) => populateYearOptions(event.target.dataset.vehicle));
  });
}

function populateStateSelect() {
  const select = form.elements.namedItem("state");
  select.innerHTML = "";
  Object.entries(state.ipvaRates).forEach(([code, config]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${config.name} (${config.evRateLabel} EV / ${config.iceRateLabel} ICE)`;
    select.appendChild(option);
  });
  select.value = "SP";
}

async function populateBrandOptions(vehicleKey) {
  const vehicleType = getFipeElement(vehicleKey, "vehicleType").value;
  const brandSelect = getFipeElement(vehicleKey, "brand");
  const modelSelect = getFipeElement(vehicleKey, "model");
  const yearSelect = getFipeElement(vehicleKey, "year");
  setSelectLoading(brandSelect, "Carregando marcas...");
  setSelectLoading(modelSelect, "Selecione a marca");
  setSelectLoading(yearSelect, "Selecione o modelo");
  try {
    const brands = await fipeService.getBrands(vehicleType);
    fillSelect(brandSelect, brands, "Escolha uma marca");
    if (brands[0]) {
      brandSelect.value = brands[0].codigo;
      await populateModelOptions(vehicleKey);
    }
  } catch (error) {
    setSelectLoading(brandSelect, "API indisponível");
    fipeStatus.textContent = `Não foi possível carregar marcas FIPE agora. ${error.message}`;
  }
}

async function populateModelOptions(vehicleKey) {
  const vehicleType = getFipeElement(vehicleKey, "vehicleType").value;
  const brandCode = getFipeElement(vehicleKey, "brand").value;
  const modelSelect = getFipeElement(vehicleKey, "model");
  const yearSelect = getFipeElement(vehicleKey, "year");
  if (!brandCode) return;
  setSelectLoading(modelSelect, "Carregando modelos...");
  setSelectLoading(yearSelect, "Selecione o modelo");
  try {
    const response = await fipeService.getModels(vehicleType, brandCode);
    fillSelect(modelSelect, response.modelos, "Escolha um modelo");
    if (response.modelos[0]) {
      modelSelect.value = response.modelos[0].codigo;
      await populateYearOptions(vehicleKey);
    }
  } catch (error) {
    setSelectLoading(modelSelect, "API indisponível");
    fipeStatus.textContent = `Não foi possível carregar modelos FIPE agora. ${error.message}`;
  }
}

async function populateYearOptions(vehicleKey) {
  const vehicleType = getFipeElement(vehicleKey, "vehicleType").value;
  const brandCode = getFipeElement(vehicleKey, "brand").value;
  const modelCode = getFipeElement(vehicleKey, "model").value;
  const yearSelect = getFipeElement(vehicleKey, "year");
  if (!brandCode || !modelCode) return;
  setSelectLoading(yearSelect, "Carregando anos...");
  try {
    const years = await fipeService.getYears(vehicleType, brandCode, modelCode);
    fillSelect(yearSelect, years, "Escolha o ano");
    if (years[0]) yearSelect.value = years[0].codigo;
  } catch (error) {
    setSelectLoading(yearSelect, "API indisponível");
    fipeStatus.textContent = `Não foi possível carregar anos FIPE agora. ${error.message}`;
  }
}

async function loadSelectedFipeVehicle(vehicleKey) {
  const vehicleType = getFipeElement(vehicleKey, "vehicleType").value;
  const brandCode = getFipeElement(vehicleKey, "brand").value;
  const modelCode = getFipeElement(vehicleKey, "model").value;
  const yearCode = getFipeElement(vehicleKey, "year").value;
  if (!brandCode || !modelCode || !yearCode) {
    fipeStatus.textContent = "Selecione marca, modelo e ano antes de buscar a FIPE.";
    return;
  }
  try {
    const result = await fipeService.getVehicle(vehicleType, brandCode, modelCode, yearCode);
    const priceField = form.elements.namedItem(vehicleKey === "ev" ? "evPrice" : "icePrice");
    priceField.value = result.valorNumerico.toFixed(2);
    const profile = vehicleKey === "ev" ? state.depreciationProfiles.electric : state.depreciationProfiles.combustion;
    const history = await fipeService.getVehicleHistory({ vehicleType, brandCode, modelCode, yearCode, currentValue: result.valorNumerico, profile });
    state.fipeSelections[vehicleKey] = { label: `${result.Marca} ${result.Modelo}`, value: result.valorNumerico, month: result.MesReferencia, history, estimatedDepreciation: fipeService.estimateDepreciation(history) };
    fipeStatus.textContent = `${state.fipeSelections.ev.label ? `Elétrico sincronizado em ${formatCurrency(state.fipeSelections.ev.value)}. ` : ""}${state.fipeSelections.ice.label ? `Combustão sincronizado em ${formatCurrency(state.fipeSelections.ice.value)}.` : ""}`;
    runCalculation();
  } catch (error) {
    fipeStatus.textContent = `Falha ao consultar FIPE: ${error.message}`;
  }
}

function getFormValues() {
  return Object.fromEntries(new FormData(form).entries());
}

function runCalculation() {
  const values = getFormValues();
  const result = calculateScenario({ rawValues: values, ipvaRates: state.ipvaRates, fipeSelections: state.fipeSelections });
  const sensitivity = buildSensitivityScenario(result.baseInputs, { fuelIncreasePct: Number(values.fuelIncrease || 0), energyIncreasePct: Number(values.energyIncrease || 0), kmVariationPct: Number(values.kmVariation || 0) });
  renderSummary(result);
  if (state.charts) {
    updateCharts(state.charts, { ...result, sensitivity, fipeSelections: state.fipeSelections });
  }
}

function renderSummary(result) {
  kpis.savings.textContent = formatCurrency(result.horizons[10].difference);
  kpis.payback.textContent = result.paybackYears ? `${formatNumber(result.paybackYears, 1)} anos` : "Sem payback";
  kpis.breakEven.textContent = result.breakEvenYear ? `Ano ${formatNumber(result.breakEvenYear, 1)}` : "Não atingido";
  kpis.roi.textContent = `${formatNumber(result.roiPercent, 1)}%`;
  kpis.co2.textContent = `${formatNumber(result.co2AvoidedKg10y, 0)} kg`;
  kpis.ipva.textContent = `${formatCurrency(result.annualBreakdown.ev.ipva)} vs ${formatCurrency(result.annualBreakdown.ice.ipva)}`;
  tableBody.innerHTML = "";
  [1, 5, 10].forEach((year) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${year} ano${year > 1 ? "s" : ""}</td><td>${formatCurrency(result.horizons[year].ev)}</td><td>${formatCurrency(result.horizons[year].ice)}</td><td class="${result.horizons[year].difference >= 0 ? "positive" : "negative"}">${formatCurrency(result.horizons[year].difference)}</td>`;
    tableBody.appendChild(row);
  });
  renderVerdict(result);
}

function getFipeElement(vehicleKey, field) {
  return document.querySelector(`[data-fipe='${field}'][data-vehicle='${vehicleKey}']`);
}

function setSelectLoading(select, text) {
  select.innerHTML = `<option value="">${text}</option>`;
}

function fillSelect(select, items, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.codigo;
    option.textContent = item.nome;
    select.appendChild(option);
  });
}

function renderVerdict(result) {
  const difference10y = result.horizons[10].difference;
  const evWins = difference10y > 0;
  const tie = Math.abs(difference10y) < 1;

  if (tie) {
    verdict.badge.textContent = "Empate técnico";
    verdict.headline.textContent = "Os dois carros empatam no horizonte de 10 anos.";
    verdict.body.textContent = "Nesse cenário, a decisão depende mais de preferência de uso, recarga, conforto e perfil de manutenção do que de custo total.";
    return;
  }

  if (evWins) {
    verdict.badge.textContent = "Vencedor: Elétrico";
    verdict.headline.textContent = `O carro elétrico vence por ${formatCurrency(difference10y)} em 10 anos.`;
    verdict.body.textContent = result.breakEvenYear
      ? `Mesmo com investimento inicial maior, ele recupera a diferença até o ano ${formatNumber(result.breakEvenYear, 1)} e depois amplia a economia com energia, manutenção e emissões menores.`
      : "Ele já fecha o horizonte analisado com custo total inferior, sustentado principalmente por energia e manutenção mais baratas.";
    return;
  }

  verdict.badge.textContent = "Vencedor: Combustão";
  verdict.headline.textContent = `O carro a combustão vence por ${formatCurrency(Math.abs(difference10y))} em 10 anos.`;
  verdict.body.textContent = result.breakEvenYear
    ? `Apesar de existir ponto de equilíbrio ao longo da curva, o cenário final ainda favorece a combustão por causa do investimento inicial e dos custos assumidos nesta simulação.`
    : "No cenário atual, o elétrico não recupera o investimento inicial dentro de 10 anos, então o carro a combustão mantém o menor custo total.";
}

function syncThemeButton() {
  const isLight = htmlRoot.classList.contains("light");
  themeToggle.setAttribute("aria-pressed", String(isLight));
}

bootstrap();
