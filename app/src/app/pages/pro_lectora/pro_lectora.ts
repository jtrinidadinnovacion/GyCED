import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';
import { ExamenesService } from '../../core/examenes.service';

interface Respuesta {
  texto: string;
  correcta: boolean;
}

interface Pregunta {
  texto: string;
  respuestas: Respuesta[];
}

function crearRespuestasIniciales(): Respuesta[] {
  return [
    { texto: '', correcta: false },
    { texto: '', correcta: false },
    { texto: '', correcta: false },
  ];
}

@Component({
  selector: 'app-pro-lectora',
  imports: [CommonModule, FormsModule, VentanaControles],
  templateUrl: './pro_lectora.html',
  styleUrls: ['./pro_lectora.css', '../../shared/responsive.css'],
})
export class ProLectora {
  tituloExamen = '';
  instrucciones = '';

  lectura = '';
  lecturaBorrador = '';
  mostrarModalLectura = false;

  preguntas: Pregunta[] = [{ texto: '', respuestas: crearRespuestasIniciales() }];
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

  get respuestasActuales(): Respuesta[] {
    return this.preguntas[this.indiceActual].respuestas;
  }

  abrirModalLectura() {
    this.lecturaBorrador = this.lectura;
    this.mostrarModalLectura = true;
  }

  cerrarModalLectura() {
    this.mostrarModalLectura = false;
  }

  guardarLectura() {
    this.lectura = this.lecturaBorrador;
    this.mostrarModalLectura = false;
  }

  seleccionarPregunta(index: number) {
    this.indiceActual = index;
  }

  agregarPregunta() {
    this.preguntas.push({ texto: '', respuestas: crearRespuestasIniciales() });
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
      this.preguntas.push({ texto: '', respuestas: crearRespuestasIniciales() });
    }

    if (this.indiceActual >= this.preguntas.length) {
      this.indiceActual = this.preguntas.length - 1;
    }

    this.cdr.detectChanges();
  }

  agregarRespuesta() {
    this.respuestasActuales.push({ texto: '', correcta: false });
  }

  async quitarRespuesta(index: number) {
    const resultado = await Swal.fire({
      title: 'Eliminar respuesta',
      html: '¿Seguro que quieres eliminar esta respuesta?',
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

    this.respuestasActuales.splice(index, 1);
    this.cdr.detectChanges();
  }

  marcarCorrecta(index: number) {
    this.respuestasActuales.forEach((respuesta, i) => {
      respuesta.correcta = i === index;
    });
  }

  async generarExamen() {
    const titulo = this.tituloExamen || 'Examen';

    this.datos.tituloExamen = titulo;
    this.datos.instrucciones = this.instrucciones;
    this.datos.lecturaExamen = this.lectura;
    this.datos.paresExamen = [];
    this.datos.preguntasExamen = this.preguntas.map((pregunta, i) => ({
      numero: i + 1,
      texto: pregunta.texto,
      tipo: 'opciones',
      opciones: pregunta.respuestas.map((respuesta) => ({
        texto: respuesta.texto,
        correcta: respuesta.correcta,
      })),
      respuestasEspacios: [],
    }));

    const instruccionesGuardadas = [this.lectura ? `Lectura:\n${this.lectura}` : '', this.instrucciones]
      .filter(Boolean)
      .join('\n\n');

    const guardado = await this.examenesService.guardarSiHayExamen(this.datos.examenId, {
      titulo,
      instrucciones: instruccionesGuardadas || null,
      nombrePlantel: this.datos.plantel,
      nombreDocente: this.datos.docente,
      fechaEvaluacion: this.datos.fecha,
      grupo: this.datos.grupo,
      preguntas: this.preguntas.map((pregunta) => ({
        tipo: 'opcion_multiple',
        texto: pregunta.texto,
        respuestas: pregunta.respuestas.map((respuesta) => ({
          texto: respuesta.texto,
          esCorrecta: respuesta.correcta,
        })),
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
