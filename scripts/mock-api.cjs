const http = require('http')
const { URL } = require('url')

const port = Number(process.env.MOCK_API_PORT || 8000)

let categorias = [
  { idCategoria: 1, nombre: 'Ramos', active: true, activo: true, estado: 'activo' },
  { idCategoria: 2, nombre: 'Arreglos', active: true, activo: true, estado: 'activo' },
  { idCategoria: 3, nombre: 'Personalizado', active: true, activo: true, estado: 'activo' },
]

let products = [
  {
    id: 101,
    productoID: 101,
    codigo_producto: 'PROD-0101',
    codigo_catalogo: 'CAT-001',
    nombre: 'Ramo primavera',
    precio: 145000,
    estado: 'activo',
    categoria_id: 1,
    categoria: 'Ramos',
    descripcion: 'Ramo surtido de temporada',
    imagen_url: '/petalops-logo.svg',
  },
  {
    id: 102,
    productoID: 102,
    codigo_producto: 'PROD-0102',
    codigo_catalogo: 'CAT-002',
    nombre: 'Arreglo especial',
    precio: 220000,
    estado: 'activo',
    categoria_id: 2,
    categoria: 'Arreglos',
    descripcion: 'Arreglo floral premium',
    imagen_url: '/petalops-logo.svg',
  },
]

function getCorsHeaders(req) {
  const origin = req.headers.origin || 'http://127.0.0.1:5500'
  const requestedHeaders =
    req.headers['access-control-request-headers'] ||
    'Accept, Content-Type, Authorization, X-Empresa-Id'

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': requestedHeaders,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '0',
    Vary: 'Origin',
  }
}

function sendJson(req, res, status, body) {
  res.writeHead(status, {
    ...getCorsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(body))
}

function sendNoContent(req, res) {
  res.writeHead(204, {
    ...getCorsHeaders(req),
  })
  res.end()
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      if (!data.trim()) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
  })
}

