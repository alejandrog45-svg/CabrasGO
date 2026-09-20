import { useNavigate } from "react-router-dom";
import { PASAJERO_MANUAL } from "../lib/manuals";

// Página pública (sin login) para el QR de volantes/autos: mismo contenido
// que el manual in-app de pasajero, mostrado antes de entrar a la app.
export function GuiaQR() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-cg-surface rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="CabrasGo" className="w-16 h-16 rounded-2xl mb-3" />
          <h1 className="text-2xl font-bold text-cg-primary">Cómo funciona CabrasGo</h1>
          <p className="text-sm text-slate-500 text-center mt-1">
            Movilidad para Las Cabras, Peumo y la cuenca del Lago Rapel
          </p>
        </div>

        <div className="space-y-5 mb-6">
          {PASAJERO_MANUAL.map((s) => (
            <div key={s.heading}>
              <p className="font-bold text-sm mb-1.5 text-cg-primary">{s.heading}</p>
              <ul className="space-y-1">
                {s.body.map((line, i) => (
                  <li key={i} className="text-sm leading-snug text-slate-600">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button onClick={() => navigate("/")} className="btn-primary">
          Entendido, ingresar
        </button>
      </div>
    </div>
  );
}
