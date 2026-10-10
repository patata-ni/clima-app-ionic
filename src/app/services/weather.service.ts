import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  time: string;
  units: { temperature: string; humidity: string; windSpeed: string };
}

export type WeatherErrorKind = 'offline' | 'invalid' | 'unavailable';

export interface Place {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export class WeatherError extends Error {
  constructor(public kind: WeatherErrorKind, message: string) {
    super(message);
  }
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const CURRENT_FIELDS =
  'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  constructor(private http: HttpClient) {}

  async searchPlaces(query: string): Promise<Place[]> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new WeatherError('offline', 'Sin conexión a internet.');
    }

    let res: any;
    try {
      res = await firstValueFrom(
        this.http.get(GEOCODING_ENDPOINT, {
          params: { name: query, count: 8, language: 'es', format: 'json' },
        })
      );
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (e.status === 0) {
          throw new WeatherError('offline', 'Sin conexión a internet.');
        }
        throw new WeatherError('unavailable', `El servicio no respondió correctamente (código ${e.status}).`);
      }
      throw new WeatherError('invalid', 'Respuesta inválida del servicio.');
    }

    // Open-Meteo omite "results" cuando no hay coincidencias.
    if (res?.results === undefined) return [];
    if (!Array.isArray(res.results)) {
      throw new WeatherError('invalid', 'La respuesta del servicio no tiene el formato esperado.');
    }
    return res.results
      .filter((r: any) => typeof r?.latitude === 'number' && typeof r?.longitude === 'number')
      .map((r: any) => ({
        name: r.name,
        admin1: r.admin1,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
      }));
  }

  async getCurrent(latitude: number, longitude: number): Promise<CurrentWeather> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new WeatherError('offline', 'Sin conexión a internet.');
    }

    let res: any;
    try {
      res = await firstValueFrom(
        this.http.get(ENDPOINT, {
          params: { latitude, longitude, current: CURRENT_FIELDS, timezone: 'auto' },
        })
      );
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (e.status === 0) {
          throw new WeatherError('offline', 'Sin conexión a internet.');
        }
        throw new WeatherError('unavailable', `El servicio no respondió correctamente (código ${e.status}).`);
      }
      throw new WeatherError('invalid', 'Respuesta inválida del servicio.');
    }

    const c = res?.current;
    const u = res?.current_units;
    const nums = [
      c?.temperature_2m,
      c?.apparent_temperature,
      c?.relative_humidity_2m,
      c?.wind_speed_10m,
      c?.weather_code,
    ];
    if (!c || nums.some((n) => typeof n !== 'number')) {
      throw new WeatherError('invalid', 'La respuesta del servicio no tiene el formato esperado.');
    }

    return {
      temperature: c.temperature_2m,
      apparentTemperature: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      weatherCode: c.weather_code,
      time: c.time,
      units: {
        temperature: u?.temperature_2m ?? '°C',
        humidity: u?.relative_humidity_2m ?? '%',
        windSpeed: u?.wind_speed_10m ?? 'km/h',
      },
    };
  }
}

export function describeWeatherCode(code: number): string {
  if (code === 0) return 'Despejado';
  if (code <= 3) return 'Parcialmente nublado';
  if (code <= 48) return 'Niebla';
  if (code <= 57) return 'Llovizna';
  if (code <= 67) return 'Lluvia';
  if (code <= 77) return 'Nieve';
  if (code <= 82) return 'Chubascos';
  if (code <= 86) return 'Chubascos de nieve';
  if (code >= 95) return 'Tormenta';
  return 'Desconocido';
}
