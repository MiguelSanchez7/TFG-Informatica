# Market Engine – Datos de mercado y preprocesado

Este módulo forma parte del TFG y se encarga de la **ingesta, limpieza y preparación de datos de mercado** que se utilizarán posteriormente para la generación de escenarios históricos y la toma de decisiones asistida por IA.

En el estado actual del proyecto, el motor cubre **desde la descarga de datos hasta la obtención de un dataset limpio y consistente**, listo para el cálculo de indicadores y simulaciones.

---

## Fuente de datos

Los datos de mercado se obtienen de **Yahoo Finance**, utilizando precios históricos diarios (*daily OHLCV*).

- Frecuencia: diaria (`1d`)
- Rango temporal: **2008-01-01 → 2025-12-31**
- Dataset congelado para garantizar reproducibilidad
- Activos: **30 acciones estadounidenses** de distintos sectores

---

## Estructura de datos

El pipeline de datos sigue una estructura clara y reproducible:


