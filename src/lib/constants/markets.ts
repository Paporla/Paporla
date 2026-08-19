export const MARKET_IDS = {
  CL: '10000000-0000-4000-8000-000000000001',
  AR: '10000000-0000-4000-8000-000000000002',
  CO: '10000000-0000-4000-8000-000000000003',
} as const

export const DEFAULT_MARKET = {
  id: MARKET_IDS.CL,
  countryCode: 'CL',
  locale: 'es-CL',
  currencyCode: 'CLP',
} as const
