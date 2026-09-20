import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { isValidRut } from "../lib/chile";
import { verifyFirebaseIdToken } from "../lib/firebaseAdmin";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { rut, firstName, lastName, email, phone, password } = req.body as {
    rut?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
  };

  if (!rut || !firstName || !lastName || !email || !phone || !password) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }
  if (!isValidRut(rut)) {
    return res.status(400).json({ error: "RUT inválido" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }

  const cleanRut = rut.replace(/[.\-\s]/g, "").toUpperCase();
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { rut: cleanRut }] },
  });
  if (existing) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email o RUT" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      rut: cleanRut,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash,
      role: "PASSENGER",
    },
  });

  const token = signToken({ userId: user.id, role: "PASSENGER", driverId: null });
  res.json({
    token,
    user: {
      id: user.id,
      rut: user.rut,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      ratingAvg: user.ratingAvg,
      driverId: null,
    },
  });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "email y password son requeridos" });
  }
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { driverProfile: true },
  });
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
  if (!user.passwordHash) {
    return res.status(401).json({
      error: "Esta cuenta se creó con Google/teléfono y no tiene contraseña — inicia sesión con esa opción",
    });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const token = signToken({
    userId: user.id,
    role: user.role as any,
    driverId: user.driverProfile?.id ?? null,
  });

  res.json({
    token,
    user: {
      id: user.id,
      rut: user.rut,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      ratingAvg: user.ratingAvg,
      driverId: user.driverProfile?.id ?? null,
    },
  });
});

authRouter.post("/register-driver", async (req, res) => {
  const {
    rut,
    firstName,
    lastName,
    email,
    phone,
    password,
    licenseNumber,
    licenseExpiry,
    soapExpiry,
    technicalReviewExp,
    vehiclePlate,
    vehicleModel,
    vehicleCategory,
    bankAccountRut,
  } = req.body as {
    rut?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    soapExpiry?: string;
    technicalReviewExp?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleCategory?: "STANDARD_SEDAN" | "RURAL_4X4_XL";
    bankAccountRut?: string;
  };

  if (
    !rut || !firstName || !lastName || !email || !phone || !password ||
    !licenseNumber || !licenseExpiry || !soapExpiry || !technicalReviewExp ||
    !vehiclePlate || !vehicleModel || !bankAccountRut
  ) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }
  if (!isValidRut(rut)) return res.status(400).json({ error: "RUT del conductor inválido" });
  if (!isValidRut(bankAccountRut)) return res.status(400).json({ error: "RUT de cuenta bancaria inválido" });
  if (password.length < 8) return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });

  const cleanRut = rut.replace(/[.\-\s]/g, "").toUpperCase();
  const cleanBankRut = bankAccountRut.replace(/[.\-\s]/g, "").toUpperCase();
  const normalizedEmail = email.toLowerCase().trim();
  const cleanPlate = vehiclePlate.replace(/[·\s-]/g, "").toUpperCase();

  const [existingUser, existingPlate] = await Promise.all([
    prisma.user.findFirst({ where: { OR: [{ email: normalizedEmail }, { rut: cleanRut }] } }),
    prisma.driver.findUnique({ where: { vehiclePlate: cleanPlate } }),
  ]);
  if (existingUser) return res.status(409).json({ error: "Ya existe una cuenta con ese email o RUT" });
  if (existingPlate) return res.status(409).json({ error: "Esa patente ya está registrada" });

  const passwordHash = await bcrypt.hash(password, 10);
  const category = vehicleCategory === "RURAL_4X4_XL" ? "RURAL_4X4_XL" : "STANDARD_SEDAN";

  const user = await prisma.user.create({
    data: {
      rut: cleanRut,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash,
      role: "DRIVER",
      driverProfile: {
        create: {
          licenseNumber: licenseNumber.trim(),
          licenseExpiry: new Date(licenseExpiry),
          soapExpiry: new Date(soapExpiry),
          technicalReviewExp: new Date(technicalReviewExp),
          bankAccountRut: cleanBankRut,
          vehiclePlate: cleanPlate,
          vehicleModel: vehicleModel.trim(),
          vehicleCategory: category,
          has4x4: category === "RURAL_4X4_XL",
          isKycVerified: false,
        },
      },
    },
    include: { driverProfile: true },
  });

  // isKycVerified queda en false: un admin debe validar los documentos reales
  // antes de que el conductor pueda pasar a AVAILABLE (ver dispatchTrip).
  const token = signToken({ userId: user.id, role: "DRIVER", driverId: user.driverProfile!.id });
  res.json({
    token,
    user: {
      id: user.id,
      rut: user.rut,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      ratingAvg: user.ratingAvg,
      driverId: user.driverProfile!.id,
    },
    kycPending: true,
  });
});

