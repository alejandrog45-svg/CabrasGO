// Normaliza formatos comunes de teléfono chileno a E.164 (+56912345678),
// que es lo que exige Firebase Phone Auth. Acepta "912345678",
// "+56 9 1234 5678", "0912345678", "9 1234 5678", etc.
export function normalizeChileanPhoneToE164(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;

  let national = digits;
  if (national.startsWith("56")) national = national.slice(2);
  if (national.startsWith("0")) national = national.slice(1);

  // Celular chileno: 9 dígitos empezando en 9 (ej. 912345678).
  if (national.length === 9 && national.startsWith("9")) {
    return `+56${national}`;
  }
  return null;
}
