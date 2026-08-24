import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';

@Component({
  selector: 'app-inicio',
  imports: [VentanaControles],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  constructor(private router: Router) {}

  crear() {
    this.router.navigate(['/mis-examenes']);
  }
}
