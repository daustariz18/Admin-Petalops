-- Esquema derivado de diccionario-datos-postgresql.limpio.csv
-- Nota: se respeta naming original de tablas/columnas para minimizar friccion.

CREATE TABLE IF NOT EXISTS "Empresa" (
  "idEmpresa" BIGINT PRIMARY KEY,
  "nombrecomercial" VARCHAR(180),
  "planid" BIGINT,
  "estado" VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Sucursal" (
  "idSucursal" BIGINT PRIMARY KEY,
  "empresaID" BIGINT NULL,
  CONSTRAINT "fk_sucursal_empresa"
    FOREIGN KEY ("empresaID") REFERENCES "Empresa"("idEmpresa")
);

CREATE TABLE IF NOT EXISTS "Florista" (
  "idFlorista" BIGINT PRIMARY KEY,
  "empresaID" BIGINT NULL,
  "sucursalID" BIGINT NULL,
  CONSTRAINT "fk_florista_empresa"
    FOREIGN KEY ("empresaID") REFERENCES "Empresa"("idEmpresa"),
  CONSTRAINT "fk_florista_sucursal"
    FOREIGN KEY ("sucursalID") REFERENCES "Sucursal"("idSucursal")
);

CREATE TABLE IF NOT EXISTS "Pedido" (
  "idPedido" BIGINT PRIMARY KEY,
  "empresaID" BIGINT NULL,
  "estadoPedidoID" BIGINT NULL,
  CONSTRAINT "fk_pedido_empresa"
    FOREIGN KEY ("empresaID") REFERENCES "Empresa"("idEmpresa")
);

CREATE TABLE IF NOT EXISTS "Produccion" (
  "idProduccion" BIGINT PRIMARY KEY,
  "empresaID" BIGINT NULL,
  "sucursalID" BIGINT NULL,
  "pedidoID" BIGINT NULL,
  "floristaID" BIGINT NULL,
  "fechaProgramadaProduccion" DATE NULL,
  "estado" VARCHAR(30) NULL,
  CONSTRAINT "fk_produccion_empresa"
    FOREIGN KEY ("empresaID") REFERENCES "Empresa"("idEmpresa"),
  CONSTRAINT "fk_produccion_sucursal"
    FOREIGN KEY ("sucursalID") REFERENCES "Sucursal"("idSucursal"),
  CONSTRAINT "fk_produccion_pedido"
    FOREIGN KEY ("pedidoID") REFERENCES "Pedido"("idPedido"),
  CONSTRAINT "fk_produccion_florista"
    FOREIGN KEY ("floristaID") REFERENCES "Florista"("idFlorista")
);

CREATE TABLE IF NOT EXISTS "Rol" (
  "idRol" BIGINT PRIMARY KEY,
  "empresaID" BIGINT NOT NULL,
  "nombreRol" VARCHAR(80) NOT NULL,
  CONSTRAINT "fk_rol_empresa"
    FOREIGN KEY ("empresaID") REFERENCES "Empresa"("idEmpresa"),
  CONSTRAINT "uq_rol_empresa_nombre"
    UNIQUE ("empresaID", "nombreRol")
);

CREATE TABLE IF NOT EXISTS "permisomodulo" (
  "rolid" BIGINT NOT NULL,
  "modulo" VARCHAR(80) NOT NULL,
  "puedever" BOOLEAN NOT NULL,
  "puedecrear" BOOLEAN NOT NULL,
  "puedeeditar" BOOLEAN NOT NULL,
  "puedeeliminar" BOOLEAN NOT NULL,
  CONSTRAINT "pk_permisomodulo"
    PRIMARY KEY ("rolid", "modulo"),
  CONSTRAINT "fk_permisomodulo_rol"
    FOREIGN KEY ("rolid") REFERENCES "Rol"("idRol")
);

CREATE TABLE IF NOT EXISTS "planmodulo" (
  "planid" BIGINT NOT NULL,
  "modulo" VARCHAR(80) NOT NULL,
  "activo" BOOLEAN NOT NULL,
  CONSTRAINT "pk_planmodulo"
    PRIMARY KEY ("planid", "modulo")
);
