import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { isValidRut } from "../lib/chile";

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

// Convenience: list seeded demo accounts for the login screen (no secrets beyond
// the shared demo password, which is documented in the README).
authRouter.get("/demo-accounts", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { email: true, firstName: true, lastName: true, role: true },
    orderBy: { role: "asc" },
  });
  res.json({ password: "cabrasgo2025", users });
});
