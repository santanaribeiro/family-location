import * as Linking from 'expo-linking';

/** Deep link do convite (abre em `/invite/<token>`). */
export function inviteLink(token: string): string {
  return Linking.createURL(`invite/${token}`);
}

/** Mensagem pronta para compartilhar um convite. */
export function inviteMessage(familyName: string, token: string): string {
  return `Entre na família "${familyName}" no Family Location.\n\nCódigo: ${token}\nOu abra: ${inviteLink(token)}`;
}

/** Extrai o token de um código colado ou de um link de convite. */
export function extractInviteToken(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/invite\/([^/?#\s]+)/i);
  return match ? match[1] : trimmed;
}
