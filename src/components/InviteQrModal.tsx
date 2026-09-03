import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button, Text } from '@/components';
import { createInvite } from '@/services/family';
import { colors, fontFamily } from '@/theme';
import { notify } from '@/utils/alert';
import { inviteLink } from '@/utils/invite';

interface InviteQrModalProps {
  visible: boolean;
  familyId: string;
  familyName: string;
  onClose: () => void;
}

/**
 * Fluxo de convite por compartilhar: primeiro uma escolha (QR code ou link), depois
 * a tela do QR propriamente dita. Um único modal com 2 "telas" internas.
 */
export function InviteQrModal({ visible, familyId, familyName, onClose }: InviteQrModalProps) {
  const [step, setStep] = useState<'choice' | 'qr'>('choice');
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep('choice');
      setToken(null);
    }
  }, [visible]);

  async function showQr() {
    try {
      setBusy(true);
      const t = await createInvite(familyId);
      setToken(t);
      setStep('qr');
    } catch (error) {
      notify('Convite', error instanceof Error ? error.message : 'Erro ao gerar o convite.');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      setBusy(true);
      const t = await createInvite(familyId);
      await Clipboard.setStringAsync(inviteLink(t));
      notify('Convite copiado', `O link de convite para “${familyName}” foi copiado. É só colar e enviar.`);
      onClose();
    } catch (error) {
      notify('Convite', error instanceof Error ? error.message : 'Erro ao gerar o convite.');
    } finally {
      setBusy(false);
    }
  }

  async function copyLinkFromQr() {
    if (!token) return;
    await Clipboard.setStringAsync(inviteLink(token));
    notify('Copiado', 'Link do convite copiado.');
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-center px-xl" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable onPress={() => {}} className="gap-md rounded-xl bg-neutral-800 p-lg">
          {step === 'choice' ? (
            <>
              <Text variant="subtitle">Convidar para {familyName}</Text>
              <Text variant="muted" className="-mt-sm">
                Escolha como quer convidar.
              </Text>
              <Button title="Mostrar QR code" onPress={showQr} loading={busy} />
              <Button title="Copiar link" variant="secondary" onPress={copyLink} disabled={busy} />
              <Button title="Cancelar" variant="ghost" onPress={onClose} disabled={busy} />
            </>
          ) : (
            <>
              <Text variant="subtitle" className="text-center">
                {familyName}
              </Text>
              <Text variant="muted" className="-mt-sm text-center">
                Peça para a pessoa escanear com a câmera do celular.
              </Text>
              {/* Precisa ser branco de verdade (não o token `white` do tema, que é cinza-claro
                  no app escuro) — é requisito físico de leitura óptica pela câmera. */}
              <View className="self-center rounded-md p-md" style={{ backgroundColor: '#FFFFFF' }}>
                {token ? <QRCode value={inviteLink(token)} size={148} color="#111111" backgroundColor="#FFFFFF" /> : null}
              </View>
              <Pressable
                onPress={copyLinkFromQr}
                className="flex-row items-center gap-sm rounded-md border border-neutral-700 bg-neutral-900 px-md py-sm"
              >
                <Text
                  variant="caption"
                  className="flex-1"
                  style={{ fontFamily: fontFamily.mono }}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {token ? inviteLink(token) : ''}
                </Text>
                <Ionicons name="copy-outline" size={16} color={colors.neutral[400]} />
              </Pressable>
              <Text variant="caption" className="text-center">
                O código expira depois de usado uma vez.
              </Text>
              <Button title="Fechar" variant="secondary" onPress={onClose} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
