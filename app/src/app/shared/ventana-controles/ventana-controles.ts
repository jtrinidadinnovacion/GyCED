import { Component, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-ventana-controles',
  imports: [CommonModule],
  templateUrl: './ventana-controles.html',
  styleUrl: './ventana-controles.css',
})
export class VentanaControles {
  @Input() mostrarRegresar = true;

  constructor(private location: Location) {}

  regresar() {
    this.location.back();
  }
}
