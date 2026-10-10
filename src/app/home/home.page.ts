import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  CurrentWeather,
  Place,
  WeatherError,
  WeatherService,
  describeWeatherCode,
} from '../services/weather.service';

type ViewState = 'loading' | 'success' | 'permission-denied' | 'offline' | 'error';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  state: ViewState = 'loading';
  weather?: CurrentWeather;
  latitude?: number;
  longitude?: number;
  errorMessage = '';
  selectedPlace?: Place;
  searchTerm = '';
  places: Place[] = [];
  searching = false;
  searchMessage = '';
  private searchSeq = 0;

  constructor(
    private weatherService: WeatherService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  get description(): string {
    return this.weather ? describeWeatherCode(this.weather.weatherCode) : '';
  }

  get placeLabel(): string {
    return this.selectedPlace ? this.formatPlace(this.selectedPlace) : 'Ubicación actual';
  }

  formatPlace(p: Place): string {
    return [p.name, p.admin1, p.country].filter(Boolean).join(', ');
  }

  async onSearch(event: any) {
    this.searchTerm = (event?.target?.value ?? '').trim();
    const seq = ++this.searchSeq;
    this.places = [];
    this.searchMessage = '';
    if (this.searchTerm.length < 2) {
      this.searching = false;
      this.cdr.markForCheck();
      return;
    }
    this.searching = true;
    this.cdr.markForCheck();
    try {
      const found = await this.weatherService.searchPlaces(this.searchTerm);
      if (seq !== this.searchSeq) return;
      this.places = found;
      if (!found.length) this.searchMessage = 'No se encontraron ubicaciones.';
    } catch (e: any) {
      if (seq !== this.searchSeq) return;
      this.searchMessage = e?.message ?? 'No se pudo buscar la ubicación.';
    }
    this.searching = false;
    this.cdr.markForCheck();
  }

  selectPlace(place: Place) {
    this.selectedPlace = place;
    this.clearSearch();
    this.load();
  }

  useCurrentLocation() {
    this.selectedPlace = undefined;
    this.clearSearch();
    this.load();
  }

  private clearSearch() {
    this.searchSeq++;
    this.searchTerm = '';
    this.places = [];
    this.searchMessage = '';
    this.searching = false;
  }

  async load() {
    this.state = 'loading';
    this.cdr.markForCheck();
    try {
      const coords = this.selectedPlace ?? (await this.getCoordinates());
      this.latitude = coords.latitude;
      this.longitude = coords.longitude;
      this.weather = await this.weatherService.getCurrent(coords.latitude, coords.longitude);
      this.state = 'success';
    } catch (e: any) {
      this.handleError(e);
    }
    // La app no usa zone.js, así que la vista debe notificarse a mano.
    this.cdr.markForCheck();
  }

  async refresh(event: any) {
    await this.load();
    event.target.complete();
  }

  private async getCoordinates() {
    if (Capacitor.isNativePlatform()) {
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== 'granted') {
        throw { permissionDenied: true };
      }
    }
    try {
      // El timeout nativo no corre mientras el navegador espera la respuesta al permiso.
      const pos = await Promise.race([
        Geolocation.getCurrentPosition({ timeout: 15000 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject({ code: 3, message: 'timeout' }), 20000)
        ),
      ]);
      return pos.coords;
    } catch (e: any) {
      if (e?.code === 1 || /denied/i.test(e?.message ?? '')) {
        throw { permissionDenied: true };
      }
      throw new WeatherError('unavailable', 'No se pudo obtener la ubicación. Revisa el permiso y reintenta.');
    }
  }

  private handleError(e: any) {
    if (e?.permissionDenied) {
      this.state = 'permission-denied';
      this.errorMessage = 'Permiso de ubicación rechazado.';
    } else if (e instanceof WeatherError && e.kind === 'offline') {
      this.state = 'offline';
      this.errorMessage = e.message;
    } else {
      this.state = 'error';
      this.errorMessage = e?.message ?? 'Ocurrió un error inesperado.';
    }
  }
}
