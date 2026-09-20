// One-off correction (2026-09-20): the seeded "Petrobras El Manzano" row was
// wrong — the real station at that location is Copec, verified against
// bencinaenlinea.cl (CNE) for gasolina 93/95 y diésel. Run once against
// production via `railway run npx tsx scripts/fix-el-manzano-fuel.ts` — does
// NOT touch any other table, only this one FuelBenchmark row.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.fuelBenchmark.findFirst({
    where: { stationCode: "PETROBRAS_EL_MANZANO" },
  });
  if (!existing) {
    console.log("No se encontró la fila PETROBRAS_EL_MANZANO — nada que corregir (¿ya se corrió este script antes?).");
    return;
  }

  const updated = await prisma.fuelBenchmark.update({
    where: { id: existing.id },
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
  console.log("Corregido:", updated);
}

main().finally(() => prisma.$disconnect());
