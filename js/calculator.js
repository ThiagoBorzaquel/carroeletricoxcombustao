const HORIZONS = [1, 5, 10];

export function calculateScenario({ rawValues, ipvaRates, fipeSelections }) {
  const baseInputs = normalizeInputs(rawValues, ipvaRates, fipeSelections);
  const annualBreakdown = buildAnnualBreakdown(baseInputs);
  const yearlySeries = buildYearlySeries(baseInputs, annualBreakdown);
  const horizons = buildHorizonSummary(yearlySeries);
  const breakEvenYear = findBreakEven(yearlySeries);
  const upfrontDifference = baseInputs.evPrice - baseInputs.icePrice;
  const roiPercent = upfrontDifference > 0
    ? ((horizons[10].difference - upfrontDifference) / upfrontDifference) * 100
    : (horizons[10].difference / Math.max(baseInputs.icePrice, 1)) * 100;

  return {
    baseInputs,
    annualBreakdown,
    yearlySeries,
    horizons,
    paybackYears: breakEvenYear,
    breakEvenYear,
    roiPercent,
    co2AvoidedKg10y: yearlySeries[9].cumulativeCo2AvoidedKg
  };
}

export function buildSensitivityScenario(baseInputs, context) {
  const simulatedInputs = {
    ...baseInputs,
    annualKm: baseInputs.annualKm * (1 + context.kmVariationPct / 100),
    fuelPrice: baseInputs.fuelPrice * (1 + context.fuelIncreasePct / 100),
    energyPrice: baseInputs.energyPrice * (1 + context.energyIncreasePct / 100)
  };
  const annualBreakdown = buildAnnualBreakdown(simulatedInputs);
  const yearlySeries = buildYearlySeries(simulatedInputs, annualBreakdown);

  return {
    annualBreakdown,
    yearlySeries,
    horizons: buildHorizonSummary(yearlySeries)
  };
}

function normalizeInputs(rawValues, ipvaRates, fipeSelections) {
  const stateCode = rawValues.state || "SP";
  const stateConfig = ipvaRates[stateCode];
  return {
    stateCode,
    annualKm: Number(rawValues.annualKm || 0),
    energyPrice: Number(rawValues.energyPrice || 0),
    fuelPrice: Number(rawValues.fuelPrice || 0),
    evEfficiency: Number(rawValues.evEfficiency || 0),
    iceEfficiency: Number(rawValues.iceEfficiency || 0),
    evInsurance: Number(rawValues.evInsurance || 0),
    iceInsurance: Number(rawValues.iceInsurance || 0),
    evMaintenance: Number(rawValues.evMaintenance || 0),
    iceMaintenance: Number(rawValues.iceMaintenance || 0),
    co2PerLiter: Number(rawValues.co2PerLiter || 0),
    co2PerKwh: Number(rawValues.co2PerKwh || 0),
    evPrice: Number(rawValues.evPrice || 0),
    icePrice: Number(rawValues.icePrice || 0),
    evIpvaRate: stateConfig?.evRate ?? 0,
    iceIpvaRate: stateConfig?.iceRate ?? 0.04,
    evFipe: fipeSelections.ev,
    iceFipe: fipeSelections.ice
  };
}

function buildAnnualBreakdown(inputs) {
  const evEnergy = inputs.evEfficiency > 0 ? (inputs.annualKm / inputs.evEfficiency) * inputs.energyPrice : 0;
  const iceFuel = inputs.iceEfficiency > 0 ? (inputs.annualKm / inputs.iceEfficiency) * inputs.fuelPrice : 0;
  const evIpva = inputs.evPrice * inputs.evIpvaRate;
  const iceIpva = inputs.icePrice * inputs.iceIpvaRate;

  return {
    ev: {
      energy: evEnergy,
      insurance: inputs.evInsurance,
      maintenance: inputs.evMaintenance,
      ipva: evIpva,
      annualTotal: evEnergy + inputs.evInsurance + inputs.evMaintenance + evIpva,
      annualCo2Kg: inputs.evEfficiency > 0 ? (inputs.annualKm / inputs.evEfficiency) * inputs.co2PerKwh : 0
    },
    ice: {
      fuel: iceFuel,
      insurance: inputs.iceInsurance,
      maintenance: inputs.iceMaintenance,
      ipva: iceIpva,
      annualTotal: iceFuel + inputs.iceInsurance + inputs.iceMaintenance + iceIpva,
      annualCo2Kg: inputs.iceEfficiency > 0 ? (inputs.annualKm / inputs.iceEfficiency) * inputs.co2PerLiter : 0
    }
  };
}

function buildYearlySeries(inputs, annualBreakdown) {
  const series = [];
  let evRunning = inputs.evPrice;
  let iceRunning = inputs.icePrice;
  let cumulativeCo2AvoidedKg = 0;

  for (let year = 1; year <= 10; year += 1) {
    evRunning += annualBreakdown.ev.annualTotal;
    iceRunning += annualBreakdown.ice.annualTotal;
    cumulativeCo2AvoidedKg += annualBreakdown.ice.annualCo2Kg - annualBreakdown.ev.annualCo2Kg;
    series.push({ year, evCumulative: evRunning, iceCumulative: iceRunning, difference: iceRunning - evRunning, cumulativeCo2AvoidedKg });
  }
  return series;
}

function buildHorizonSummary(series) {
  return HORIZONS.reduce((acc, horizon) => {
    const point = series[horizon - 1];
    acc[horizon] = { ev: point.evCumulative, ice: point.iceCumulative, difference: point.difference };
    return acc;
  }, {});
}

function findBreakEven(series) {
  const hit = series.find((point) => point.difference >= 0);
  return hit ? hit.year : null;
}

export function getDemoValues() {
  return {
    evPrice: 229900,
    icePrice: 154900,
    annualKm: 22000,
    energyPrice: 0.98,
    fuelPrice: 6.19,
    state: "SP",
    evEfficiency: 6.5,
    iceEfficiency: 10.9,
    evInsurance: 7200,
    iceInsurance: 6150,
    evMaintenance: 2100,
    iceMaintenance: 4650,
    co2PerLiter: 2.31,
    co2PerKwh: 0.08,
    fuelIncrease: 18,
    energyIncrease: 7,
    kmVariation: 12
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value || 0);
}

export function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value || 0);
}
