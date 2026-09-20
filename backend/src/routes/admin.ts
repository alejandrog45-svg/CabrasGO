import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../lib/auth";
import { parsePolygon } from "../lib/geofence";
import { FUEL_PRICE_SYNC_TRIGGER_CLP } from "../lib/fare";
import { LANDMARKS } from "../lib/landmarks";
import { COMMISSION_PCT_MAX, COMMISSION_PCT_MIN, clampCommissionPct, getPlatformConfig } from "../lib/platformConfig";

export const adminRouter = Router();

adminRouter.get("/kpis/realtime", requireAuth("ADMIN", "DISPATCHER"), async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [completedToday, cancelledToday, activeDrivers, totalDrivers, onTripDrivers, allTripsToday] =
    await Promise.all([
      prisma.trip.count({ where: { status: "COMPLETED", completedAt: { gte: startOfDay } } }),
      prisma.trip.count({ where: { status: "CANCELLED", cancelledAt: { gte: startOfDay } } }),
      prisma.driver.count({ where: { operationalStatus: { not: "OFFLINE" } } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { operationalStatus: "ON_TRIP" } }),
      prisma.trip.findMany({
        where: { requestedAt: { gte: startOfDay }, status: { not: "CANCELLED" } },
        select: { fareGrossClp: true },
      }),
    ]);

  const gmvToday = allTripsToday.reduce((acc, t) => acc + t.fareGrossClp, 0);
  const totalRequested = completedToday + cancelledToday;
  const completionRate = totalRequested > 0 ? (completedToday / totalRequested) * 100 : 100;

  const statusBreakdown = await prisma.driver.groupBy({
    by: ["operationalStatus"],
    _count: true,
  });

  res.json({
    gmvTodayClp: gmvToday,
    activeDrivers,
    totalDrivers,
    onTripDrivers,
    completedTripsToday: completedToday,
    completionRatePct: Math.round(completionRate * 10) / 10,
    fleetStatus: statusBreakdown.map((s) => ({ status: s.operationalStatus, count: s._count })),
  });
});

adminRouter.get("/drivers/radar", requireAuth("ADMIN", "DISPATCHER"), async (_req, res) => {
  const drivers = await prisma.driver.findMany({
    include: { user: true },
  });
  res.json({
    drivers: drivers.map((d) => ({
      id: d.id,
      name: `${d.user.firstName} ${d.user.lastName}`,
      plate: d.vehiclePlate,
      model: d.vehicleModel,
      status: d.operationalStatus,
      lat: d.currentLatitude ? Number(d.currentLatitude) : null,
      lng: d.currentLongitude ? Number(d.currentLongitude) : null,
      speedKmh: d.speedKmh ? Number(d.speedKmh) : 0,
      batteryPct: d.batteryPct,
      rating: Number(d.user.ratingAvg),
      isKycVerified: d.isKycVerified,
      isVip: d.isVip,
    })),
    landmarks: LANDMARKS,
  });
});

adminRouter.get("/users", requireAuth("ADMIN", "DISPATCHER"), async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { driverProfile: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
});

adminRouter.put("/drivers/:id/kyc", requireAuth("ADMIN"), async (req: AuthedRequest, res) => {
  const { isKycVerified } = req.body as { isKycVerified: boolean };
  const driver = await prisma.driver.update({
    where: { id: req.params.id },
    data: { isKycVerified },
  });
  res.json({ driverId: driver.id, isKycVerified: driver.isKycVerified });
});

adminRouter.get("/geofences", requireAuth("ADMIN", "DISPATCHER"), async (_req, res) => {
  const zones = await prisma.geofenceZone.findMany();
  res.json({
    zones: zones.map((z) => ({
      ...z,
      boundaryPolygon: parsePolygon(z.boundaryPolygonJson),
    })),
  });
});

adminRouter.put("/geofences/:code", requireAuth("ADMIN"), async (req: AuthedRequest, res) => {
  const { dynamicMultiplier, require4x4, dirtRoadSurchargeClp, isHighDemand } = req.body as {
    dynamicMultiplier?: number;
    require4x4?: boolean;
    dirtRoadSurchargeClp?: number;
    isHighDemand?: boolean;
  };
  const zone = await prisma.geofenceZone.update({
    where: { code: req.params.code },
    data: {
      ...(dynamicMultiplier !== undefined ? { dynamicMultiplier } : {}),
      ...(require4x4 !== undefined ? { require4x4 } : {}),
      ...(dirtRoadSurchargeClp !== undefined ? { dirtRoadSurchargeClp } : {}),
      ...(isHighDemand !== undefined ? { isHighDemand } : {}),
    },
  });
  res.json({ zone });
});

