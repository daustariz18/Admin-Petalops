# Resumen del Diccionario PostgreSQL

Fuente: `Diccionario_Datos_POSTGRESQL.csv`

## 1) Inventario limpio recomendado

Para desarrollo y APIs nuevas, conviene tomar como fuente principal el esquema `petalops` y tratar el esquema `public` como legado/duplicado parcial.

### Tablas núcleo (petalops)

- `Empresa`
- `Sucursal`
- `Usuario`
- `Rol`
- `Cliente`
- `Categoria`
- `Producto`
- `Pedido`
- `PedidoDetalle`
- `Produccion`
- `ProduccionHistorial`
- `Entrega`
- `EstadoPedido`
- `Pago`
- `Factura`

### Tablas de inventario y proveedores (petalops)

- `Insumo`
- `Inventario`
- `MovimientoInventario`
- `Proveedor`

### Tablas de operación y soporte (petalops)

- `Barrio`
- `Domiciliario`
- `Florista`
- `Empleado`
- `EmpresaModulo`
- `Modulo`
- `PermisoModulo`
- `UsuarioModulo`
- `UsuarioAuditoria`
- `SucursalContadorPedido`
- `Plan`
- `PlanModulo`
- `TransicionEstadoPedido`
- `TransicionEstadoProduccion`
- `TransicionEstadoEntrega`

## 2) Inconsistencias detectadas

- Hay tablas repetidas entre `public` y `petalops` (`Empresa`, `Pedido`, `Produccion`, `Rol`, `Sucursal`, `Florista`, entre otras).
- Existen diferencias de tipos en IDs para entidades equivalentes (`integer` en un caso y `bigint` en otro).
- Hay variantes por capitalización (`PermisoModulo` y `permisomodulo`, `PlanModulo` y `planmodulo`).
- En `Empresa` aparecen columnas semánticamente duplicadas (`nombreComercial` y `nombrecomercial`, `planID` y `planid`).

## 3) Mapa sugerido de relaciones (FK lógicas)

- `Producto.empresaID` -> `Empresa.idEmpresa`
- `Producto.categoriaID` -> `Categoria.idCategoria`
- `Pedido.empresaID` -> `Empresa.idEmpresa`
- `Pedido.sucursalID` -> `Sucursal.idSucursal`
- `Pedido.clienteID` -> `Cliente.idCliente`
- `Pedido.estadoPedidoID` -> `EstadoPedido.idEstadoPedido`
- `PedidoDetalle.pedidoID` -> `Pedido.idPedido`
- `PedidoDetalle.productoID` -> `Producto.idProducto`
- `Produccion.pedidoID` -> `Pedido.idPedido`
- `Produccion.pedidoDetalleID` -> `PedidoDetalle.idPedidoDetalle`
- `Produccion.floristaID` -> `Florista.idFlorista`
- `Entrega.pedidoID` -> `Pedido.idPedido`
- `Entrega.produccionID` -> `Produccion.idProduccion`
- `Entrega.domiciliarioID` -> `Domiciliario.idDomiciliario`
- `Inventario.insumoID` -> `Insumo.idInsumo`
- `Inventario.sucursalID` -> `Sucursal.idSucursal`
- `Inventario.proveedorID` -> `Proveedor.idProveedor`
- `Usuario.rolID` -> `Rol.idRol`
- `Usuario.sucursalID` -> `Sucursal.idSucursal`

## 4) Modelo mínimo para imágenes de producto (S3 + Cloud SQL)

### Opción rápida (compatible ya)

- Reutilizar `Producto.imagenUrl` para almacenar la URL pública o ruta de CDN.

### Opción recomendada (escalable)

Crear tabla `ProductoImagen` para soportar múltiples imágenes por producto, imagen principal y metadatos.

```sql
CREATE TABLE IF NOT EXISTS petalops."ProductoImagen" (
  "idProductoImagen" BIGSERIAL PRIMARY KEY,
  "empresaID" BIGINT NOT NULL,
  "productoID" BIGINT NOT NULL,
  "s3Key" VARCHAR(500) NOT NULL,
  "bucket" VARCHAR(120) NOT NULL,
  "region" VARCHAR(40) NOT NULL,
  "mimeType" VARCHAR(120) NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "esPrincipal" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NULL,
  CONSTRAINT "fk_productoimagen_producto"
    FOREIGN KEY ("productoID")
    REFERENCES petalops."Producto" ("idProducto")
);

CREATE INDEX IF NOT EXISTS "idx_productoimagen_empresa_producto"
  ON petalops."ProductoImagen" ("empresaID", "productoID");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_productoimagen_principal"
  ON petalops."ProductoImagen" ("productoID")
  WHERE "esPrincipal" = TRUE;
```

## 5) Flujo recomendado de persistencia

1. Frontend pide signed URL con `empresaID` + `productoID`.
2. Backend genera key: `productos/{empresaID}/{productoID}/original.jpg`.
3. Frontend sube directo a S3 con `PUT`.
4. Backend/Frontend guarda en DB la metadata (`s3Key`, `mimeType`, `sizeBytes`) y opcionalmente actualiza `Producto.imagenUrl`.
