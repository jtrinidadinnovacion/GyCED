import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DatosExamenService {
  plantel = '';
  docente = '';
  fecha = '';
  grupo = '';
  tipo: string | null = null;
  modoRelacion: string | null = null;
}