adminRouter.get("/fuel/benchmarks", requireAuth("ADMIN", "DISPATCHER"), async (_req, res) => {
  const benchmarks = await prisma.fuelBenchmark.findMany({ orderBy: { reportedAt: "desc" } });
  res.json({ benchmarks });
});

// Mocked CNE/ENAP sync webhook: nudges each station's price by a small random
// walk. Per the unified spec, a station is only re-indexed into the fare
// engine's benchmark set when its price moves more than $25 CLP/L vs the last
// reading (FUEL_PRICE_SYNC_TRIGGER_CLP) — smaller noise is ignored.
adminRouter.post("/fuel/sync-cne", requireAuth("ADMIN"), async (_req, res) => {
  const benchmarks = await prisma.fuelBenchmark.findMany();
  const updates = [];
  for (const b of benchmarks) {
    const delta = Math.round((Math.random() - 0.5) * 40); // +/- 20 CLP noise
    if (Math.abs(delta) < FUEL_PRICE_SYNC_TRIGGER_CLP) {
      updates.push({ station: b.stationName, changed: false, gasoline93Clp: b.gasoline93Clp });
      continue;
    }
    const updated = await prisma.fuelBenchmark.update({
      where: { id: b.id },
      data: {
        gasoline93Clp: b.gasoline93Clp + delta,
        ...(b.gasoline95Clp != null ? { gasoline95Clp: b.gasoline95Clp + delta } : {}),
        dieselClp: b.dieselClp + Math.round(delta * 0.8),
        reportedAt: new Date(),
      },
    });
    updates.push({ station: b.stationName, changed: true, gasoline93Clp: updated.gasoline93Clp });
  }
  res.json({ syncedAt: new Date().toISOString(), source: "CNE_ENAP_SANDBOX", updates });
});

adminRouter.get("/finance/reconciliation", requireAuth("ADMIN"), async (_req, res) => {
  const trips = await prisma.trip.findMany({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take: 50,
  });
  const byMethod = trips.reduce<Record<string, { count: number; totalClp: number }>>((acc, t) => {
    const key = t.paymentMethod;
    acc[key] = acc[key] ?? { count: 0, totalClp: 0 };
    acc[key].count += 1;
    acc[key].totalClp += t.fareGrossClp;
    return acc;
  }, {});
  res.json({
    trips: trips.map((t) => ({
      id: t.id,
      fareGrossClp: t.fareGrossClp,
      driverNetClp: t.driverNetClp,
      platformFeeClp: t.platformFeeClp,
      paymentMethod: t.paymentMethod,
      paymentStatus: t.paymentStatus,
      paymentGatewayRef: t.paymentGatewayRef,
      completedAt: t.completedAt,
    })),
    byMethod,
    note: "Conciliación exenta según Resolución Exenta SII N°84 (transporte rural) — datos sandbox.",
  });
});

// ---- Business/commission model (point 3): platform config, cancellation
// revenue, VIP subscriptions, weekly bonuses, ad campaigns ----

adminRouter.get("/config", requireAuth("ADMIN", "DISPATCHER"), async (_req, res) => {
  const config = await getPlatformConfig();
  res.json({ config, commissionPctMin: COMMISSION_PCT_MIN, commissionPctMax: COMMISSION_PCT_MAX });
});

