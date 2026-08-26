import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';
import { ExamenesService } from '../../core/examenes.service';

interface Pregunta {
  texto: string;
  respuestas: string[];
}

@Component({
  selector: 'app-rel-espacios',
  imports: [CommonModule, FormsModule, VentanaControles],
  templateUrl: './rel_espacios.html',
  styleUrls: ['./rel_espacios.css', '../../shared/responsive.css'],
})
export class RelEspacios {
  tituloExamen = '';
  instrucciones = '';

  preguntas: Pregunta[] = [{ texto: '', respuestas: [] }];
  indiceActual = 0;

  constructor(
    public datos: DatosExamenService,
    private cdr: ChangeDetectorRef,
    private examenesService: ExamenesService,
    public router: Router,
  ) {
    this.tituloExamen = this.datos.tituloExamen || '';
    this.instrucciones = this.datos.instrucciones || '';
  }

  get preguntaActual(): Pregunta {
    return this.preguntas[this.indiceActual];
  }

  get partesActuales(): string[] {
    return this.preguntaActual.texto.split('_');
  }

  seleccionarPregunta(index: number) {
    this.indiceActual = index;
  }

  agregarPregunta() {
    this.preguntas.push({ texto: '', respuestas: [] });
    this.indiceActual = this.preguntas.length - 1;
  }

  async quitarPregunta(index: number) {
    const resultado = await Swal.fire({
      title: 'Eliminar pregunta',
      html: '¿Seguro que quieres eliminar esta pregunta?',
      imageUrl: 'img/img_alerta.png',
      imageWidth: 90,
      showCancelButton: true,
      confirmButtonText: 'Borrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#7a54ff',
      cancelButtonColor: '#585e99',
      customClass: {
        popup: 'gyced-swal-popup',
        container: 'gyced-swal-container',
      },
      backdrop: 'rgba(255, 255, 255, 0.45)',
      reverseButtons: true,
      animation: false,
    });

    if (!resultado.isConfirmed) return;

    this.preguntas.splice(index, 1);

    if (this.preguntas.length === 0) {
      this.preguntas.push({ texto: '', respuestas: [] });
    }

    if (this.indiceActual >= this.preguntas.length) {
      this.indiceActual = this.preguntas.length - 1;
    }

    this.cdr.detectChanges();
  }

  sincronizarEspacios() {
    const espacios = this.partesActuales.length - 1;
    const respuestas = this.preguntaActual.respuestas;

    while (respuestas.length < espacios) respuestas.push('');
    while (respuestas.length > espacios) respuestas.pop();
  }

  async generarExamen() {
    const titulo = this.tituloExamen || 'Examen';

    this.datos.tituloExamen = titulo;
    this.datos.instrucciones = this.instrucciones;
    this.datos.lecturaExamen = '';
    this.datos.paresExamen = [];
    this.datos.preguntasExamen = this.preguntas.map((pregunta, i) => ({
      numero: i + 1,
      texto: pregunta.texto,
      tipo: 'espacios',
      opciones: [],
      respuestasEspacios: pregunta.respuestas,
    }));

    const guardado = await this.examenesService.guardarSiHayExamen(this.datos.examenId, {
      titulo,
      instrucciones: this.instrucciones || null,
      nombrePlantel: this.datos.plantel,
      nombreDocente: this.datos.docente,
      fechaEvaluacion: this.datos.fecha,
      grupo: this.datos.grupo,
      preguntas: this.preguntas.map((pregunta) => ({
        tipo: 'completar',
        texto: pregunta.texto,
        respuestas: pregunta.respuestas.map((texto) => ({ texto, esCorrecta: true })),
      })),
    });

    if (!guardado) {
      await Swal.fire({
        title: 'No se pudo guardar',
        html: 'Ocurrió un error al guardar los datos en la base de datos.',
        imageUrl: 'img/img_alerta.png',
        imageWidth: 90,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#7a54ff',
        customClass: {
          popup: 'gyced-swal-popup',
          container: 'gyced-swal-container',
        },
        backdrop: 'rgba(255, 255, 255, 0.45)',
        animation: false,
      });
    }

    this.router.navigate(['/generar-examen']);
  }
}
