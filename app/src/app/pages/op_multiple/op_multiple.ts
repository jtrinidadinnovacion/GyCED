import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';

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
  selector: 'app-op-multiple',
  imports: [CommonModule, FormsModule, VentanaControles],
  templateUrl: './op_multiple.html',
  styleUrl: './op_multiple.css',
})
export class OpMultiple {
  tituloExamen = '';
  instrucciones = '';

  preguntas: Pregunta[] = [{ texto: '', respuestas: crearRespuestasIniciales() }];
  indiceActual = 0;

  constructor(
    public datos: DatosExamenService,
    private cdr: ChangeDetectorRef,
  ) {}

  get respuestasActuales(): Respuesta[] {
    return this.preguntas[this.indiceActual].respuestas;
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
}
