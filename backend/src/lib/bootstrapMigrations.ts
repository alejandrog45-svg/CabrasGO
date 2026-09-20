import { prisma } from "./prisma";

// Este proyecto no usa `prisma migrate` con historial versionado (solo
// `prisma db push` a mano, ver package.json) y no hay acceso directo a la
// Postgres de producción desde fuera de la red interna de Railway. Estas
// correcciones corren una sola vez al arrancar el servidor (adentro de esa
// red), son idempotentes y se pueden borrar una vez confirmado que ya se
// aplicaron en producción.
export async function runBootstrapMigrations() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "FuelBenchmark" ADD COLUMN IF NOT EXISTS "gasoline95Clp" INTEGER;`
    );
  } catch (e) {
    console.error("bootstrap migration (gasoline95Clp) falló:", e);
  }

  // Corrección de dato de negocio (2026-09-20): la fila seedeada como
  // "Petrobras El Manzano" está mal — la estación real en esa ubicación es
  // Copec (verificado contra bencinaenlinea.cl/CNE). Solo actualiza si la
  // fila vieja todavía existe con ese código — no-op en cualquier otro caso.
  try {
    const old = await prisma.fuelBenchmark.findFirst({ where: { stationCode: "PETROBRAS_EL_MANZANO" } });
    if (old) {
      await prisma.fuelBenchmark.update({
        where: { id: old.id },
        data: {
          stationName: "Copec El Manzano",
          stationCode: "COPEC_EL_MANZANO",
          stationAddress: "Ruta H-66 lote A y sitio 3, El Manzano, Rapel, Las Cabras",
          gasoline93Clp: 1490,
          gasoline95Clp: 1523,
          dieselClp: 1340,
          reportedAt: new Date(),
        },
      });
      console.log("Corregido: Petrobras El Manzano -> Copec El Manzano, precios reales aplicados.");
    }
  } catch (e) {
    console.error("bootstrap migration (fix Copec El Manzano) falló:", e);
  }
}
