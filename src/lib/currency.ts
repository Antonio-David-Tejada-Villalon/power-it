export const CURRENCIES = ["ARS", "USD", "UYU", "EUR", "BRL"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  ARS: "Peso argentino (ARS)",
  USD: "Dólar estadounidense (USD)",
  UYU: "Peso uruguayo (UYU)",
  EUR: "Euro (EUR)",
  BRL: "Real brasileño (BRL)",
};

// Afecta el separador de miles/decimales y el orden del símbolo, no la moneda en sí.
const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  ARS: "es-AR",
  USD: "en-US",
  UYU: "es-UY",
  EUR: "de-DE",
  BRL: "pt-BR",
};

export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const DEFAULT_CURRENCY: Currency = "USD";

// País (ISO 3166-1 alpha-2, el que manda Vercel en la cabecera
// x-vercel-ip-country) -> moneda local. Subconjunto de la eurozona con los
// países más comunes; el resto cae al default.
const COUNTRY_CURRENCY: Partial<Record<string, Currency>> = {
  AR: "ARS",
  US: "USD",
  UY: "UYU",
  BR: "BRL",
  ES: "EUR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  PT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  IE: "EUR",
  FI: "EUR",
  GR: "EUR",
};

export function currencyForCountry(countryCode: string | null | undefined): Currency {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? DEFAULT_CURRENCY;
}

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

export type RateTable = Record<Currency, number>;

/** `rates` son tasas respecto a una misma base (hoy USD) — ver getExchangeRates en exchangeRates.ts. */
export function convertAmount(amount: number, from: Currency, to: Currency, rates: RateTable): number {
  if (from === to) return amount;
  const amountInBase = amount / rates[from];
  return amountInBase * rates[to];
}
