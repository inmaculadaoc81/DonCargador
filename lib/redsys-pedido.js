// Validación de contexto tras la verificación criptográfica de Redsys.
// Solo evalúa datos: NO confirma pedidos, NO descuenta stock y NO envía correos.
// La integración debe consultar los valores esperados desde un intento persistido,
// nunca desde un carrito ni desde parámetros recibidos del navegador.
import { verificarNotificacion } from "./redsys.js";

function camposNormalizados(datos) {
  const campos = new Map();
  for (const [clave, valor] of Object.entries(datos)) {
    const nombre = clave.toUpperCase();
    // No permitir que dos versiones del mismo nombre discrepen.
    if (campos.has(nombre) || !/^[A-Z][A-Z0-9_]*$/.test(nombre)) return null;
    if (typeof valor !== "string" && typeof valor !== "number") return null;
    campos.set(nombre, String(valor));
  }
  return campos;
}

function enteroDecimal(valor) {
  return typeof valor === "string" && /^[0-9]+$/.test(valor) ? valor : null;
}

function igualNumero(a, b) {
  const izquierdo = enteroDecimal(a);
  const derecho = enteroDecimal(b);
  return izquierdo !== null && derecho !== null && BigInt(izquierdo) === BigInt(derecho);
}

export function validarPagoNotificado({ claveBase64, signatureVersion, merchantParameters, signature, esperado }) {
  if (!esperado || typeof esperado !== "object" || Array.isArray(esperado)) {
    return { autorizado: false, motivo: "pedido_no_encontrado" };
  }
  const firma = verificarNotificacion({ claveBase64, signatureVersion, merchantParameters, signature });
  if (!firma.valida) return { autorizado: false, motivo: "firma_invalida" };
  const datos = camposNormalizados(firma.datos);
  if (!datos) return { autorizado: false, motivo: "campos_invalidos" };
  const campo = nombre => datos.get(`DS_${nombre}`);
  if (campo("ORDER") !== esperado.numeroPedido ||
      !igualNumero(campo("MERCHANTCODE"), esperado.comercio) ||
      !igualNumero(campo("TERMINAL"), esperado.terminal) ||
      !igualNumero(campo("AMOUNT"), esperado.importeCentimos) ||
      !igualNumero(campo("CURRENCY"), esperado.moneda) ||
      campo("TRANSACTIONTYPE") !== "0") {
    return { autorizado: false, motivo: "datos_no_coinciden" };
  }
  const respuesta = campo("RESPONSE");
  if (typeof respuesta !== "string" || !/^[0-9]{4}$/.test(respuesta)) {
    return { autorizado: false, motivo: "respuesta_invalida" };
  }
  if (Number(respuesta) >= 100) {
    return { autorizado: false, motivo: "pago_no_autorizado" };
  }
  return { autorizado: true, motivo: "pago_autorizado" };
}
