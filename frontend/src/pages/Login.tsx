import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setSession, AuthUser } from "../lib/api";

const ROLE_HOME: Record<string, string> = {
  PASSENGER: "/pasajero",
  DRIVER: "/conductor",
  ADMIN: "/admin",
  DISPATCHER: "/admin",
};

function IconId() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="8.5" cy="12" r="1.8" />
      <path d="M6 16.2c.4-1.6 1.6-2.4 2.5-2.4s2.1.8 2.5 2.4M14 9.5h5M14 12.5h5M14 15.5h3" strokeLinecap="round" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" strokeLinecap="round" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18.2h2" strokeLinecap="round" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}
function IconEye({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3.5 3.5l17 17" strokeLinecap="round" />}
    </svg>
  );
}
function IconLicense() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="2.5" y="6" width="19" height="12" rx="2.2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M13 10h6M13 14h4" strokeLinecap="round" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3.5" y="5" width="17" height="16" rx="2.2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function IconCar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M4 16V12.5L6 7.5h12L20 12.5V16" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2.7" y="16" width="18.6" height="3.5" rx="1.2" />
      <circle cx="7.5" cy="19.5" r="1.4" />
      <circle cx="16.5" cy="19.5" r="1.4" />
    </svg>
  );
}
function IconBank() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M3 9.5 12 4l9 5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 9.5v9M9 9.5v9M15 9.5v9M19.5 9.5v9M3 20h18" strokeLinecap="round" />
    </svg>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-500 mb-1.5">{children}</label>;
}