function base64Url(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function createMockJwt(email, slug) {
  const now = Math.floor(Date.now() / 1000)
  return [
    base64Url({ alg: 'none', typ: 'JWT' }),
    base64Url({
      sub: 'mock-user',
      email,
      tenantSlug: slug,
      empresaID: 3,
      empresaNombre: 'PetalOps Demo',
      exp: now + 60 * 60 * 8,
      iat: now,
    }),
    'mock-signature',
  ].join('.')
}

function getCategoryIdFromPayload(body) {
  const raw =
    body.categoriaID ??
    body.categoria_id ??
    body.category_id ??
    body.categoriaId ??
    body.categoryId ??
    body.categoria

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function attachCategory(product, categoriaID) {
  const category = categorias.find((item) => item.idCategoria === categoriaID)
  if (!category) return product

  return {
    ...product,
    categoria_id: category.idCategoria,
    categoriaID: category.idCategoria,
    category_id: category.idCategoria,
    categoria: category.nombre,
  }
}

function findProductIndex(pathname) {
  const match = pathname.match(/^\/admin\/productos\/(\d+)/)
  if (!match) return -1
  const id = Number(match[1])
  return products.findIndex((product) => Number(product.id) === id || Number(product.productoID) === id)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${port}`}`)
  const pathname = url.pathname.replace(/\/+$/, '') || '/'

  if (req.method === 'OPTIONS') {
    sendNoContent(req, res)
    return
  }

  if (req.method === 'POST' && pathname === '/auth/login') {
    const body = await parseBody(req)
    const email = typeof body.email === 'string' ? body.email : 'demo@petalops.local'
    const slug = typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : 'petalops'
    sendJson(req, res, 200, {
      access_token: createMockJwt(email, slug),
      refresh_token: 'mock-refresh-token',
      empresa_id: 3,
      empresa_slug: slug,
      empresa_nombre: 'PetalOps Demo',
      logo_url: '/petalops-logo.svg',
    })
    return
  }

  if (req.method === 'GET' && (pathname === '/categorias' || pathname === '/categories')) {
    sendJson(req, res, 200, { categorias })
    return
  }

  if (req.method === 'POST' && (pathname === '/categorias' || pathname === '/categories')) {
    const body = await parseBody(req)
    const nombre = String(body.nombre || body.name || '').trim()
    if (!nombre) {
      sendJson(req, res, 400, { detail: 'El nombre de la categoria es obligatorio.' })
      return
    }

    const next = {
      idCategoria: Math.max(0, ...categorias.map((item) => item.idCategoria)) + 1,
      nombre,
      active: true,
      activo: true,
      estado: 'activo',
    }
    categorias = [...categorias, next]
    sendJson(req, res, 201, next)
    return
  }

  const categoryMatch = pathname.match(/^\/categorias\/(\d+)(?:\/estado)?$/)
  if (categoryMatch && req.method === 'PATCH') {
    const id = Number(categoryMatch[1])
    const body = await parseBody(req)
    const index = categorias.findIndex((item) => item.idCategoria === id)
    if (index < 0) {
      sendJson(req, res, 404, { detail: 'Categoria no encontrada.' })
      return
    }

    const current = categorias[index]
    const nextActive =
      pathname.endsWith('/estado') && typeof (body.active ?? body.activo) === 'boolean'
        ? Boolean(body.active ?? body.activo)
        : current.active !== false
    const nextName = String(body.nombre || body.name || current.nombre).trim()
    const next = {
      ...current,
      nombre: nextName,
      active: nextActive,
      activo: nextActive,
      estado: nextActive ? 'activo' : 'inactivo',
    }
    categorias = categorias.map((item) => (item.idCategoria === id ? next : item))
    products = products.map((product) =>
      Number(product.categoria_id) === id ? { ...product, categoria: next.nombre } : product,
    )
    sendJson(req, res, 200, next)
    return
  }

  if (categoryMatch && req.method === 'DELETE') {
    const id = Number(categoryMatch[1])
    if (products.some((product) => Number(product.categoria_id) === id)) {
      sendJson(req, res, 409, { detail: 'La categoria tiene productos asociados.' })
      return
    }
    categorias = categorias.filter((item) => item.idCategoria !== id)
    sendNoContent(req, res)
    return
  }

  if (req.method === 'GET' && pathname === '/admin/productos') {
    sendJson(req, res, 200, { productos: products })
    return
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && pathname.match(/^\/admin\/productos\/\d+$/)) {
    const index = findProductIndex(pathname)
    if (index < 0) {
      sendJson(req, res, 404, { detail: 'Producto no encontrado.' })
      return
    }

    const body = await parseBody(req)
    let next = {
      ...products[index],
      nombre: typeof body.nombre === 'string' ? body.nombre : products[index].nombre,
      precio: Number.isFinite(Number(body.precio)) ? Number(body.precio) : products[index].precio,
      codigo_catalogo:
        typeof body.codigo_catalogo === 'string' ? body.codigo_catalogo : products[index].codigo_catalogo,
      descripcion: typeof body.descripcion === 'string' ? body.descripcion : products[index].descripcion,
    }

    const categoriaID = getCategoryIdFromPayload(body)
    if (categoriaID) {
      next = attachCategory(next, categoriaID)
    }

    products = products.map((product, productIndex) => (productIndex === index ? next : product))
    sendJson(req, res, 200, next)
    return
  }

  if (req.method === 'PATCH' && pathname.match(/^\/admin\/productos\/\d+\/estado$/)) {
    const index = findProductIndex(pathname)
    if (index < 0) {
      sendJson(req, res, 404, { detail: 'Producto no encontrado.' })
      return
    }

    const body = await parseBody(req)
    const estado = body.estado === 'activo' ? 'activo' : 'inactivo'
    products = products.map((product, productIndex) =>
      productIndex === index ? { ...product, estado } : product,
    )
    sendJson(req, res, 200, products[index])
    return
  }

  if (req.method === 'DELETE' && pathname.match(/^\/admin\/productos\/\d+$/)) {
    const index = findProductIndex(pathname)
    if (index < 0) {
      sendJson(req, res, 404, { detail: 'Producto no encontrado.' })
      return
    }

    products = products.filter((_, productIndex) => productIndex !== index)
    sendNoContent(req, res)
    return
  }

  if (req.method === 'GET' && pathname === '/sucursales') {
    sendJson(req, res, 200, { sucursales: [] })
    return
  }

  if (req.method === 'GET' && pathname === '/barrios') {
    sendJson(req, res, 200, { barrios: [] })
    return
  }

  sendJson(req, res, 404, { detail: `Mock API route not found: ${req.method} ${pathname}` })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Mock API listening on http://127.0.0.1:${port}`)
})
