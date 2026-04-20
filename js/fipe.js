const API_BASE = "https://parallelum.com.br/fipe/api/v1";

export function createFipeService() {
  async function request(path) {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error("Resposta inválida da API FIPE.");
    return response.json();
  }

  return {
    getBrands(vehicleType) {
      return request(`/${vehicleType}/marcas`);
    },
    getModels(vehicleType, brandCode) {
      return request(`/${vehicleType}/marcas/${brandCode}/modelos`);
    },
    getYears(vehicleType, brandCode, modelCode) {
      return request(`/${vehicleType}/marcas/${brandCode}/modelos/${modelCode}/anos`);
    },
    async getVehicle(vehicleType, brandCode, modelCode, yearCode) {
      const payload = await request(`/${vehicleType}/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`);
      return { ...payload, valorNumerico: parseFipeCurrency(payload.Valor) };
    },
    async getVehicleHistory({ vehicleType, brandCode, modelCode, yearCode, currentValue, profile }) {
      try {
        const references = await request("/referencias");
        const recentReferences = references.slice(0, 6);
        const history = await Promise.all(recentReferences.map(async (reference, index) => {
          try {
            const payload = await request(`/${vehicleType}/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}?tabela_referencia=${reference.codigo}`);
            return { label: reference.mes, value: parseFipeCurrency(payload.Valor) };
          } catch {
            const decayFactor = 1 - ((profile?.monthly ?? 0.0065) * index);
            return { label: reference.mes, value: currentValue / Math.max(decayFactor, 0.75) };
          }
        }));
        return history.reverse();
      } catch {
        return buildSyntheticHistory(currentValue, profile);
      }
    },
    estimateDepreciation(history) {
      if (!history?.length) return 0;
      const initial = history[0].value;
      const last = history[history.length - 1].value;
      return initial > 0 ? ((initial - last) / initial) * 100 : 0;
    }
  };
}

function parseFipeCurrency(value) {
  return Number(String(value).replace(/[R$\s.]/g, "").replace(",", ".")) || 0;
}

function buildSyntheticHistory(currentValue, profile) {
  const monthlyDecay = profile?.monthly ?? 0.007;
  return ["-5m", "-4m", "-3m", "-2m", "-1m", "Atual"].map((label, index, labels) => {
    const monthsAgo = labels.length - index - 1;
    return { label, value: currentValue / Math.pow(1 - monthlyDecay, monthsAgo) };
  });
}
