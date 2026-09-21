-- DonCargador 006: esquema REAL, sin reservas, distinto de 005 (funciones dc_test_*).
-- NO ejecutar automáticamente. Requiere revisión, backup, autorización y acceso de propietario.
-- Puede aplicarse primero a una BD NUEVA y AISLADA llamada doncargador_redsys_pruebas.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
  IF current_database() NOT IN ('kelatos','doncargador_redsys_pruebas') THEN
    RAISE EXCEPTION '006: base de datos no autorizada; NO usar doncargador_pruebas ni otras';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'kelatos_app' AND c.relname IN
      ('dc_pedidos','dc_pedido_lineas','dc_intentos','dc_avisos')
  ) THEN
    RAISE EXCEPTION '006: existen objetos dc_ previos; no sobreescribir ni migrar 005';
  END IF;
END $guard$;

CREATE TABLE kelatos_app.dc_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  comprador jsonb NOT NULL CHECK (jsonb_typeof(comprador) = 'object'),
  estado text NOT NULL DEFAULT 'pendiente_pago'
    CHECK (estado IN ('pendiente_pago','pagado','revision_stock','cancelado')),
  importe_productos numeric(12,2) NOT NULL CHECK (importe_productos > 0),
  envio_centimos integer NOT NULL CHECK (envio_centimos >= 0),
  importe_total numeric(12,2) NOT NULL CHECK (importe_total > 0),
  creado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  confirmado_en timestamptz,
  actualizado_en timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE kelatos_app.dc_pedido_lineas (
  pedido_id uuid NOT NULL REFERENCES kelatos_app.dc_pedidos(id) ON DELETE RESTRICT,
  referencia text NOT NULL REFERENCES kelatos_app.stock_piezas(referencia)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad BETWEEN 1 AND 20),
  precio_unitario numeric(12,2) NOT NULL CHECK (precio_unitario > 0),
  PRIMARY KEY (pedido_id,referencia)
);

CREATE TABLE kelatos_app.dc_intentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL UNIQUE REFERENCES kelatos_app.dc_pedidos(id) ON DELETE RESTRICT,
  numero_redsys varchar(12) NOT NULL UNIQUE
    CHECK (numero_redsys ~ '^[0-9]{4}[A-Za-z0-9]{0,8}$'),
  comercio text NOT NULL CHECK (comercio ~ '^[0-9]{1,12}$'),
  terminal text NOT NULL CHECK (terminal ~ '^[0-9]{1,12}$'),
  importe_centimos bigint NOT NULL CHECK (importe_centimos > 0),
  moneda text NOT NULL DEFAULT '978' CHECK (moneda = '978'),
  estado text NOT NULL DEFAULT 'creado'
    CHECK (estado IN ('creado','denegado','autorizado')),
  respuesta_banco varchar(4),
  creado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  ultima_notificacion_en timestamptz,
  autorizado_en timestamptz
);
CREATE INDEX dc_intentos_pedido_idx ON kelatos_app.dc_intentos(pedido_id);

-- Bandeja transaccional de avisos. Un fallo SMTP NO deshace el pago.
CREATE TABLE kelatos_app.dc_avisos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES kelatos_app.dc_pedidos(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('pedido_pagado','revision_stock')),
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','enviando','enviado','error')),
  intentos integer NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  reclamado_en timestamptz,
  enviado_en timestamptz,
  ultimo_error text,
  creado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (pedido_id,tipo)
);
CREATE INDEX dc_avisos_pendientes_idx ON kelatos_app.dc_avisos(estado,creado_en);

-- Evitar que los privilegios por defecto del esquema otorguen DELETE o PUBLIC.
REVOKE ALL ON kelatos_app.dc_pedidos,kelatos_app.dc_pedido_lineas,
  kelatos_app.dc_intentos,kelatos_app.dc_avisos FROM PUBLIC,kelatos_api;
REVOKE ALL ON SEQUENCE kelatos_app.dc_avisos_id_seq FROM PUBLIC,kelatos_api;
GRANT SELECT,INSERT,UPDATE ON kelatos_app.dc_pedidos,kelatos_app.dc_pedido_lineas,
  kelatos_app.dc_intentos,kelatos_app.dc_avisos TO kelatos_api;
GRANT USAGE,SELECT ON SEQUENCE kelatos_app.dc_avisos_id_seq TO kelatos_api;
COMMIT;
