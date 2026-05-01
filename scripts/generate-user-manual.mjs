import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'docs', 'manual')
const ASSETS_DIR = path.join(OUT_DIR, 'assets')
const HTML_PATH = path.join(OUT_DIR, 'manual-usuario.html')
const PDF_PATH = path.join(OUT_DIR, 'manual-usuario-v2.pdf')
const TEMP_PDF_PATH = path.join(os.tmpdir(), `manual-usuario-${Date.now()}.pdf`)
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const APP_URL = 'http://127.0.0.1:4173'
const API_BASE = 'https://catalogo-web-708265049038.us-central1.run.app'

const loginLogoSvg = await fs.readFile(path.join(ROOT, 'public', 'petalops-logo.svg'), 'utf8')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function createFakeToken() {
  const header = { alg: 'none', typ: 'JWT' }
  const payload = {
    sub: 'manual-user',
    email: 'manual@petalops.com',
    tenantSlug: 'petalops',
    empresaID: 1,
    logoUrl: '/petalops-logo.svg',
    exp: 2000000000,
  }
  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.manual`
}

function svgDataUri(label, startColor, endColor) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" rx="36" fill="url(#g)"/>
      <circle cx="320" cy="210" r="74" fill="rgba(255,255,255,0.28)"/>
      <g fill="rgba(255,255,255,0.85)">
        <ellipse cx="320" cy="124" rx="24" ry="44"/>
        <ellipse cx="320" cy="296" rx="24" ry="44"/>
        <ellipse cx="234" cy="210" rx="44" ry="24"/>
        <ellipse cx="406" cy="210" rx="44" ry="24"/>
        <ellipse cx="262" cy="152" rx="22" ry="40" transform="rotate(-45 262 152)"/>
        <ellipse cx="378" cy="268" rx="22" ry="40" transform="rotate(-45 378 268)"/>
        <ellipse cx="378" cy="152" rx="22" ry="40" transform="rotate(45 378 152)"/>
        <ellipse cx="262" cy="268" rx="22" ry="40" transform="rotate(45 262 268)"/>
      </g>
      <text x="50%" y="410" text-anchor="middle" font-size="40" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.95)" font-weight="700">${escapeHtml(label)}</text>
    </svg>
  `
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const categories = [
  { idCategoria: 1, nombre: 'Personalizado' },
  { idCategoria: 2, nombre: 'Flora Box' },
  { idCategoria: 3, nombre: 'Corazones' },
  { idCategoria: 4, nombre: 'Bodas' },
]

const products = [
  {
    id: 101,
    nombre: 'Arreglo Personalizado',
    precio: 0,
    estado: 'activo',
    categoriaID: 1,
    categoria: 'Personalizado',
    descripcion: 'Producto adaptable para ocasiones especiales.',
    codigo_producto: 'PERS-101',
    image_url: svgDataUri('Personalizado', '#d4477a', '#f7a7c3'),
  },
  {
    id: 102,
    nombre: 'Flora Box Rosas',
    precio: 185000,
    estado: 'activo',
    categoriaID: 2,
    categoria: 'Flora Box',
    descripcion: 'Caja floral con presentación premium.',
    codigo_producto: 'BOX-102',
    image_url: svgDataUri('Flora Box', '#e57399', '#f9d5e5'),
  },
  {
    id: 103,
    nombre: 'Corazones Deluxe',
    precio: 240000,
    estado: 'inactivo',
    categoriaID: 3,
    categoria: 'Corazones',
    descripcion: 'Arreglo romántico para fechas especiales.',
    codigo_producto: 'COR-103',
    image_url: svgDataUri('Corazones', '#c94d5f', '#f2b6be'),
  },
  {
    id: 104,
    nombre: 'Boda Premium',
    precio: 420000,
    estado: 'activo',
    categoriaID: 4,
    categoria: 'Bodas',
    descripcion: 'Montaje elegante para ceremonias y eventos.',
    codigo_producto: 'BOD-104',
    image_url: svgDataUri('Bodas', '#b36b8f', '#efd3e2'),
  },
]

const productLogoSvg = loginLogoSvg
const fakeToken = createFakeToken()

async function ensureDirs() {
  await fs.mkdir(ASSETS_DIR, { recursive: true })
  await fs.copyFile(path.join(ROOT, 'public', 'petalops-logo.svg'), path.join(ASSETS_DIR, 'petalops-logo.svg'))
}

async function writeFile(relPath, contents) {
  const abs = path.join(OUT_DIR, relPath)
  await fs.writeFile(abs, contents, 'utf8')
}

function buildManualHtml(images) {
  const card = (title, description, image, caption, bullets = []) => `
    <section class="step-card">
      <div class="step-card__meta">
        <p class="step-card__eyebrow">${escapeHtml(title)}</p>
        <h2>${escapeHtml(title)}</h2>
        <p class="step-card__description">${escapeHtml(description)}</p>
        ${
          bullets.length
            ? `<ul class="step-card__bullets">${bullets
                .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
                .join('')}</ul>`
            : ''
        }
      </div>
      <figure class="shot">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>
    </section>
  `

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Manual de usuario - Petalops</title>
  <style>
    :root {
      --bg: #fff7fb;
      --surface: rgba(255, 255, 255, 0.92);
      --surface-strong: #ffffff;
      --border: rgba(212, 71, 122, 0.14);
      --ink: #1f2937;
      --muted: #667085;
      --accent: #d4477a;
      --accent-soft: #fbeaf0;
      --shadow: 0 20px 45px rgba(58, 31, 43, 0.1);
      --radius: 26px;
      --radius-sm: 18px;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: linear-gradient(180deg, #fffafc, #fbeff4 55%, #f7ecf1); color: var(--ink); }
    body { font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif; line-height: 1.5; }
    img { max-width: 100%; display: block; }
    a { color: inherit; }
    .page {
      max-width: 1120px;
      margin: 0 auto;
      padding: 28px 22px 36px;
    }
    .hero {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 18px;
      align-items: center;
      padding: 24px;
      background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,248,251,0.94));
      border: 1px solid var(--border);
      border-radius: 30px;
      box-shadow: var(--shadow);
      margin-bottom: 20px;
    }
    .hero__logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      background: #fff;
      border-radius: 20px;
      padding: 8px;
      border: 1px solid rgba(212, 71, 122, 0.12);
    }
    .hero__eyebrow {
      margin: 0 0 6px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 12px;
      font-weight: 800;
    }
    .hero h1 {
      margin: 0;
      font-size: clamp(2rem, 3vw, 2.85rem);
      line-height: 1.05;
    }
    .hero p {
      margin: 10px 0 0;
      color: var(--muted);
      max-width: 75ch;
    }
    .toc {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }
    .toc__item {
      padding: 16px 18px;
      border-radius: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: 0 10px 26px rgba(58, 31, 43, 0.06);
    }
    .toc__item strong {
      display: block;
      margin-bottom: 6px;
      color: var(--accent);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .toc__item span {
      color: var(--muted);
      font-size: 14px;
    }
    .section-title {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      margin: 28px 0 14px;
    }
    .section-title h2 {
      margin: 0;
      font-size: 1.55rem;
    }
    .section-title p {
      margin: 0;
      color: var(--muted);
      max-width: 58ch;
      text-align: right;
    }
    .step-card {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(380px, 1.1fr);
      gap: 18px;
      align-items: start;
      padding: 18px;
      border-radius: 28px;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: var(--shadow);
      margin-bottom: 18px;
      break-inside: avoid;
    }
    .step-card__meta {
      padding: 10px 8px 10px 4px;
    }
    .step-card__eyebrow {
      margin: 0 0 8px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 12px;
      font-weight: 800;
    }
    .step-card h2 {
      margin: 0;
      font-size: 1.45rem;
    }
    .step-card__description {
      margin: 10px 0 0;
      color: var(--muted);
    }
    .step-card__bullets {
      margin: 12px 0 0;
      padding-left: 18px;
      color: #3f4b5b;
    }
    .step-card__bullets li + li { margin-top: 6px; }
    .shot {
      margin: 0;
      padding: 14px;
      border-radius: 22px;
      background: linear-gradient(180deg, #ffffff, #fff8fb);
      border: 1px solid rgba(212, 71, 122, 0.12);
    }
    .shot img {
      width: 100%;
      height: auto;
      border-radius: 16px;
      box-shadow: 0 16px 36px rgba(58, 31, 43, 0.16);
    }
    .shot figcaption {
      margin-top: 10px;
      font-size: 13px;
      color: var(--muted);
    }
    .note {
      padding: 18px 20px;
      border-radius: 22px;
      border: 1px solid rgba(212, 71, 122, 0.14);
      background: linear-gradient(180deg, #fff, #fff7fb);
      margin: 16px 0 0;
    }
    .note strong {
      display: block;
      margin-bottom: 6px;
      color: var(--accent);
    }
    .footer {
      margin-top: 24px;
      padding: 16px 4px 0;
      color: var(--muted);
      font-size: 13px;
      text-align: center;
    }
    .page-break { break-before: page; }
    @page {
      size: A4;
      margin: 14mm;
    }
    @media print {
      body { background: #fff; }
      .page { padding: 0; }
      .hero, .toc, .step-card, .note { box-shadow: none; }
      .step-card { break-inside: avoid; }
      .page-break { break-before: page; }
    }
    @media (max-width: 960px) {
      .hero, .step-card { grid-template-columns: 1fr; }
      .toc { grid-template-columns: 1fr; }
      .section-title { flex-direction: column; align-items: start; }
      .section-title p { text-align: left; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <img class="hero__logo" src="${escapeHtml(images.logo)}" alt="Petalops" />
      <div>
        <p class="hero__eyebrow">Manual de usuario</p>
        <h1>Petalops Admin</h1>
        <p>
          Este manual resume el uso principal de la aplicación de administración: iniciar sesión,
          revisar el catálogo, editar categorías y mantener actualizados los productos.
        </p>
      </div>
    </section>

    <section class="toc" aria-label="Resumen del manual">
      <div class="toc__item">
        <strong>1. Acceso</strong>
        <span>Ingresa con tu correo, contraseña y tienda.</span>
      </div>
      <div class="toc__item">
        <strong>2. Vista principal</strong>
        <span>Consulta filtros, categorías y productos desde una sola pantalla.</span>
      </div>
      <div class="toc__item">
        <strong>3. Categorías</strong>
        <span>Abre la lista, busca una categoría y cámbiale el nombre.</span>
      </div>
      <div class="toc__item">
        <strong>4. Nuevo producto</strong>
        <span>Crea productos desde el flujo visual de subida y vista previa.</span>
      </div>
      <div class="toc__item">
        <strong>5. Productos</strong>
        <span>Explora por categoría y edita cada producto sin perder contexto.</span>
      </div>
    </section>

    <section>
      <div class="section-title">
        <h2>Uso básico de la aplicación</h2>
        <p>Las capturas reflejan la interfaz actual para que el equipo pueda seguir el flujo real.</p>
      </div>

      ${card(
        '1. Acceso al sistema',
        'La pantalla de inicio concentra el acceso a la tienda. Aquí se ingresan el correo, la contraseña y la información del tenant para entrar al panel.',
        images.login,
        'Pantalla de ingreso al sistema.',
        ['Verifica que el correo sea el correcto.', 'La tienda se resuelve según el token y el slug registrados.'],
      )}

      ${card(
        '2. Vista principal',
        'Después de iniciar sesión, la pantalla principal reúne filtros, panel de categorías y el catálogo de productos en acordeones para cargar más rápido.',
        images.overview,
        'Vista principal del panel de administración.',
        ['Los bloques de categorías y productos arrancan plegados.', 'Puedes usar los filtros superiores para acotar la búsqueda.'],
      )}

      ${card(
        '3. Gestionar categorías',
        'Abre la sección de categorías para verlas en una lista más limpia. Desde ahí puedes buscar por nombre o ID y editar el nombre sin crear una categoría nueva.',
        images.categories,
        'Listado de categorías con búsqueda y botón de edición.',
        ['La categoría Personalizado admite precio 0.', 'El panel arranca cerrado para mantener la pantalla ligera.'],
      )}

      ${card(
        '4. Crear un nuevo producto',
        'Desde la pantalla de productos puedes cambiar a Nuevo producto y empezar a cargar imágenes. El flujo muestra vista previa, campos de edición y el botón de guardado al final.',
        images.newProduct,
        'Pantalla para crear productos desde una vista previa visual.',
        ['Arrastra o suelta imágenes para comenzar.', 'Puedes volver a la lista principal cuando quieras.'],
      )}

      ${card(
        '5. Editar una categoría',
        'Al pulsar Editar se abre un formulario más limpio y cómodo. Solo debes escribir el nuevo nombre y guardar los cambios.',
        images.categoryModal,
        'Modal uniforme para crear o editar categorías.',
        ['El botón Guardar se activa solo cuando el nombre es válido.', 'Si el backend responde error, el modal se mantiene abierto.'],
      )}

      <div class="page-break"></div>

      ${card(
        '6. Revisar productos por categoría',
        'Los productos están agrupados por categoría para evitar que la página intente renderizar todo al mismo tiempo. Abre solo la categoría que quieras revisar.',
        images.products,
        'Catálogo organizado por categorías.',
        ['Cada grupo muestra cuántos productos tiene.', 'Esto ayuda a que la pantalla cargue con menos peso visual.'],
      )}

      ${card(
        '7. Editar un producto',
        'Cada tarjeta de producto tiene acceso directo a edición, eliminación y cambio de estado. Desde el modal puedes actualizar precio, nombre, categoría, imagen y descripción.',
        images.productModal,
        'Modal de edición de producto con diseño uniforme.',
        ['Guarda los cambios desde un formulario más limpio y consistente.', 'Si usas la categoría Personalizado, el precio 0 está permitido.'],
      )}
    </section>

    <section class="note">
      <strong>Recomendación de uso</strong>
      <div>
        Si la pantalla se siente pesada, deja plegadas las secciones que no estás usando. El catálogo
        está organizado justamente para que el panel siga respondiendo rápido aun con muchos productos.
      </div>
    </section>

    <div class="footer">
      Manual generado con capturas actuales de Petalops Admin.
    </div>
  </main>
</body>
</html>`
}

async function captureScreenshots() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  })

  try {
    const loginContext = await browser.newContext({
      viewport: { width: 1600, height: 1200 },
    })

    const loginPage = await loginContext.newPage()
    await loginPage.goto(`${APP_URL}/login`, { waitUntil: 'networkidle' })
    await loginPage.screenshot({ path: path.join(ASSETS_DIR, '01-login.png'), fullPage: true })
    await loginContext.close()

    const context = await browser.newContext({
      viewport: { width: 1600, height: 1280 },
      storageState: undefined,
    })

    await context.addInitScript(
      (token) => {
        localStorage.setItem('petalops.auth.token', token)
        localStorage.setItem('slug', 'petalops')
      },
      fakeToken,
    )

    await context.route('**/*', async (route) => {
      const request = route.request()
      const url = request.url()
      const method = request.method()

      if (
        url.includes('PetalOps+Logo.png') ||
        url.includes('PetalOps%20Logo.png') ||
        url.endsWith('/logo.png')
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body: productLogoSvg,
        })
        return
      }

      if (!url.startsWith(API_BASE)) {
        await route.continue()
        return
      }

      const parsed = new URL(url)
      const { pathname } = parsed

      if (pathname === '/auth/login' && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: fakeToken,
          }),
        })
        return
      }

      if (method === 'GET' && (pathname.startsWith('/categorias') || pathname.startsWith('/categories'))) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(categories),
        })
        return
      }

      if (method === 'GET' && pathname.startsWith('/admin/productos')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(products),
        })
        return
      }

      if (method === 'PATCH' || method === 'PUT' || method === 'POST' || method === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        })
        return
      }

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Endpoint no simulado en el manual.' }),
      })
    })

    const page = await context.newPage()
    await page.emulateMedia({ media: 'screen' })
    await page.goto(`${APP_URL}/products`, { waitUntil: 'networkidle' })

    await page.screenshot({
      path: path.join(ASSETS_DIR, '02-vista-principal.png'),
      fullPage: true,
    })

    await page.getByRole('button', { name: /\+ Nuevo producto/i }).click()
    await page.locator('.pf-shell').waitFor({ state: 'visible' })
    await page.screenshot({
      path: path.join(ASSETS_DIR, '03-nuevo-producto.png'),
      fullPage: true,
    })

    await page.getByRole('button', { name: 'Volver' }).click()
    await page.locator('.pp-category-panel__toggle').waitFor({ state: 'visible' })

    await page.locator('.pp-category-panel__toggle').click()
    await page.locator('.pp-category-row').first().waitFor()
    await page.screenshot({
      path: path.join(ASSETS_DIR, '04-categorias.png'),
      fullPage: true,
    })

    await page.locator('.pp-category-row__button').first().click()
    await page.locator('.pcf-dialog').waitFor({ state: 'visible' })
    await page.screenshot({
      path: path.join(ASSETS_DIR, '05-editar-categoria.png'),
      fullPage: true,
    })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)

    await page.locator('.pp-products-accordion__toggle').click()
    await page.locator('.pp-product-group__header').first().click()
    await page.locator('.pp-product-card--catalog').first().waitFor()
    await page.screenshot({
      path: path.join(ASSETS_DIR, '06-productos.png'),
      fullPage: true,
    })

    await page.locator('.pp-product-card--catalog').first().getByRole('button', { name: 'Editar' }).click()
    await page.locator('.pp-modal-card--edit').waitFor({ state: 'visible' })
    await page.screenshot({
      path: path.join(ASSETS_DIR, '07-editar-producto.png'),
      fullPage: true,
    })

    await context.close()
  } finally {
    await browser.close()
  }
}

await ensureDirs()
await captureScreenshots()

const images = {
  logo: 'assets/petalops-logo.svg',
  login: 'assets/01-login.png',
  overview: 'assets/02-vista-principal.png',
  newProduct: 'assets/03-nuevo-producto.png',
  categories: 'assets/04-categorias.png',
  categoryModal: 'assets/05-editar-categoria.png',
  products: 'assets/06-productos.png',
  productModal: 'assets/07-editar-producto.png',
}

await writeFile('manual-usuario.html', buildManualHtml(images))

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
})

try {
  const pdfContext = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
  })
  const pdfPage = await pdfContext.newPage()
  await pdfPage.goto(pathToFileURL(HTML_PATH).href, { waitUntil: 'networkidle' })
  await pdfPage.pdf({
    path: TEMP_PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '14mm',
      right: '14mm',
      bottom: '14mm',
      left: '14mm',
    },
  })
  await pdfContext.close()
} finally {
  await browser.close()
}

await fs.copyFile(TEMP_PDF_PATH, PDF_PATH)
await fs.unlink(TEMP_PDF_PATH).catch(() => undefined)

console.log(`Manual generado en:\n- ${HTML_PATH}\n- ${PDF_PATH}`)