adminRouter.put("/config", requireAuth("ADMIN"), async (req: AuthedRequest, res) => {
  const body = req.body as {
    commissionPct?: number;
    cancellationFeePassengerClp?: number;
    cancellationFeeDriverClp?: number;
    weeklyBonusTripThreshold?: number;
    weeklyBonusAmountClp?: number;
    vipMonthlyFeeClp?: number;
  };
  const current = await getPlatformConfig();
  const config = await prisma.platformConfig.update({
    where: { id: current.id },
    data: {
      ...(body.commissionPct !== undefined ? { commissionPct: clampCommissionPct(body.commissionPct) } : {}),
      ...(body.cancellationFeePassengerClp !== undefined
        ? { cancellationFeePassengerClp: Math.max(0, Math.round(body.cancellationFeePassengerClp)) }
        : {}),
      ...(body.cancellationFeeDriverClp !== undefined
        ? { cancellationFeeDriverClp: Math.max(0, Math.round(body.cancellationFeeDriverClp)) }
        : {}),
      ...(body.weeklyBonusTripThreshold !== undefined
        ? { weeklyBonusTripThreshold: Math.max(1, Math.round(body.weeklyBonusTripThreshold)) }
        : {}),
      ...(body.weeklyBonusAmountClp !== undefined
        ? { weeklyBonusAmountClp: Math.max(0, Math.round(body.weeklyBonusAmountClp)) }
        : {}),
      ...(body.vipMonthlyFeeClp !== undefined
        ? { vipMonthlyFeeClp: Math.max(0, Math.round(body.vipMonthlyFeeClp)) }
        : {}),
    },
  });
  res.json({ config });
});

adminRouter.put("/drivers/:id/vip", requireAuth("ADMIN"), async (req: AuthedRequest, res) => {
  const { isVip } = req.body as { isVip: boolean };
  const driver = await prisma.driver.update({
    where: { id: req.params.id },
    data: { isVip, vipSince: isVip ? new Date() : null },
  });
  res.json({ driverId: driver.id, isVip: driver.isVip, vipSince: driver.vipSince });
});

adminRouter.get("/bonuses/weekly", requireAuth("ADMIN", "DISPATCHER"), async (_req, res) => {
  const bonuses = await prisma.driverWeeklyBonus.findMany({
    include: { driver: { include: { user: true } } },
    orderBy: { weekStart: "desc" },
    take: 50,
  });
  res.json({
    bonuses: bonuses.map((b) => ({
      id: b.id,
      driverName: `${b.driver.user.firstName} ${b.driver.user.lastName}`,
      weekStart: b.weekStart,
      tripsCompleted: b.tripsCompleted,
      bonusClp: b.bonusClp,
      createdAt: b.createdAt,
    })),
  });
});

adminRouter.get("/ads", requireAuth("ADMIN", "DISPATCHER"), async (_req, res) => {
  const ads = await prisma.adCampaign.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ ads });
});

adminRouter.post("/ads", requireAuth("ADMIN"), async (req: AuthedRequest, res) => {
  const { title, bodyText, imageUrl, targetAudience, active } = req.body as {
    title: string;
    bodyText: string;
    imageUrl?: string;
    targetAudience?: "PASAJERO" | "CONDUCTOR" | "AMBOS";
    active?: boolean;
  };
  if (!title || !bodyText) return res.status(400).json({ error: "title y bodyText son requeridos" });
  const ad = await prisma.adCampaign.create({
    data: {
      title,
      bodyText,
      imageUrl: imageUrl ?? null,
      targetAudience: targetAudience ?? "AMBOS",
      active: active ?? true,
    },
  });
  res.json({ ad });
});

adminRouter.put("/ads/:id", requireAuth("ADMIN"), async (req: AuthedRequest, res) => {
  const { title, bodyText, imageUrl, targetAudience, active } = req.body as {
    title?: string;
    bodyText?: string;
    imageUrl?: string | null;
    targetAudience?: "PASAJERO" | "CONDUCTOR" | "AMBOS";
    active?: boolean;
  };
  const ad = await prisma.adCampaign.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(bodyText !== undefined ? { bodyText } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(targetAudience !== undefined ? { targetAudience } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });
  res.json({ ad });
});