// Login/registro de pasajero vía Firebase Auth (Google o teléfono/SMS).
// El conductor sigue exclusivamente por /auth/register-driver (KYC completo)
// — un DRIVER que intenta entrar por acá se rechaza explícitamente para no
// pisarle el rol ni emitirle un JWT de pasajero.
authRouter.post("/firebase", async (req, res) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) return res.status(400).json({ error: "idToken es requerido" });

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Token de Firebase inválido o expirado" });
  }

  const { uid, email, email_verified: emailVerified, phone_number: phoneNumber, name } = decoded as {
    uid: string;
    email?: string;
    email_verified?: boolean;
    phone_number?: string;
    name?: string;
  };
  // Solo confiamos en el email para vincular/buscar cuentas existentes si
  // Firebase lo marca verificado — si no, cualquiera podría registrar el
  // email de otra persona en Firebase y robarle la cuenta acá (account
  // takeover). Google Sign-In siempre viene con email_verified: true.
  const normalizedEmail = email && emailVerified ? email.toLowerCase().trim() : null;
  const DRIVER_BLOCKED_MSG =
    "Esta cuenta está registrada como Conductor — inicia sesión en la app de Conductores con tu email y contraseña";

  let user = await prisma.user.findUnique({
    where: { firebaseUid: uid },
    include: { driverProfile: true },
  });

  // Cascada de búsqueda de cuenta ya existente (creada por /auth/register o
  // /auth/register-driver) para vincularle el firebaseUid en vez de crear un
  // duplicado: primero por email verificado, después por teléfono — esto
  // último es clave para que un conductor que entra por SMS con su mismo
  // teléfono no se cree una cuenta paralela de pasajero saltándose el bloqueo.
  if (!user && normalizedEmail) {
    user = await prisma.user.findUnique({ where: { email: normalizedEmail }, include: { driverProfile: true } });
  }
  if (!user && phoneNumber) {
    user = await prisma.user.findFirst({ where: { phone: phoneNumber }, include: { driverProfile: true } });
  }

  if (user) {
    if (user.role === "DRIVER") {
      return res.status(403).json({ error: DRIVER_BLOCKED_MSG });
    }
    if (user.firebaseUid !== uid) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid: uid, phone: phoneNumber ?? user.phone },
        include: { driverProfile: true },
      });
    }
  }

  if (!user) {
    const [firstName, ...rest] = (name ?? "Pasajero CabrasGo").split(" ");
    try {
      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          firstName: firstName || "Pasajero",
          lastName: rest.join(" ") || "CabrasGo",
          email: normalizedEmail,
          phone: phoneNumber ?? "",
          role: "PASSENGER",
        },
        include: { driverProfile: true },
      });
    } catch (e) {
      // Doble clic / doble submit: otra request concurrente ya creó al
      // mismo usuario (choque en la constraint única de firebaseUid) —
      // reusamos ese usuario en vez de tirar un 500.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        user = await prisma.user.findUnique({ where: { firebaseUid: uid }, include: { driverProfile: true } });
      }
      if (!user) throw e;
    }
  }

  const token = signToken({ userId: user.id, role: user.role as any, driverId: null });
  res.json({
    token,
    user: {
      id: user.id,
      rut: user.rut,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      ratingAvg: user.ratingAvg,
      driverId: null,
    },
  });
});

// Convenience: list seeded demo accounts for the login screen (no secrets beyond
// the shared demo password, which is documented in the README).
authRouter.get("/demo-accounts", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { email: true, firstName: true, lastName: true, role: true },
    orderBy: { role: "asc" },
  });
  res.json({ password: "cabrasgo2025", users });
});
