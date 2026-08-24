import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';

interface OpcionGenerar {
  id: string;
  texto: string;
}

@Component({
  selector: 'app-gen-examen',
  imports: [CommonModule, VentanaControles],
  templateUrl: './gen_examen.html',
  styleUrls: ['./gen_examen.css', '../../shared/responsive.css'],
})
export class GenExamen {
  opciones: OpcionGenerar[] = [
    { id: 'previsualizar', texto: 'Previsualizar examen' },
    { id: 'alumno', texto: 'Generar examen para alumno' },
    { id: 'solucionario', texto: 'Solucionario' },
  ];

  seleccionada = 'previsualizar';
  mostrarPreview = false;
  imprimiendo = false;
  mostrarRespuestas = false;

  constructor(public datos: DatosExamenService) {
    window.addEventListener('afterprint', () => {
      this.imprimiendo = false;
    });
  }

  seleccionar(id: string) {
    this.seleccionada = id;

    if (id === 'previsualizar') {
      this.mostrarRespuestas = false;
      this.mostrarPreview = true;
      return;
    }

    if (id === 'alumno') {
      this.mostrarRespuestas = false;
      this.imprimir(`${this.datos.tituloExamen || 'examen'}.pdf`);
      return;
    }

    if (id === 'solucionario') {
      this.mostrarRespuestas = true;
      this.imprimir(`${this.datos.tituloExamen || 'examen'} - solucionario.pdf`);
    }
  }

  cerrarPreview() {
    this.mostrarPreview = false;
  }

  letra(indice: number): string {
    return String.fromCharCode(65 + indice);
  }

  private imprimir(nombreArchivo: string) {
    this.imprimiendo = true;

    setTimeout(async () => {
      if (window.electronAPI?.generarPdf) {
        await window.electronAPI.generarPdf({ nombreArchivo });
      } else {
        window.print();
      }

      this.imprimiendo = false;
    }, 0);
  }
}
