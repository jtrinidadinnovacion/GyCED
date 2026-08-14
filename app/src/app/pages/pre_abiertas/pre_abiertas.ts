import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';

interface Pregunta {
  texto: string;
}

@Component({
  selector: 'app-pre-abiertas',
  imports: [CommonModule, FormsModule, VentanaControles],
  templateUrl: './pre_abiertas.html',
  styleUrl: './pre_abiertas.css',
})
export class PreAbiertas {
  tituloExamen = '';
  instrucciones = '';

  preguntas: Pregunta[] = [{ texto: '' }, { texto: '' }];

  constructor(
    public datos: DatosExamenService,
    private cdr: ChangeDetectorRef,
  ) {}

  agregarPregunta() {
    this.preguntas.push({ texto: '' });
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
      this.preguntas.push({ texto: '' });
    }

    this.cdr.detectChanges();
  }
}
