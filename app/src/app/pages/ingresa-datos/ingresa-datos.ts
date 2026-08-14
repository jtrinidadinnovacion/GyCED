import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';

interface TipoRelacion {
  modo: string;
  titulo: string;
  etiqueta: string;
}

@Component({
  selector: 'app-ingresa-datos',
  imports: [CommonModule, FormsModule, VentanaControles],
  templateUrl: './ingresa-datos.html',
  styleUrl: './ingresa-datos.css',
})
export class IngresaDatos {
  tiposEvaluacion = [
    'Opción Múltiple',
    'Verdadero / Falso',
    'Preguntas Abiertas',
    'Rellenar los espacios en blanco',
    'Relacionar',
    'Comprensión Lectora',
  ];

  tiposRelacion: TipoRelacion[] = [
    { modo: 'texto-texto', titulo: 'Relacionar Texto - Texto', etiqueta: 'Relaciona con Texto' },
    { modo: 'imagen-imagen', titulo: 'Relacionar Imagen - Imagen', etiqueta: 'Relaciona con Imagen' },
    { modo: 'texto-imagen', titulo: 'Relacionar Texto - Imagen', etiqueta: 'Relaciona Texto - Imagen' },
  ];

  dropdownAbierto = false;
  mostrarModalRelacion = false;
  tipoSeleccionado: string | null = null;

  rutasPorTipo: Record<string, string> = {
    'Opción Múltiple': '/preguntas',
    'Preguntas Abiertas': '/preguntas-abiertas',
    'Verdadero / Falso': '/verdadero-falso',
    'Rellenar los espacios en blanco': '/rellenar-espacios',
    'Relaciona con Texto': '/relacionar',
    'Relaciona con Imagen': '/relacionar',
    'Relaciona Texto - Imagen': '/relacionar',
    'Comprensión Lectora': '/comprension-lectora',
  };

  constructor(
    public datos: DatosExamenService,
    private router: Router,
  ) {}

  toggleDropdown() {
    this.dropdownAbierto = !this.dropdownAbierto;
  }

  seleccionarTipo(tipo: string) {
    this.dropdownAbierto = false;

    if (tipo === 'Relacionar') {
      this.mostrarModalRelacion = true;
      return;
    }

    this.tipoSeleccionado = tipo;
  }

  elegirRelacion(tipo: TipoRelacion) {
    this.tipoSeleccionado = tipo.etiqueta;
    this.datos.modoRelacion = tipo.modo;
    this.mostrarModalRelacion = false;
  }

  async continuar() {
    if (!this.tipoSeleccionado) return;

    const resultado = await Swal.fire({
      title: '¡CUIDADO!',
      html: `Una vez seleccionado el tipo de evaluación no podrá cambiarlo,<br><br>¿Desea continuar con <strong>${this.tipoSeleccionado}</strong>?`,
      imageUrl: 'img/img_alerta.png',
      imageWidth: 90,
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
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

    const ruta = this.rutasPorTipo[this.tipoSeleccionado];
    if (!ruta) return;

    this.datos.tipo = this.tipoSeleccionado;
    this.router.navigate([ruta]);
  }
}
