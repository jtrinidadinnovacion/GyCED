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
  icono: string;
}

const RUTAS_POR_TIPO: Record<string, string> = {
  'Opción Múltiple': '/preguntas',
  'Preguntas Abiertas': '/preguntas-abiertas',
  'Verdadero / Falso': '/verdadero-falso',
  'Rellenar los espacios en blanco': '/rellenar-espacios',
  'Relaciona con Texto': '/relacionar',
  'Relaciona con Imagen': '/relacionar',
  'Relaciona Texto - Imagen': '/relacionar',
  'Comprensión Lectora': '/comprension-lectora',
};

@Component({
  selector: 'app-preguntas-inicio',
  imports: [CommonModule, FormsModule, VentanaControles],
  templateUrl: './preguntas-inicio.html',
  styleUrls: ['./preguntas-inicio.css', '../../shared/responsive.css'],
})
export class PreguntasInicio {
  tiposEvaluacion = [
    'Opción Múltiple',
    'Verdadero / Falso',
    'Preguntas Abiertas',
    'Rellenar los espacios en blanco',
    'Relacionar',
    'Comprensión Lectora',
  ];

  tiposRelacion: TipoRelacion[] = [
    { modo: 'texto-texto', titulo: 'Relacionar Texto - Texto', etiqueta: 'Relaciona con Texto', icono: 're_texto' },
    { modo: 'imagen-imagen', titulo: 'Relacionar Imagen - Imagen', etiqueta: 'Relaciona con Imagen', icono: 're_img' },
    { modo: 'texto-imagen', titulo: 'Relacionar Texto - Imagen', etiqueta: 'Relaciona Texto - Imagen', icono: 're_img_tex' },
  ];

  dropdownAbierto = false;
  mostrarModalRelacion = false;
  tipoSeleccionado: string | null = null;

  tituloExamen = '';
  instrucciones = '';

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

    this.confirmarYContinuar(tipo);
  }

  elegirRelacion(tipo: TipoRelacion) {
    this.datos.modoRelacion = tipo.modo;
    this.mostrarModalRelacion = false;
    this.confirmarYContinuar(tipo.etiqueta);
  }

  private async confirmarYContinuar(tipo: string) {
    const resultado = await Swal.fire({
      title: '¡CUIDADO!',
      html: `Una vez seleccionado el tipo de evaluación no podrá cambiarlo,<br><br>¿Desea continuar con <strong>${tipo}</strong>?`,
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

    const ruta = RUTAS_POR_TIPO[tipo];
    if (!ruta) return;

    this.datos.tituloExamen = this.tituloExamen;
    this.datos.instrucciones = this.instrucciones;
    this.datos.tipo = tipo;

    this.router.navigate([ruta]);
  }
}
