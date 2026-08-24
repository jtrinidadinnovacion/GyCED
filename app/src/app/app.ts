import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';

const ANCHO_BASE = 1280;
const ALTO_BASE = 720;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('app');

  @ViewChild('viewport') viewport!: ElementRef<HTMLElement>;
  @ViewChild('escalador') escalador!: ElementRef<HTMLElement>;
  @ViewChild('fondoReal') fondoReal!: ElementRef<HTMLElement>;

  private observador?: ResizeObserver;
  private suscripcionRouter?: Subscription;

  constructor(private router: Router) {}

  ngAfterViewInit() {
    this.observador = new ResizeObserver(() => this.actualizarEscala());
    this.observador.observe(this.viewport.nativeElement);

    this.suscripcionRouter = this.router.events.subscribe((evento) => {
      if (evento instanceof NavigationEnd) {
        this.actualizarFondo(evento.urlAfterRedirects);
      }
    });

    this.actualizarFondo(this.router.url);
    this.actualizarEscala();
    requestAnimationFrame(() => this.actualizarEscala());
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    this.suscripcionRouter?.unsubscribe();
  }

  private actualizarFondo(url: string) {
    const esInicio = url === '/' || url === '';
    this.fondoReal.nativeElement.style.background = esInicio
      ? '#030233'
      : 'radial-gradient(circle at 0% 140%, rgba(71, 186, 222, 0.55) 0%, rgba(71, 186, 222, 0) 45%), radial-gradient(circle at 120% -50%, rgba(156, 98, 244, 0.5) 0%, rgba(156, 98, 244, 0) 45%), #e6e8f3';
  }

  @HostListener('window:resize')
  actualizarEscala() {
    if (!this.viewport || !this.escalador) return;

    const ancho = this.viewport.nativeElement.clientWidth || window.innerWidth;
    const alto = this.viewport.nativeElement.clientHeight || window.innerHeight;
    if (!ancho || !alto) return;

    const escala = Math.min(ancho / ANCHO_BASE, alto / ALTO_BASE);
    const el = this.escalador.nativeElement;

    el.style.transform = `scale(${escala})`;
    el.style.left = `${(ancho - ANCHO_BASE * escala) / 2}px`;
    el.style.top = `${(alto - ALTO_BASE * escala) / 2}px`;
  }
}