adminRouter.delete("/ads/:id", requireAuth("ADMIN"), async (req: AuthedRequest, res) => {
  await prisma.adCampaign.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Aggregated view of every non-fare revenue/cost stream from the business
// model, computed from real rows (not placeholders) for the admin dashboard.
adminRouter.get("/business/overview", requireAuth("ADMIN", "DISPATCHER"), async (_req, res) => {
  const [config, completedTrips, cancelledTrips, vipDrivers, bonuses, ads] = await Promise.all([
    getPlatformConfig(),
    prisma.trip.findMany({ where: { status: "COMPLETED" }, select: { platformFeeClp: true, fareGrossClp: true } }),
    prisma.trip.findMany({
      where: { status: "CANCELLED" },
      select: { cancelledBy: true, cancellationFeeClp: true },
    }),
    prisma.driver.count({ where: { isVip: true } }),
    prisma.driverWeeklyBonus.findMany({ select: { bonusClp: true } }),
    prisma.adCampaign.findMany(),
  ]);

  const commissionRevenueClp = completedTrips.reduce((acc, t) => acc + t.platformFeeClp, 0);
  const gmvClp = completedTrips.reduce((acc, t) => acc + t.fareGrossClp, 0);

  const cancellationFeeRevenueClp = cancelledTrips.reduce((acc, t) => acc + t.cancellationFeeClp, 0);
  const cancelledWithFeeCount = cancelledTrips.filter((t) => t.cancellationFeeClp > 0).length;
  const cancellationByParty = {
    passenger: cancelledTrips.filter((t) => t.cancelledBy === "PASSENGER" && t.cancellationFeeClp > 0).length,
    driver: cancelledTrips.filter((t) => t.cancelledBy === "DRIVER" && t.cancellationFeeClp > 0).length,
  };

  const weeklyBonusPayoutsClp = bonuses.reduce((acc, b) => acc + b.bonusClp, 0);

  res.json({
    commission: {
      commissionPct: Number(config.commissionPct),
      driverNetPct: 100 - Number(config.commissionPct),
      minPct: COMMISSION_PCT_MIN,
      maxPct: COMMISSION_PCT_MAX,
      revenueClp: commissionRevenueClp,
      gmvClp,
    },
    cancellations: {
      feePassengerClp: config.cancellationFeePassengerClp,
      feeDriverClp: config.cancellationFeeDriverClp,
      revenueClp: cancellationFeeRevenueClp,
      chargedCount: cancelledWithFeeCount,
      byParty: cancellationByParty,
    },
    vip: {
      monthlyFeeClp: config.vipMonthlyFeeClp,
      vipDriverCount: vipDrivers,
      projectedMonthlyRevenueClp: vipDrivers * config.vipMonthlyFeeClp,
    },
    weeklyBonus: {
      tripThreshold: config.weeklyBonusTripThreshold,
      amountClp: config.weeklyBonusAmountClp,
      totalPaidClp: weeklyBonusPayoutsClp,
      grantCount: bonuses.length,
    },
    ads: {
      totalCount: ads.length,
      activeCount: ads.filter((a) => a.active).length,
    },
  });
});

// Tabla de viajes con ruta y las 3 cifras de dinero (precio pagado por el
// pasajero, ganancia del conductor, comisión de la plataforma) — para que el
// admin vea de un vistazo qué se cobró y cómo se repartió, viaje por viaje.
// Por defecto trae los últimos 50 sin filtrar por estado (incluye viajes en
// curso/cancelados, no solo completados) para que sirva también como
// historial general, no solo de conciliación financiera.
adminRouter.get("/trips", requireAuth("ADMIN", "DISPATCHER"), async (req, res) => {
  const now = new Date();
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : now;
  const from = req.query.from
    ? new Date(`${req.query.from}T00:00:00.000`)
    : new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
  const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;

  const trips = await prisma.trip.findMany({
    where: {
      requestedAt: { gte: from, lte: to },
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
    include: {
      passenger: { select: { firstName: true, lastName: true } },
      driver: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  res.json({
    range: { from: toIsoDateOnly(from), to: toIsoDateOnly(to) },
    trips: trips.map((t) => ({
      id: t.id,
      status: t.status,
      requestedAt: t.requestedAt,
      completedAt: t.completedAt,
      originAddress: t.originAddress,
      destAddress: t.destAddress,
      passengerName: `${t.passenger.firstName} ${t.passenger.lastName}`,
      driverName: t.driver ? `${t.driver.user.firstName} ${t.driver.user.lastName}` : null,
      fareGrossClp: t.fareGrossClp,
      driverNetClp: t.driverNetClp,
      platformFeeClp: t.platformFeeClp,
      paymentMethod: t.paymentMethod,
    })),
  });
});

function toIsoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Reporte de negocio con rango de fechas: ingresos, viajes, ranking de
// conductores y uso por zona. Todo se calcula sobre requestedAt (fecha del
// pedido) para que un viaje aparezca en el día en que el pasajero lo pidió,
// sea que haya terminado completado o cancelado.
adminRouter.get("/reports", requireAuth("ADMIN", "DISPATCHER"), async (req, res) => {
  const now = new Date();
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : now;
  const from = req.query.from
    ? new Date(`${req.query.from}T00:00:00.000`)
    : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

  const trips = await prisma.trip.findMany({
    where: { requestedAt: { gte: from, lte: to } },
    select: {
      id: true,
      status: true,
      requestedAt: true,
      driverId: true,
      driver: { select: { user: { select: { firstName: true, lastName: true } } } },
      geofenceZoneCode: true,
      fareGrossClp: true,
      driverNetClp: true,
      platformFeeClp: true,
      cancelledBy: true,
      cancellationFeeClp: true,
    },
    orderBy: { requestedAt: "asc" },
  });

  const zones = await prisma.geofenceZone.findMany({ select: { code: true, name: true } });
  const zoneNameByCode = new Map(zones.map((z) => [z.code, z.name]));

  const completed = trips.filter((t) => t.status === "COMPLETED");
  const cancelled = trips.filter((t) => t.status === "CANCELLED");

  const gmvClp = completed.reduce((acc, t) => acc + t.fareGrossClp, 0);
  const commissionRevenueClp = completed.reduce((acc, t) => acc + t.platformFeeClp, 0);
  const driverPayoutsClp = completed.reduce((acc, t) => acc + t.driverNetClp, 0);
  const cancellationFeeRevenueClp = cancelled.reduce((acc, t) => acc + t.cancellationFeeClp, 0);

  const byDayMap = new Map<
    string,
    { date: string; tripsRequested: number; tripsCompleted: number; tripsCancelled: number; gmvClp: number; commissionClp: number }
  >();
  for (const t of trips) {
    const date = t.requestedAt.toISOString().slice(0, 10);
    if (!byDayMap.has(date)) {
      byDayMap.set(date, { date, tripsRequested: 0, tripsCompleted: 0, tripsCancelled: 0, gmvClp: 0, commissionClp: 0 });
    }
    const row = byDayMap.get(date)!;
    row.tripsRequested += 1;
    if (t.status === "COMPLETED") {
      row.tripsCompleted += 1;
      row.gmvClp += t.fareGrossClp;
      row.commissionClp += t.platformFeeClp;
    }
    if (t.status === "CANCELLED") row.tripsCancelled += 1;
  }
  const byDay = [...byDayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const driverMap = new Map<
    string,
    { driverId: string; name: string; tripsCompleted: number; tripsCancelled: number; netClp: number }
  >();
  for (const t of trips) {
    if (!t.driverId) continue;
    if (!driverMap.has(t.driverId)) {
      const name = t.driver?.user ? `${t.driver.user.firstName} ${t.driver.user.lastName}` : "Conductor";
      driverMap.set(t.driverId, { driverId: t.driverId, name, tripsCompleted: 0, tripsCancelled: 0, netClp: 0 });
    }
    const row = driverMap.get(t.driverId)!;
    if (t.status === "COMPLETED") {
      row.tripsCompleted += 1;
      row.netClp += t.driverNetClp;
    }
    if (t.status === "CANCELLED" && t.cancelledBy === "DRIVER") row.tripsCancelled += 1;
  }
  const driverRanking = [...driverMap.values()].sort((a, b) => b.netClp - a.netClp);

  const zoneMap = new Map<string, { zoneCode: string; zoneName: string; tripsCompleted: number; gmvClp: number }>();
  for (const t of completed) {
    const code = t.geofenceZoneCode ?? "SIN_ZONA";
    if (!zoneMap.has(code)) {
      zoneMap.set(code, { zoneCode: code, zoneName: zoneNameByCode.get(code) ?? "Sin geocerca", tripsCompleted: 0, gmvClp: 0 });
    }
    const row = zoneMap.get(code)!;
    row.tripsCompleted += 1;
    row.gmvClp += t.fareGrossClp;
  }
  const zoneUsage = [...zoneMap.values()].sort((a, b) => b.tripsCompleted - a.tripsCompleted);

  res.json({
    range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    summary: {
      tripsRequested: trips.length,
      tripsCompleted: completed.length,
      tripsCancelled: cancelled.length,
      completionRatePct: trips.length ? Math.round((completed.length / trips.length) * 100) : 0,
      gmvClp,
      commissionRevenueClp,
      driverPayoutsClp,
      cancellationFeeRevenueClp,
      avgFareClp: completed.length ? Math.round(gmvClp / completed.length) : 0,
    },
    byDay,
    driverRanking,
    zoneUsage,
  });
});
