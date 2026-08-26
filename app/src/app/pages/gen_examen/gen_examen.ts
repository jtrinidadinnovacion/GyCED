import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  QueryList,
  Renderer2,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VentanaControles } from '../../shared/ventana-controles/ventana-controles';
import { DatosExamenService, ParExamen, PreguntaExamen } from '../../core/datos-examen.service';

interface OpcionGenerar {
  id: string;
  texto: string;
  icono: string;
}

interface PaginaExamen {
  primera: boolean;
  ultima: boolean;
  preguntas: PreguntaExamen[];
  pares: ParExamen[];
}

interface DimensionesHoja {
  width: number;
  height: number;
}

// Tamaño carta (8.5in x 11in) a 96px/in, la misma equivalencia que usa
// Chromium para imprimir a PDF, así la vista previa y la descarga coinciden.
const DIMENSIONES_CARTA: DimensionesHoja = { width: 816, height: 1056 };

const RESPIRO_CONTINUACION = 36;

// Colchón de seguridad puramente visual para la paginación EN PANTALLA
// (la vista previa). Ya no protege la impresión real: el PDF se imprime en
// un flujo continuo y es Chromium quien decide los saltos de página de
// forma nativa, sin usar este cálculo. Por eso se mantiene pequeño -- así
// la cantidad de preguntas por página en la vista previa se acerca más a lo
// que realmente cabe al imprimir, en vez de quedarse corta por exceso de
// margen.
const MARGEN_SEGURIDAD = 12;

@Component({
  selector: 'app-gen-examen',
  imports: [CommonModule, VentanaControles],
  templateUrl: './gen_examen.html',
  styleUrls: ['./gen_examen.css', '../../shared/responsive.css'],
})
export class GenExamen implements AfterViewInit, OnDestroy {
  opciones: OpcionGenerar[] = [
    { id: 'previsualizar', texto: 'Previsualizar examen', icono: 'img_previ' },
    { id: 'alumno', texto: 'Generar examen para alumno', icono: 'img_generar' },
    { id: 'solucionario', texto: 'Solucionario', icono: 'img_solu' },
  ];

  seleccionada = 'previsualizar';
  mostrarPreview = false;
  imprimiendo = false;
  mostrarRespuestas = false;

  paginas: PaginaExamen[] = [];
  escala = 1;

  @ViewChild('previewHost', { static: true }) previewHostRef!: ElementRef<HTMLElement>;
  @ViewChild('medidor') medidorRef?: ElementRef<HTMLDivElement>;
  @ViewChild('medEncabezado') medEncabezadoRef?: ElementRef<HTMLElement>;
  @ViewChild('medIntro') medIntroRef?: ElementRef<HTMLElement>;
  @ViewChild('medTitulo') medTituloRef?: ElementRef<HTMLElement>;
  @ViewChild('medLectura') medLecturaRef?: ElementRef<HTMLElement>;
  @ViewChild('medPie') medPieRef?: ElementRef<HTMLElement>;
  @ViewChildren('medItem') medItemsRef?: QueryList<ElementRef<HTMLElement>>;

