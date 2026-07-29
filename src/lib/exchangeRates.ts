import { ExchangeRate } from "@/models/ExchangeRate";
import { CURRENCIES, type Currency, type RateTable } from "@/lib/currency";

export type { RateTable } from "@/lib/currency";
export { convertAmount } from "@/lib/currency";

const BASE: Currency = "USD";
const REFRESH_MS = 60 * 60 * 1000; // 1 hora

// Se usan solo si open.er-api.com falla Y todavía no hay ninguna tasa
// cacheada en Mongo — mejor una conversión aproximada que romper la página.
const FALLBACK_RATES: RateTable = {
  USD: 1,
  ARS: 1000,
  UYU: 40,
  EUR: 0.92,
  BRL: 5.4,
};

async function fetchLiveRates(): Promise<RateTable | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${BASE}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.result !== "success" || !data.rates) return null;

    const rates: Partial<RateTable> = {};
    for (const c of CURRENCIES) {
      if (typeof data.rates[c] === "number") rates[c] = data.rates[c];
    }
    if (Object.keys(rates).length !== CURRENCIES.length) return null;

    return rates as RateTable;
  } catch {
    return null;
  }
}

/**
 * Tasas de cambio respecto a USD, cacheadas en Mongo (se refrescan solas
 * cada 1h para no golpear la API externa en cada visita al catálogo). Si
 * open.er-api.com no responde, se usa la última tasa cacheada o, en su
 * defecto, un valor aproximado fijo.
 */
export async function getExchangeRates(): Promise<RateTable> {
  const cached = await ExchangeRate.findOne({ base: BASE }).lean();
  const isStale = !cached || Date.now() - new Date(cached.fetchedAt).getTime() > REFRESH_MS;

  if (cached && !isStale) return cached.rates as RateTable;

  const fresh = await fetchLiveRates();
  if (fresh) {
    await ExchangeRate.findOneAndUpdate(
      { base: BASE },
      { rates: fresh, fetchedAt: new Date() },
      { upsert: true }
    );
    return fresh;
  }

  return (cached?.rates as RateTable | undefined) ?? FALLBACK_RATES;
}
