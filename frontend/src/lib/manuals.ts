// Contenido de los manuales in-app. Texto describe SOLO funciones que existen
// hoy en el código — actualizar acá si se agrega/cambia una función de la app.
// Idioma: español chileno con tuteo (tú/tu) — sin voseo rioplatense.
import type { ManualSection } from "../components/ManualModal";

export const PASAJERO_MANUAL: ManualSection[] = [
  {
    heading: "1. Ubicación",
    body: [
      "Al abrir la app te va a pedir permiso de GPS. Toca \"Permitir\" — es obligatorio, sin eso no puedes pedir un viaje.",
      "Una vez que lo das, no te lo vuelve a preguntar — el navegador lo recuerda.",
      "Tu dirección real aparece en \"Tu ubicación\". Si quieres forzar una relectura, toca el ícono 🎯 sobre el mapa o el 🧭 junto a la dirección.",
    ],
  },
  {
    heading: "2. Pedir un viaje",
    body: [
      "Elige destino en \"¿A dónde vamos?\" — hay buscador y destinos frecuentes.",
      "\"Para mí\" o \"Para otra persona\" (con nombre y teléfono, el conductor lo ve como referencia de recogida).",
      "Elige categoría (Estándar o Rural 4x4) y método de pago, y confirma — te va a dar un PIN de verificación.",
    ],
  },
  {
    heading: "3. Durante el viaje",
    body: [
      "Comparte el PIN con el conductor cuando llegue — sin el PIN no puede iniciar el viaje.",
      "Vas a ver la posición del auto en vivo en el mapa mientras viene y durante el trayecto.",
      "Puedes cancelar antes de que el conductor llegue; después de aceptado puede aplicar un cargo por cancelación.",
    ],
  },
  {
    heading: "4. Pago y calificación",
    body: [
      "Al terminar el viaje, paga con el método elegido (Webpay, CuentaRUT o efectivo).",
      "Califica al conductor y deja comentarios rápidos si quieres.",
    ],
  },
];

export const CONDUCTOR_MANUAL: ManualSection[] = [
  {
    heading: "1. Ubicación (obligatoria)",
    body: [
      "Al abrir la app te pide GPS — es obligatorio para recibir viajes, aunque no estés \"Conectado\" todavía.",
      "El punto GPS (arriba a la derecha) se pone verde cuando está activo. Si dice \"Denegado\", toca \"Activar ubicación\" en el aviso que aparece.",
    ],
  },
  {
    heading: "2. Conectarte y recibir viajes",
    body: [
      "Toca el botón de estado para pasar de \"Desconectado\" a \"Disponible\" — ahí empiezas a recibir ofertas.",
      "Cuando llega una oferta tienes 15 segundos para Aceptar o Rechazar, con la ganancia neta y distancia de recogida a la vista.",
      "Al llegar al punto de recogida, pídele al pasajero el PIN de 4 dígitos para iniciar el viaje.",
    ],
  },
  {
    heading: "3. Ganancias",
    body: [
      "En la pestaña Billetera ves 4 fuentes: tarifa base, tarifa dinámica/surge, bono semanal por meta de viajes, y propinas.",
      "El % que te queda a ti (neto) lo define el admin, siempre entre 70% y 85% del valor del viaje.",
      "Ser conductor VIP te da prioridad de despacho dentro de tu zona — lo activa el admin.",
    ],
  },
];

export const ADMIN_MANUAL: ManualSection[] = [
  {
    heading: "KPIs en Vivo",
    body: ["GMV del día, conductores activos/con pasajero, viajes completados hoy y tasa de completitud — se refresca solo cada 4 segundos."],
  },
  {
    heading: "Radar de Flotas",
    body: ["Mapa y tabla con todos los conductores en tiempo real: posición, velocidad, batería, estado KYC, y botón para marcar/quitar VIP."],
  },
  {
    heading: "Geocercas",
    body: ["Las 4 zonas (Las Cabras Centro, Marina Golf, Llallauquén, El Manzano): edita el multiplicador dinámico y si exige 4x4."],
  },
  {
    heading: "Combustibles",
    body: ["Precios de bencina/diésel por estación, usados para el factor de combustible de la tarifa. \"Sincronizar\" trae el precio más reciente."],
  },
  {
    heading: "Usuarios & KYC",
    body: ["Lista de todos los usuarios (pasajeros, conductores, admin) con su estado de verificación de documentos."],
  },
  {
    heading: "Modelo de Negocio",
    body: [
      "Ajusta el % de comisión (15%–30%), tarifas de cancelación, cuota VIP mensual, y umbral/monto del bono semanal.",
      "Administra los banners de publicidad (campañas) que ven pasajeros y conductores.",
    ],
  },
  {
    heading: "Reportes",
    body: [
      "Elige un rango de fechas para ver ingresos, comisión, viajes completados/cancelados, ranking de conductores y uso por zona.",
      "Cada tabla tiene botón \"Exportar CSV\" para descargar y abrir en Excel.",
    ],
  },
];
