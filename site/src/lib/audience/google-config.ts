/** Public tag identifiers only. Never serialize credentials into the page. */
export function googleMeasurementConfig(env: Readonly<Record<string, string | undefined>>) {
  const measurementId = env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const adsId = env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const label = env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
  return {
    measurementId: /^G-[A-Z0-9]{6,20}$/.test(measurementId ?? "") ? measurementId : null,
    adsId: /^AW-\d{6,15}$/.test(adsId ?? "") ? adsId : null,
    adsConversionLabel: /^[A-Za-z0-9_-]{10,80}$/.test(label ?? "") ? label : null,
  };
}
