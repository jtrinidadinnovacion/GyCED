import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';
import { ExamenesService } from '../../core/examenes.service';

interface TipoRelacion {
  modo: string;
  titulo: string;
  etiqueta: string;
}

@Component({
  selector: 'app-ingresa-datos',
  imports: [CommonModule, FormsModule, VentanaControles],
  templateUrl: './ingresa-datos.html',
  styleUrls: ['./ingresa-datos.css', '../../shared/responsive.css'],
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

  guardando = false;

  constructor(
    public datos: DatosExamenService,
    private router: Router,
    private examenesService: ExamenesService,
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

  bloquearTecla(event: KeyboardEvent, permiteNumeros: boolean) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length !== 1) return;

    const patron = permiteNumeros ? /^[a-zA-Z0-9À-ÿ\s]$/ : /^[a-zA-ZÀ-ÿ\s]$/;
    if (!patron.test(event.key)) {
      event.preventDefault();
    }
  }

  sanitizarPlantel() {
    this.datos.plantel = this.datos.plantel.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').slice(0, 100);
  }

  sanitizarDocente() {
    this.datos.docente = this.datos.docente.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').slice(0, 100);
  }

  async continuar() {
    if (!this.tipoSeleccionado) return;

    if (!this.datos.plantel.trim() || !this.datos.docente.trim() || !this.datos.fecha || !this.datos.grupo.trim()) {
      await Swal.fire({
        title: 'Faltan datos',
        html: 'Completa el nombre del plantel, nombre del docente, fecha y grupo antes de continuar.',
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
      return;
    }

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

    if (!(await this.guardarEnBaseDeDatos())) return;

    this.router.navigate([ruta]);
  }

  private async guardarEnBaseDeDatos(): Promise<boolean> {
    if (!window.electronAPI?.crearExamen) return true;

    this.guardando = true;

    try {
      const { id } = await this.examenesService.crearExamen({
        titulo: 'Nuevo examen',
        nombrePlantel: this.datos.plantel,
        nombreDocente: this.datos.docente,
        fechaEvaluacion: this.datos.fecha,
        grupo: this.datos.grupo,
        preguntas: [],
      });

      this.datos.examenId = id;
      return true;
    } catch (error) {
      await Swal.fire({
        title: 'No se pudo guardar',
        html: 'Ocurrió un error al guardar los datos en la base de datos. Intenta de nuevo.',
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
      return false;
    } finally {
      this.guardando = false;
    }
  }
}