  constructor(
    public datos: DatosExamenService,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
  ) {
    window.addEventListener('afterprint', () => {
      this.imprimiendo = false;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    this.recalcularEscala();
    // El lienzo raíz de la app se escala con transform, lo que convierte a
    // cualquier descendiente `position: fixed` en relativo a ese lienzo en
    // vez del viewport real. Sacamos la vista previa al <body> para que
    // cubra toda la ventana sin dejar ver el fondo (con su degradado
    // asimétrico) en los costados cuando la ventana no tiene la proporción
    // 1280x720 del lienzo.
    this.renderer.appendChild(document.body, this.previewHostRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.previewHostRef?.nativeElement.remove();
  }

  @HostListener('window:resize')
  onResize() {
    this.recalcularEscala();
  }

  get dimensionesHoja(): DimensionesHoja {
    return DIMENSIONES_CARTA;
  }

  seleccionar(id: string) {
    // Evita solicitudes de impresión superpuestas: mientras una PDF está en
    // camino (incluye el tiempo que el usuario tarda en confirmar el
    // diálogo de guardado), otro clic aquí mutaría `mostrarRespuestas` sobre
    // el mismo DOM que esa impresión en curso todavía podría estar
    // capturando, mezclando el contenido de un examen con el del otro.
    if (this.imprimiendo && id !== 'previsualizar') return;

    this.seleccionada = id;

    if (id === 'previsualizar') {
      this.mostrarRespuestas = false;
      this.mostrarPreview = true;
      this.actualizarPaginacion();
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
    this.actualizarPaginacion();

    setTimeout(async () => {
      try {
        if (window.electronAPI?.generarPdf) {
          await window.electronAPI.generarPdf({ nombreArchivo });
        } else {
          window.print();
        }
      } finally {
        this.imprimiendo = false;
        // Sin esto, el cambio de `imprimiendo` no siempre dispara una
        // re-renderización automática aquí, dejando los botones con el
        // atributo `disabled` nativo puesto para siempre — y un botón
        // deshabilitado no genera eventos de clic, así que quedarían
        // bloqueados sin forma de reintentarlo.
        this.cdr.detectChanges();
      }
    }, 0);
  }

  private actualizarPaginacion() {
    // Primer detectChanges: renderiza el medidor oculto con los datos actuales
    // para poder medir alturas reales de cada bloque.
    this.cdr.detectChanges();
    this.recalcularPaginas();
    this.recalcularEscala();
    // Segundo detectChanges: refleja en la vista las páginas ya calculadas.
    this.cdr.detectChanges();
  }

  private medirBloque(el: HTMLElement): number {
    const cs = getComputedStyle(el);
    return el.offsetHeight + parseFloat(cs.marginTop || '0') + parseFloat(cs.marginBottom || '0');
  }

  private recalcularEscala() {
    const anchoDisponible = window.innerWidth * 0.9;
    this.escala = Math.min(1, anchoDisponible / this.dimensionesHoja.width);
  }

  private recalcularPaginas() {
    const medidor = this.medidorRef?.nativeElement;
    const alturaPagina = this.dimensionesHoja.height;

    if (!medidor) {
      this.paginas = [{ primera: true, ultima: true, preguntas: [], pares: [] }];
      return;
    }

    const paddingBottom = parseFloat(getComputedStyle(medidor).paddingBottom) || 0;

    const alturaEncabezadoFijo =
      (this.medEncabezadoRef ? this.medirBloque(this.medEncabezadoRef.nativeElement) : 0) +
      (this.medIntroRef ? this.medirBloque(this.medIntroRef.nativeElement) : 0) +
      (this.medTituloRef ? this.medirBloque(this.medTituloRef.nativeElement) : 0) +
      (this.medLecturaRef ? this.medirBloque(this.medLecturaRef.nativeElement) : 0);

    const alturaPie = this.medPieRef ? this.medirBloque(this.medPieRef.nativeElement) : 0;

    const disponiblePrimera = alturaPagina - paddingBottom - alturaEncabezadoFijo - MARGEN_SEGURIDAD;
    const disponibleContinuacion = alturaPagina - paddingBottom - RESPIRO_CONTINUACION - MARGEN_SEGURIDAD;

    const esRelacion = this.datos.paresExamen.length > 0;
    const fuente: Array<PreguntaExamen | ParExamen> = esRelacion ? this.datos.paresExamen : this.datos.preguntasExamen;
    const alturas = (this.medItemsRef?.toArray() ?? []).map((ref) => this.medirBloque(ref.nativeElement));

    interface PaginaTmp {
      primera: boolean;
      items: Array<PreguntaExamen | ParExamen>;
      usada: number;
      disponible: number;
    }

    const paginas: PaginaTmp[] = [];
    let indice = 0;
    let primera = true;

    if (fuente.length === 0) {
      paginas.push({ primera: true, items: [], usada: 0, disponible: disponiblePrimera });
    }

    while (indice < fuente.length) {
      const disponible = primera ? disponiblePrimera : disponibleContinuacion;
      const paginaActual: PaginaTmp = { primera, items: [], usada: 0, disponible };

      while (indice < fuente.length) {
        const alturaItem = alturas[indice] ?? 0;
        if (paginaActual.items.length > 0 && paginaActual.usada + alturaItem > disponible) break;
        paginaActual.usada += alturaItem;
        paginaActual.items.push(fuente[indice]);
        indice += 1;
      }

      paginas.push(paginaActual);
      primera = false;
    }

    const ultima = paginas[paginas.length - 1];
    if (ultima.disponible - ultima.usada < alturaPie) {
      paginas.push({ primera: false, items: [], usada: 0, disponible: disponibleContinuacion });
    }

    this.paginas = paginas.map((p, i) => ({
      primera: p.primera,
      ultima: i === paginas.length - 1,
      preguntas: esRelacion ? [] : (p.items as PreguntaExamen[]),
      pares: esRelacion ? (p.items as ParExamen[]) : [],
    }));
  }
}
