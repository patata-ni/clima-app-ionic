# Clima (Ionic / Angular)

App del clima con **Ionic 9, Angular 22 y Capacitor 8**. Usa
[Open-Meteo](https://open-meteo.com/), que **no necesita clave de API**.

- Busca una ciudad por nombre o usa tu ubicación actual
  (`@capacitor/geolocation`).
- Muestra el clima actual: temperatura, sensación térmica, humedad y viento.
- Avisa cuando no hay conexión o la ciudad no se encuentra.

No es la misma app que [app-clima](https://github.com/patata-ni/app-clima): aquella
es de Wear OS (reloj), en Kotlin y con OpenWeather. Esta es multiplataforma
(web y Android con Capacitor) y no usa claves.

## Ejecutar

Requisitos: Node.js 22.22.3 o superior (o 24.15+), que es lo que exige Angular 22.

```bash
npm install
npm start
```

Abre http://localhost:4200. Para compilar: `npm run build`.

## Android

La carpeta [android](./android) es el proyecto nativo de Capacitor.

```bash
npm run build
npx cap sync android
npx cap open android
```

El identificador de la app (`appId`) sigue siendo el de la plantilla de Ionic
(`io.ionic.starter`); cámbialo en [capacitor.config.ts](./capacitor.config.ts)
antes de publicarla. Esta carpeta no incluye los archivos que genera Capacitor
(`assets/public`, `config.xml`); `npx cap sync` los crea. La compilación nativa de
Android no se ha probado en esta entrega, solo la versión web.

## Tecnologías

Ionic 9, Angular 22, Capacitor 8, Open-Meteo.
