import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setSession, AuthUser } from "../lib/api";

const ROLE_HOME: Record<string, string> = {
  PASSENGER: "/pasajero",
  DRIVER: "/conductor",
  ADMIN: "/admin",
  DISPATCHER: "/admin",
};

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "register-driver">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("cabrasgo2025");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<{ email: string; firstName: string; lastName: string; role: string }[]>([]);

  const [rut, setRut] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [soapExpiry, setSoapExpiry] = useState("");
  const [technicalReviewExp, setTechnicalReviewExp] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState<"STANDARD_SEDAN" | "RURAL_4X4_XL">("STANDARD_SEDAN");
  const [bankAccountRut, setBankAccountRut] = useState("");

  useEffect(() => {
    api
      .get<{ password: string; users: typeof demoUsers }>("/auth/demo-accounts")
      .then((d) => setDemoUsers(d.users))
      .catch(() => {});
  }, []);

  async function doLogin(loginEmail: string) {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", {
        email: loginEmail,
        password,
      });
      setSession(res.token, res.user);
      navigate(ROLE_HOME[res.user.role] || "/");
    } catch (e: any) {
      setError(e.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function doRegister() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/auth/register", {
        rut,
        firstName,
        lastName,
        email,
        phone,
        password: regPassword,
      });
      setSession(res.token, res.user);
      navigate(ROLE_HOME[res.user.role] || "/");
    } catch (e: any) {
      setError(e.message || "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  async function doRegisterDriver() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token: string; user: AuthUser; kycPending: boolean }>("/auth/register-driver", {
        rut,
        firstName,
        lastName,
        email,
        phone,
        password: regPassword,
        licenseNumber,
        licenseExpiry,
        soapExpiry,
        technicalReviewExp,
        vehiclePlate,
        vehicleModel,
        vehicleCategory,
        bankAccountRut,
      });
      setSession(res.token, res.user);
      navigate(ROLE_HOME[res.user.role] || "/");
    } catch (e: any) {
      setError(e.message || "No se pudo crear la cuenta de conductor");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "register-driver") {
    return (
      <div className="min-h-screen bg-cg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-cg-surface rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="CabrasGo" className="w-16 h-16 rounded-2xl mb-3" />
            <h1 className="text-2xl font-bold text-cg-primary">Súmate como conductor</h1>
            <p className="text-sm text-slate-500 text-center mt-1">Un admin revisará tus documentos antes de activarte</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doRegisterDriver();
            }}
            className="space-y-3"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Datos personales</p>
            <input required placeholder="RUT (ej. 12.345.678-9)" value={rut} onChange={(e) => setRut(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <div className="flex gap-3">
              <input required placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-1/2 rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              <input required placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-1/2 rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            </div>
            <input required type="email" placeholder="correo@ejemplo.cl" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <input required placeholder="Teléfono (+56 9 ...)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <input required type="password" placeholder="Contraseña (mín. 8 caracteres)" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide pt-2">Licencia y documentos</p>
            <input required placeholder="N° de licencia de conducir" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <label className="block text-xs text-slate-500">Vencimiento licencia</label>
            <input required type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <label className="block text-xs text-slate-500">Vencimiento SOAP</label>
            <input required type="date" value={soapExpiry} onChange={(e) => setSoapExpiry(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <label className="block text-xs text-slate-500">Vencimiento revisión técnica</label>
            <input required type="date" value={technicalReviewExp} onChange={(e) => setTechnicalReviewExp(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide pt-2">Vehículo y pago</p>
            <input required placeholder="Patente (ej. LKPX84)" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <input required placeholder="Modelo (ej. Toyota RAV4 2022)" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <select value={vehicleCategory} onChange={(e) => setVehicleCategory(e.target.value as any)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <option value="STANDARD_SEDAN">Estándar (sedán)</option>
              <option value="RURAL_4X4_XL">Rural 4x4</option>
            </select>
            <input required placeholder="RUT de la cuenta bancaria" value={bankAccountRut} onChange={(e) => setBankAccountRut(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />

            {error && <p className="text-cg-danger text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Enviando..." : "Enviar solicitud"}
            </button>
          </form>
          <button onClick={() => { setMode("login"); setError(""); }} className="w-full text-center text-sm text-slate-500 mt-4">
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </div>
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div className="min-h-screen bg-cg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-cg-surface rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="CabrasGo" className="w-16 h-16 rounded-2xl mb-3" />
            <h1 className="text-2xl font-bold text-cg-primary">Crear cuenta</h1>
            <p className="text-sm text-slate-500 text-center mt-1">Cuenta de pasajero CabrasGo</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doRegister();
            }}
            className="space-y-3"
          >
            <input required placeholder="RUT (ej. 12.345.678-9)" value={rut} onChange={(e) => setRut(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cg-accent" />
            <div className="flex gap-3">
              <input required placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-1/2 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cg-accent" />
              <input required placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-1/2 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cg-accent" />
            </div>
            <input required type="email" placeholder="correo@ejemplo.cl" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cg-accent" />
            <input required placeholder="Teléfono (+56 9 ...)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cg-accent" />
            <input required type="password" placeholder="Contraseña (mín. 8 caracteres)" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cg-accent" />
            {error && <p className="text-cg-danger text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
          <button onClick={() => { setMode("login"); setError(""); }} className="w-full text-center text-sm text-slate-500 mt-4">
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-cg-surface rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="CabrasGo" className="w-16 h-16 rounded-2xl mb-3" />
          <h1 className="text-2xl font-bold text-cg-primary">CabrasGo</h1>
          <p className="text-sm text-slate-500 text-center mt-1">
            Movilidad para Las Cabras, Peumo y la cuenca del Lago Rapel
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            doLogin(email);
          }}
          className="space-y-3"
        >
          <input
            type="email"
            required
            placeholder="correo@ejemplo.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cg-accent"
          />
          <input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cg-accent"
          />
          {error && <p className="text-cg-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <button onClick={() => { setMode("register"); setError(""); }} className="w-full text-center text-sm text-cg-primary font-semibold mt-4">
          Crear cuenta nueva
        </button>
        <button onClick={() => { setMode("register-driver"); setError(""); }} className="w-full text-center text-sm text-slate-500 mt-2">
          Súmate como conductor
        </button>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Cuentas demo (contraseña: cabrasgo2025)</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {demoUsers.map((u) => (
              <button
                key={u.email}
                onClick={() => {
                  setEmail(u.email);
                  doLogin(u.email);
                }}
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg bg-cg-surfaceAlt hover:bg-slate-200 text-sm"
              >
                <span>
                  {u.firstName} {u.lastName}
                </span>
                <span className="text-[10px] font-semibold text-cg-accent">{u.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
