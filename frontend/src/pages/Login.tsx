import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  ConfirmationResult,
} from "firebase/auth";
import { api, setSession, AuthUser } from "../lib/api";
import { firebaseAuth } from "../lib/firebase";
import { normalizeChileanPhoneToE164 } from "../lib/phone";

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

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07Z" />
    </svg>
  );
}

function IconGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.85-.08-1.66-.22-2.44H12v4.62h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.8Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.25v3.1C3.23 21.3 7.3 24 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.25a12 12 0 0 0 0 10.78l4.02-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.3 0 3.23 2.7 1.25 6.61l4.02 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
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

  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [phoneMode, setPhoneMode] = useState<"closed" | "input" | "code">("closed");
  const [phoneInput, setPhoneInput] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    api
      .get<{ password: string; users: typeof demoUsers }>("/auth/demo-accounts")
      .then((d) => setDemoUsers(d.users))
      .catch(() => {});
  }, []);

  // Si signInWithPopup fue bloqueado (Safari iOS / webviews de apps) y caímos
  // a signInWithRedirect, el resultado vuelve acá al recargar la página.
  useEffect(() => {
    getRedirectResult(firebaseAuth)
      .then(async (result) => {
        if (result?.user) {
          const idToken = await result.user.getIdToken();
          await finishFirebaseLogin(idToken);
        }
      })
      .catch((e) => setError(e.message || "No se pudo completar el login con Google"));
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  async function finishFirebaseLogin(idToken: string) {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/auth/firebase", { idToken });
      setSession(res.token, res.user);
      navigate(ROLE_HOME[res.user.role] || "/");
    } catch (e: any) {
      setError(e.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      await finishFirebaseLogin(idToken);
    } catch (e: any) {
      const blockedCodes = ["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request"];
      if (blockedCodes.includes(e.code)) {
        // Safari iOS / webviews de Instagram-WhatsApp bloquean el popup —
        // seguimos con redirect, que sí funciona ahí.
        await signInWithRedirect(firebaseAuth, provider);
        return;
      }
      setError(e.message || "No se pudo iniciar sesión con Google");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleFacebookLogin() {
    setFacebookLoading(true);
    setError("");
    const provider = new FacebookAuthProvider();
    provider.addScope("email");
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      await finishFirebaseLogin(idToken);
    } catch (e: any) {
      const blockedCodes = ["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request"];
      if (blockedCodes.includes(e.code)) {
        await signInWithRedirect(firebaseAuth, provider);
        return;
      }
      if (e.code === "auth/account-exists-with-different-credential") {
        setError("Ese email ya tiene una cuenta con otro método de acceso (Google o contraseña). Usa ese método.");
        return;
      }
      setError(e.message || "No se pudo iniciar sesión con Facebook");
    } finally {
      setFacebookLoading(false);
    }
  }

  function getRecaptcha(): RecaptchaVerifier {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
        size: "invisible",
      });
    }
    return recaptchaRef.current;
  }

  async function sendPhoneCode() {
    setError("");
    const e164 = normalizeChileanPhoneToE164(phoneInput);
    if (!e164) {
      setError("Ingresa un celular chileno válido (ej. 9 1234 5678)");
      return;
    }
    setLoading(true);
    try {
      confirmationRef.current = await signInWithPhoneNumber(firebaseAuth, e164, getRecaptcha());
      setPhoneMode("code");
    } catch (e: any) {
      setError(e.message || "No se pudo enviar el SMS");
    } finally {
      setLoading(false);
    }
  }

  async function confirmPhoneCode() {
    if (!confirmationRef.current) return;
    setError("");
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otpCode);
      const idToken = await result.user.getIdToken();
      await finishFirebaseLogin(idToken);
    } catch (e: any) {
      setError(e.message || "Código incorrecto");
    } finally {
      setLoading(false);
    }
  }

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

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-[11px] uppercase tracking-wide text-slate-400">o continúa con</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full h-[52px] flex items-center justify-center gap-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-semibold text-slate-700 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] disabled:opacity-60"
        >
          <IconGoogle />
          {googleLoading ? "Conectando..." : "Continuar con Google"}
        </button>

        <button
          type="button"
          onClick={handleFacebookLogin}
          disabled={facebookLoading}
          className="w-full h-[52px] mt-2.5 flex items-center justify-center gap-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-semibold text-slate-700 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] disabled:opacity-60"
        >
          <IconFacebook />
          {facebookLoading ? "Conectando..." : "Continuar con Facebook"}
        </button>

        {phoneMode === "closed" && (
          <button
            type="button"
            onClick={() => setPhoneMode("input")}
            className="w-full h-[52px] mt-2.5 flex items-center justify-center gap-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-semibold text-slate-700 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <IconPhone />
            Continuar con mi celular
          </button>
        )}

        {phoneMode === "input" && (
          <div className="mt-2.5 space-y-2">
            <IconField
              icon={<IconPhone />}
              accentClass="focus:border-cg-accent focus:ring-cg-accent/20"
              placeholder="9 1234 5678"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
            <button
              type="button"
              onClick={sendPhoneCode}
              disabled={loading}
              className="w-full h-[48px] bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl disabled:opacity-60"
            >
              {loading ? "Enviando código..." : "Enviarme un código por SMS"}
            </button>
          </div>
        )}

        {phoneMode === "code" && (
          <div className="mt-2.5 space-y-2">
            <p className="text-xs text-slate-500">Te enviamos un código por SMS a {phoneInput}</p>
            <IconField
              icon={<IconLock />}
              accentClass="focus:border-cg-accent focus:ring-cg-accent/20"
              placeholder="Código de 6 dígitos"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
            <button
              type="button"
              onClick={confirmPhoneCode}
              disabled={loading}
              className="w-full h-[48px] bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl disabled:opacity-60"
            >
              {loading ? "Verificando..." : "Confirmar código"}
            </button>
          </div>
        )}

        {/* Contenedor dedicado para el reCAPTCHA invisible — separado del
            formulario para que no se re-renderice/destruya con StrictMode. */}
        <div id="recaptcha-container" />

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
