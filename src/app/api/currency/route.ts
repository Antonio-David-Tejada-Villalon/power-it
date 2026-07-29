import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { currencyForCountry } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchangeRates";

/**
 * Moneda del visitante (según país, sin pedir permisos ni login) + tasas de
 * cambio vigentes. En Vercel, `x-vercel-ip-country` viene puesta por la
 * plataforma en cada request; en local no existe, así que se puede simular
 * con la variable de entorno DEV_GEO_COUNTRY (ej. "AR") para probar.
 */
export async function GET(request: NextRequest) {
  await connectDB();

  const country = request.headers.get("x-vercel-ip-country") ?? process.env.DEV_GEO_COUNTRY ?? null;
  const currency = currencyForCountry(country);
  const rates = await getExchangeRates();

  return NextResponse.json({ currency, country, rates });
}
