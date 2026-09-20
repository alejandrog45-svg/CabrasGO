// Valida los 10 landmarks contra OSRM: si el punto no tiene una vía cercana
// (o cae en el lago / un predio sin acceso), OSRM lo "engancha" (snap) a la
// carretera transitable más próxima, que puede quedar a varios km de
// distancia — eso es justo el tipo de error que ya se encontró una vez
// (Marina Golf Rapel estaba a ~10km de su ubicación real).
//
// Uso: npx tsx scripts/verify-landmarks.ts
import { LANDMARKS } from "../src/lib/landmarks";

const SNAP_WARN_METERS = 50;

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function main() {
  console.log(`Verificando ${LANDMARKS.length} landmarks contra OSRM público...\n`);
  for (const lm of LANDMARKS) {
    const url = `https://router.project-osrm.org/nearest/v1/driving/${lm.lng},${lm.lat}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`⚠️  ${lm.code}: OSRM respondió ${res.status} — no se pudo validar`);
        continue;
      }
      const data = (await res.json()) as {
        waypoints?: { location: [number, number]; distance: number }[];
      };
      const wp = data.waypoints?.[0];
      if (!wp) {
        console.log(`⚠️  ${lm.code}: sin respuesta de OSRM`);
        continue;
      }
      const snappedMeters = wp.distance;
      const flag = snappedMeters > SNAP_WARN_METERS ? "🔴" : "🟢";
      console.log(
        `${flag} ${lm.code.padEnd(28)} snap OSRM: ${snappedMeters.toFixed(0)}m` +
          (snappedMeters > SNAP_WARN_METERS
            ? `  ← revisar, la coordenada puede estar fuera de una vía transitable`
            : "")
      );
      // Sanity check adicional: la distancia haversine entre el punto guardado
      // y el punto "enganchado" por OSRM debería coincidir con wp.distance.
      const snapped = { lat: wp.location[1], lng: wp.location[0] };
      const check = haversineMeters(lm, snapped);
      if (Math.abs(check - snappedMeters) > 20) {
        console.log(`   (nota: distancia recalculada ${check.toFixed(0)}m — diferencia menor esperable por proyección)`);
      }
    } catch (err) {
      console.log(`⚠️  ${lm.code}: error de red — ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 300)); // no golpear el servidor demo público de golpe
  }
}

main();
