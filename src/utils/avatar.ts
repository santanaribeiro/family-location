/** Iniciais para o marcador quando o usuário não tem foto. */
export function initials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return '?';
  const base = nameOrEmail.trim();
  const parts = base.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase() || base[0]?.toUpperCase() || '?';
}
