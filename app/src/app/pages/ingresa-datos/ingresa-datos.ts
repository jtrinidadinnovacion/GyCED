import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService } from '../../core/datos-examen.service';
import { ExamenesService } from '../../core/examenes.service';

@Component({
  selector: 'app-ingresa-datos',
  imports: [CommonModule, FormsModule, VentanaControles],
  templateUrl: './ingresa-datos.html',
  styleUrls: ['./ingresa-datos.css', '../../shared/responsive.css'],
})
export class IngresaDatos {
  guardando = false;

  constructor(
    public datos: DatosExamenService,
    private router: Router,
    private examenesService: ExamenesService,
  ) {}

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

    if (!(await this.guardarEnBaseDeDatos())) return;

    this.router.navigate(['/preguntas-inicio']);
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
