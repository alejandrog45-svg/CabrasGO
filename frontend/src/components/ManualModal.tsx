// Manual de uso in-app: mismo componente para pasajero, conductor y admin —
// solo cambia el contenido (título + secciones) que cada app le pasa.
export interface ManualSection {
  heading: string;
  body: string[];
}

export function ManualModal({
  title,
  subtitle,
  sections,
  onClose,
  dark = false,
}: {
  title: string;
  subtitle: string;
  sections: ManualSection[];
  onClose: () => void;
  dark?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-[2000] p-0 sm:p-4">
      <div
        className={`w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col ${
          dark ? "bg-cg-darkSurface text-cg-darkPrimary" : "bg-white text-cg-primary"
        }`}
      >
        <div className={`flex items-start justify-between p-5 border-b ${dark ? "border-slate-800" : "border-slate-200"}`}>
          <div>
            <p className="text-lg font-extrabold">{title}</p>
            <p className={`text-xs mt-0.5 ${dark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar manual"
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dark ? "bg-slate-800" : "bg-cg-surfaceAlt"}`}
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5">
          {sections.map((s) => (
            <div key={s.heading}>
              <p className="font-bold text-sm mb-1.5">{s.heading}</p>
              <ul className="space-y-1">
                {s.body.map((line, i) => (
                  <li key={i} className={`text-sm leading-snug ${dark ? "text-slate-300" : "text-slate-600"}`}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
