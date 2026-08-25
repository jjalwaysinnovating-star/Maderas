import type { Env } from "../env";
import type { NichePack } from "./types";
import { generico } from "./generico";
import { restaurante } from "./restaurante";
import { inmobiliaria } from "./inmobiliaria";
import { barberia } from "./barberia";
import { salon } from "./salon";
import { dentista } from "./dentista";
import { gimnasio } from "./gimnasio";
import { coach } from "./coach";
import { tienda } from "./tienda";
import { panaderia } from "./panaderia";
import { crm } from "./crm";
import { hoteleria } from "./hoteleria";
import { cafeteria } from "./cafeteria";
import { clinica } from "./clinica";
import { spa } from "./spa";

export type { NichePack, NicheColumn } from "./types";

// Registro de packs. Agregar un nicho = importar su archivo y sumarlo aquí.
const PACKS: Record<string, NichePack> = {
  generico,
  restaurante,
  inmobiliaria,
  barberia,
  salon,
  dentista,
  gimnasio,
  coach,
  tienda,
  panaderia,
  crm,
  hoteleria,
  cafeteria,
  clinica,
  spa,
};

/** Resuelve el pack activo desde BOT_NICHE. Nicho ausente/desconocido → genérico. */
export function getNiche(env: Env): NichePack {
  const id = (env.BOT_NICHE ?? "").trim().toLowerCase();
  return PACKS[id] ?? generico;
}

/**
 * Todos los packs registrados. Existe para que el test pueda barrer los 15 y
 * verificar que cada etiqueta (`*Key`) sí está en los 4 diccionarios — un pack
 * con una clave inventada pintaría "nicho.x.nav" crudo en el panel.
 */
export const ALL_NICHES: readonly NichePack[] = Object.values(PACKS);

/** Todas las claves de interfaz de un pack, en un array (para tests/auditoría). */
export function nicheLabelKeys(pack: NichePack): string[] {
  return [
    pack.recordSingularKey,
    pack.recordPluralKey,
    pack.navLabelKey,
    pack.kpiLabelKey,
    ...Object.values(pack.statusLabelKeys),
    ...pack.columns.map((c) => c.labelKey),
  ];
}
