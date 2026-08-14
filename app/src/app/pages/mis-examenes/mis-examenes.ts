import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';

@Component({
  selector: 'app-mis-examenes',
  imports: [VentanaControles],
  templateUrl: './mis-examenes.html',
  styleUrl: './mis-examenes.css',
})
export class MisExamenes {
  constructor(private router: Router) {}

  nuevoExamen() {
    this.router.navigate(['/ingresa-datos']);
  }
}
