/**
 * Utilitário de geolocalização e carimbo temporal oficial para operações de campo em Angola.
 */

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  formattedCoordinates: string;
  source: 'gps' | 'fallback';
  weatherSuggestion: {
    period: 'Manhã' | 'Tarde' | 'Noite';
    condition: 'Céu Limpo' | 'Parcialmente Nublado' | 'Nublado' | 'Chuva Fraca';
    temperatureApprox: number;
  };
}

/**
 * Obtém a posição geográfica atual do dispositivo via navegador ou fallback aproximado
 */
export async function getBrowserLocation(timeoutMs = 7000): Promise<GeoLocationResult> {
  const now = new Date();
  const hour = now.getHours();
  
  // Sugestão meteorológica baseada no turno diário de Luanda / Angola
  let period: 'Manhã' | 'Tarde' | 'Noite' = 'Manhã';
  if (hour >= 12 && hour < 18) period = 'Tarde';
  else if (hour >= 18 || hour < 6) period = 'Noite';

  const defaultWeather = {
    period,
    condition: 'Céu Limpo' as const,
    temperatureApprox: period === 'Tarde' ? 31 : 26
  };

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({
        latitude: -8.8383,
        longitude: 13.2344,
        accuracy: 100,
        timestamp: now,
        formattedCoordinates: '8°50\'18"S 13°14\'04"E (Luanda Padrão)',
        source: 'fallback',
        weatherSuggestion: defaultWeather
      });
      return;
    }

    const timer = setTimeout(() => {
      resolve({
        latitude: -8.8383,
        longitude: 13.2344,
        accuracy: 100,
        timestamp: now,
        formattedCoordinates: '8°50\'18"S 13°14\'04"E (Timeout GPS - Luanda)',
        source: 'fallback',
        weatherSuggestion: defaultWeather
      });
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const latRef = lat >= 0 ? 'N' : 'S';
        const lngRef = lng >= 0 ? 'E' : 'W';
        const formatted = `${Math.abs(lat).toFixed(5)}°${latRef}, ${Math.abs(lng).toFixed(5)}°${lngRef} (±${Math.round(pos.coords.accuracy)}m)`;

        resolve({
          latitude: lat,
          longitude: lng,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp || Date.now()),
          formattedCoordinates: formatted,
          source: 'gps',
          weatherSuggestion: defaultWeather
        });
      },
      (err) => {
        clearTimeout(timer);
        console.warn('Geolocalização não permitida ou indisponível:', err.message);
        resolve({
          latitude: -8.8383,
          longitude: 13.2344,
          accuracy: 100,
          timestamp: now,
          formattedCoordinates: '8°50\'18"S 13°14\'04"E (Luanda)',
          source: 'fallback',
          weatherSuggestion: defaultWeather
        });
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000
      }
    );
  });
}