function IconField({
  icon,
  accentClass,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; accentClass: string }) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3.5 text-slate-400 pointer-events-none">{icon}</span>
      <input
        {...props}
        className={`w-full h-[52px] pl-11 pr-4 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${accentClass}`}
      />
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "register-driver">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("cabrasgo2025");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<{ email: string; firstName: string; lastName: string; role: string }[]>([]);

  const [rut, setRut] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

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

  function resetToLogin() {
    setMode("login");
    setError("");
  }

  if (mode === "register-driver") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="px-7 pt-7 pb-2 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <img src="/logo-conductor.jpg" alt="CabrasGo Conductor" className="w-full h-full object-cover" />
              </div>
              <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 rounded-full bg-cg-driver border-2 border-white items-center justify-center text-white text-[10px] font-bold">✓</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-driver" />
              <span className="text-[11px] font-bold text-cg-driver tracking-wide uppercase">Conductor</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Súmate como conductor</h1>
            <p className="text-sm text-slate-500 mt-1">Un admin revisará tus documentos antes de activarte</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              doRegisterDriver();
            }}
            className="px-7 pb-7 pt-4 space-y-3.5"
          >
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide pt-1">Datos personales</p>
            <div>
              <FieldLabel>RUT</FieldLabel>
              <IconField icon={<IconId />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required placeholder="12.345.678-9" value={rut} onChange={(e) => setRut(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Nombre</FieldLabel>
                <IconField icon={<IconUser />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required placeholder="Ej. Osvaldo" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Apellido</FieldLabel>
                <IconField icon={<IconUser />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required placeholder="Ej. Bravo" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <FieldLabel>Correo electrónico</FieldLabel>
              <IconField icon={<IconMail />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required type="email" placeholder="tu.correo@ejemplo.cl" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Teléfono móvil</FieldLabel>
              <IconField icon={<IconPhone />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required placeholder="+56 9 8765 4321" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Contraseña</FieldLabel>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 pointer-events-none"><IconLock /></span>
                <input
                  required
                  type={showRegPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full h-[52px] pl-11 pr-11 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:border-cg-driver focus:ring-cg-driver/20 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                />
                <button type="button" onClick={() => setShowRegPassword((v) => !v)} className="absolute right-3 text-slate-400 hover:text-slate-600" aria-label="Mostrar u ocultar contraseña">
                  <IconEye off={showRegPassword} />
                </button>
              </div>
            </div>

            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide pt-2">Licencia y documentos</p>
            <div>
              <FieldLabel>N° de licencia de conducir</FieldLabel>
              <IconField icon={<IconLicense />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required placeholder="Ej. 15.234.567-8" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <FieldLabel>Vencimiento licencia</FieldLabel>
                <IconField icon={<IconCalendar />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Vencimiento SOAP</FieldLabel>
                <IconField icon={<IconCalendar />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required type="date" value={soapExpiry} onChange={(e) => setSoapExpiry(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Vencimiento revisión técnica</FieldLabel>
                <IconField icon={<IconCalendar />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required type="date" value={technicalReviewExp} onChange={(e) => setTechnicalReviewExp(e.target.value)} />
              </div>
            </div>

            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide pt-2">Vehículo y pago</p>
            <div>
              <FieldLabel>Patente</FieldLabel>
              <IconField icon={<IconCar />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required placeholder="Ej. LK · PX · 84" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Modelo</FieldLabel>
              <IconField icon={<IconCar />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required placeholder="Ej. Toyota RAV4 2022" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Categoría de vehículo</FieldLabel>
              <select
                value={vehicleCategory}
                onChange={(e) => setVehicleCategory(e.target.value as any)}
                className="w-full h-[52px] px-4 bg-white text-slate-900 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:border-cg-driver focus:ring-cg-driver/20 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <option value="STANDARD_SEDAN">Estándar (sedán)</option>
                <option value="RURAL_4X4_XL">Rural 4x4</option>
              </select>
            </div>
            <div>
              <FieldLabel>RUT de la cuenta bancaria</FieldLabel>
              <IconField icon={<IconBank />} accentClass="focus:border-cg-driver focus:ring-cg-driver/20" required placeholder="12.345.678-9" value={bankAccountRut} onChange={(e) => setBankAccountRut(e.target.value)} />
            </div>

            {error && <p className="text-cg-danger text-sm font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-cg-driver hover:bg-blue-700 text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.25)] active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar solicitud"}
            </button>
          </form>
          <button onClick={resetToLogin} className="w-full text-center text-sm text-slate-500 pb-6 hover:text-slate-700">
            ¿Ya tienes cuenta? <span className="font-semibold text-cg-driver">Inicia sesión</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="px-7 pt-7 pb-2 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <img src="/logo-pasajero.jpg" alt="CabrasGo" className="w-full h-full object-cover" />
              </div>
              <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 rounded-full bg-cg-accent border-2 border-white items-center justify-center text-white text-[10px] font-bold">✓</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-accent" />
              <span className="text-[11px] font-bold text-emerald-700 tracking-wide uppercase">Pasajero</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Crea tu cuenta</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">Viaja seguro y conectado por tu zona rural y ciudad</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              doRegister();
            }}
            className="px-7 pb-7 pt-4 space-y-3.5"
          >
            <div>
              <FieldLabel>RUT</FieldLabel>
              <IconField icon={<IconId />} accentClass="focus:border-cg-accent focus:ring-cg-accent/20" required placeholder="12.345.678-9" value={rut} onChange={(e) => setRut(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Nombre</FieldLabel>
                <IconField icon={<IconUser />} accentClass="focus:border-cg-accent focus:ring-cg-accent/20" required placeholder="Ej. María" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Apellido</FieldLabel>
                <IconField icon={<IconUser />} accentClass="focus:border-cg-accent focus:ring-cg-accent/20" required placeholder="Ej. González" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <FieldLabel>Correo electrónico</FieldLabel>
              <IconField icon={<IconMail />} accentClass="focus:border-cg-accent focus:ring-cg-accent/20" required type="email" placeholder="tu.correo@ejemplo.cl" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Teléfono móvil</FieldLabel>
              <IconField icon={<IconPhone />} accentClass="focus:border-cg-accent focus:ring-cg-accent/20" required placeholder="+56 9 8765 4321" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Contraseña</FieldLabel>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 pointer-events-none"><IconLock /></span>
                <input
                  required
                  type={showRegPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full h-[52px] pl-11 pr-11 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:border-cg-accent focus:ring-cg-accent/20 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                />
                <button type="button" onClick={() => setShowRegPassword((v) => !v)} className="absolute right-3 text-slate-400 hover:text-slate-600" aria-label="Mostrar u ocultar contraseña">
                  <IconEye off={showRegPassword} />
                </button>
              </div>
            </div>
            {error && <p className="text-cg-danger text-sm font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-cg-accent hover:bg-emerald-600 text-black font-extrabold rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
          <button onClick={resetToLogin} className="w-full text-center text-sm text-slate-500 pb-6 hover:text-slate-700">
            ¿Ya tienes cuenta? <span className="font-semibold text-cg-accent">Inicia sesión</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-7">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shadow-sm mb-3">
            <img src="/logo-pasajero.jpg" alt="CabrasGo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">CabrasGo</h1>
          <p className="text-sm text-slate-500 mt-1">
            Movilidad para Las Cabras, Peumo y la cuenca del Lago Rapel
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            doLogin(email);
          }}
          className="space-y-3.5"
        >
          <div>
            <FieldLabel>Correo electrónico</FieldLabel>
            <IconField icon={<IconMail />} accentClass="focus:border-cg-accent focus:ring-cg-accent/20" type="email" required placeholder="correo@ejemplo.cl" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Contraseña</FieldLabel>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none"><IconLock /></span>
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[52px] pl-11 pr-11 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:border-cg-accent focus:ring-cg-accent/20 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 text-slate-400 hover:text-slate-600" aria-label="Mostrar u ocultar contraseña">
                <IconEye off={showPassword} />
              </button>
            </div>
          </div>
          {error && <p className="text-cg-danger text-sm font-medium">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-cg-accent hover:bg-emerald-600 text-black font-extrabold rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <button onClick={() => { setMode("register"); setError(""); }} className="w-full text-center text-sm text-cg-accent font-semibold mt-4">
          Crear cuenta nueva
        </button>
        <button onClick={() => { setMode("register-driver"); setError(""); }} className="w-full text-center text-sm text-slate-500 mt-2 hover:text-cg-driver">
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
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm"
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
