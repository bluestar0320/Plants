import * as Location from 'expo-location';

export interface WeatherInfo {
  temperatureC: number;
  precipitationMm: number;
  isRaining: boolean;
  isFrostRisk: boolean;
  isHeatRisk: boolean;
  fetchedAt: string; // ISO datetime
}

const FROST_THRESHOLD_C = 2;
const HEAT_THRESHOLD_C = 33;

export const requestLocationPermission = async (): Promise<boolean> => {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
};

export const fetchCurrentWeather = async (): Promise<WeatherInfo> => {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.LocationAccuracy.Low,
  });
  const { latitude, longitude } = position.coords;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`날씨 정보를 가져오지 못했어요. (HTTP ${response.status})`);
  }
  const json = await response.json();
  const temperatureC: number = json?.current?.temperature_2m ?? 0;
  const precipitationMm: number = json?.current?.precipitation ?? 0;

  return {
    temperatureC,
    precipitationMm,
    isRaining: precipitationMm > 0,
    isFrostRisk: temperatureC <= FROST_THRESHOLD_C,
    isHeatRisk: temperatureC >= HEAT_THRESHOLD_C,
    fetchedAt: new Date().toISOString(),
  };
};
