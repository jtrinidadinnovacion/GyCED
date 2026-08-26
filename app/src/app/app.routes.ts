import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { MisExamenes } from './pages/mis-examenes/mis-examenes';
import { IngresaDatos } from './pages/ingresa-datos/ingresa-datos';
import { PreguntasInicio } from './pages/preguntas-inicio/preguntas-inicio';
import { OpMultiple } from './pages/op_multiple/op_multiple';
import { PreAbiertas } from './pages/pre_abiertas/pre_abiertas';
import { VerFal } from './pages/ver_fal/ver_fal';
import { RelEspacios } from './pages/rel_espacios/rel_espacios';
import { Relacionar } from './pages/relacionar/relacionar';
import { ProLectora } from './pages/pro_lectora/pro_lectora';
import { GenExamen } from './pages/gen_examen/gen_examen';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'mis-examenes', component: MisExamenes },
  { path: 'ingresa-datos', component: IngresaDatos },
  { path: 'preguntas-inicio', component: PreguntasInicio },
  { path: 'preguntas', component: OpMultiple },
  { path: 'preguntas-abiertas', component: PreAbiertas },
  { path: 'verdadero-falso', component: VerFal },
  { path: 'rellenar-espacios', component: RelEspacios },
  { path: 'relacionar', component: Relacionar },
  { path: 'comprension-lectora', component: ProLectora },
  { path: 'generar-examen', component: GenExamen },
];
