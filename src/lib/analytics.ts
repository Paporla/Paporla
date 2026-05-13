export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''

export const isAnalyticsEnabled = (): boolean => {
  return (
    process.env.NODE_ENV !== 'development' &&
    Boolean(GA_MEASUREMENT_ID) &&
    GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX'
  )
}