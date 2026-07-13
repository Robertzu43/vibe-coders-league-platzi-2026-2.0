// Cliente del formulario de preventa. Vanilla TS, sin framework.
// El precio unitario viene del atributo data-precio del <form>, que Astro
// llena desde `PRECIO_COP` en ../data/product.ts — así el precio siempre
// queda sourced desde un único lugar.

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const MENSAJE_EXITO = '¡Reserva confirmada! 🎉 Te escribiremos al correo para coordinar el envío.';
const MENSAJE_ERROR_GENERICO = 'No pudimos procesar tu reserva. Intenta de nuevo en unos minutos.';

function clamp(valor: number, min: number, max: number): number {
  if (Number.isNaN(valor)) return min;
  return Math.min(max, Math.max(min, Math.round(valor)));
}

function iniciar(form: HTMLFormElement): void {
  const precioUnitario = Number(form.dataset.precio ?? '0');
  const cantidadInput = form.querySelector<HTMLInputElement>('#cantidad');
  const totalLine = form.querySelector<HTMLParagraphElement>('#total-line');
  const statusEl = form.querySelector<HTMLDivElement>('#form-status');
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  function actualizarTotal(): void {
    if (!cantidadInput || !totalLine) return;
    const cantidad = clamp(Number(cantidadInput.value), 1, 5);
    cantidadInput.value = String(cantidad);
    const total = COP.format(cantidad * precioUnitario);
    totalLine.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = `${cantidad} × ${total}`;
    totalLine.append('Total estimado: ', strong);
  }

  function mostrarEstado(mensaje: string, tipo: 'exito' | 'error' | ''): void {
    if (!statusEl) return;
    statusEl.textContent = mensaje;
    if (tipo) statusEl.setAttribute('data-tipo', tipo);
    else statusEl.removeAttribute('data-tipo');
  }

  cantidadInput?.addEventListener('input', actualizarTotal);
  cantidadInput?.addEventListener('change', actualizarTotal);
  actualizarTotal();

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarEstado('', '');

    const datos = new FormData(form);
    const payload = {
      nombre: String(datos.get('nombre') ?? ''),
      email: String(datos.get('email') ?? ''),
      ciudad: String(datos.get('ciudad') ?? ''),
      cantidad: Number(datos.get('cantidad')),
      molido: String(datos.get('molido') ?? ''),
      website: String(datos.get('website') ?? ''),
    };

    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch('/api/preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let cuerpo: { ok?: boolean; error?: string } = {};
      try {
        cuerpo = await res.json();
      } catch {
        cuerpo = {};
      }

      if (res.ok && cuerpo.ok) {
        mostrarEstado(MENSAJE_EXITO, 'exito');
        form.reset();
        actualizarTotal();
      } else {
        mostrarEstado(cuerpo.error || MENSAJE_ERROR_GENERICO, 'error');
      }
    } catch {
      mostrarEstado(MENSAJE_ERROR_GENERICO, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

const forms = document.querySelectorAll<HTMLFormElement>('#preorder-form');
forms.forEach(iniciar);
