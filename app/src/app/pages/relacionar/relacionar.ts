import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';

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
  styleUrl: './relacionar.css',
})
export class Relacionar {
  tituloExamen = '';
  instrucciones = '';

  pares: Par[] = [crearPar()];

  constructor(
    public datos: DatosExamenService,
    private cdr: ChangeDetectorRef,
  ) {}

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
}
