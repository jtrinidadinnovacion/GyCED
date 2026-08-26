import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';
import { ExamenesService } from '../../core/examenes.service';

interface Item {
  texto: string;
  archivoNombre: string | null;
  archivoUrl: string | null;
}

interface Par {
  pregunta: Item;
  respuesta: Item;
}

function crearItem(): Item {
  return { texto: '', archivoNombre: null, archivoUrl: null };
}

function crearPar(): Par {
  return { pregunta: crearItem(), respuesta: crearItem() };
}

@Component({
  selector: 'app-relacionar',
  imports: [CommonModule, FormsModule, VentanaControles],
  templateUrl: './relacionar.html',
  styleUrls: ['./relacionar.css', '../../shared/responsive.css'],
})
export class Relacionar {
  tituloExamen = '';
  instrucciones = '';

  pares: Par[] = [crearPar()];

  constructor(
    public datos: DatosExamenService,
    private cdr: ChangeDetectorRef,
    private examenesService: ExamenesService,
    public router: Router,
  ) {
    this.tituloExamen = this.datos.tituloExamen || '';
    this.instrucciones = this.datos.instrucciones || '';
  }

  get modo(): string {
    return this.datos.modoRelacion || 'texto-texto';
  }

  get preguntaEsTexto(): boolean {
    return this.modo !== 'imagen-imagen';
  }

  get respuestaEsTexto(): boolean {
    return this.modo === 'texto-texto';
  }

  agregarPar() {
    this.pares.push(crearPar());
  }

  async quitarPar(index: number) {
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

    this.pares.splice(index, 1);

    if (this.pares.length === 0) {
      this.pares.push(crearPar());
    }

    this.cdr.detectChanges();
  }

  onArchivo(event: Event, item: Item) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    item.archivoNombre = archivo.name;
    item.archivoUrl = URL.createObjectURL(archivo);
  }

  quitarImagen(item: Item, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (item.archivoUrl) {
      URL.revokeObjectURL(item.archivoUrl);
    }

    item.archivoNombre = null;
    item.archivoUrl = null;
  }

  private textoItem(item: Item): string {
    return item.texto || item.archivoNombre || '';
  }

  async generarExamen() {
    const titulo = this.tituloExamen || 'Examen';

    this.datos.tituloExamen = titulo;
    this.datos.instrucciones = this.instrucciones;
    this.datos.lecturaExamen = '';
    this.datos.preguntasExamen = [];
    this.datos.paresExamen = this.pares.map((par, i) => ({
      numero: i + 1,
      pregunta: this.textoItem(par.pregunta),
      respuesta: this.textoItem(par.respuesta),
    }));

    const guardado = await this.examenesService.guardarSiHayExamen(this.datos.examenId, {
      titulo,
      instrucciones: this.instrucciones || null,
      nombrePlantel: this.datos.plantel,
      nombreDocente: this.datos.docente,
      fechaEvaluacion: this.datos.fecha,
      grupo: this.datos.grupo,
      preguntas: this.pares.map((par) => ({
        tipo: 'relacionar_imagen',
        texto: this.textoItem(par.pregunta),
        respuestas: [{ texto: this.textoItem(par.respuesta), esCorrecta: true }],
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
