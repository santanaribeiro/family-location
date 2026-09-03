import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Button, Input, Text } from '@/components';
import { acceptInvite } from '@/services/family';
import { colors, shadows } from '@/theme';
import { notify } from '@/utils/alert';
import { extractInviteToken } from '@/utils/invite';

/** Botão (para o topo do mapa) que abre um modal para entrar em uma família via código/link. */
export function JoinFamilyButton({ onJoined }: { onJoined: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function join() {
    if (!code.trim()) return;
    try {
      setBusy(true);
      await acceptInvite(extractInviteToken(code));
      setCode('');
      setOpen(false);
      onJoined();
      notify('Pronto', 'Você entrou na família!');
    } catch (error) {
      notify('Convite', error instanceof Error ? error.message : 'Convite inválido ou expirado.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={shadows.sm}
        className="flex-row items-center gap-sm rounded-full border border-neutral-700 bg-neutral-800 px-lg py-sm"
      >
        <Ionicons name="person-add" size={16} color={colors.brand[400]} />
        <Text className="font-semibold text-neutral-50">Entrar</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 justify-center px-xl"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <Pressable onPress={() => {}} className="gap-md rounded-xl bg-neutral-800 p-lg">
            <Text variant="subtitle">Entrar em uma família</Text>
            <Text variant="muted">Cole o código (ou link) de convite que te enviaram.</Text>
            <Input
              placeholder="Código do convite"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoFocus
            />
            <View className="flex-row gap-sm">
              <Button title="Cancelar" variant="ghost" onPress={() => setOpen(false)} className="flex-1" />
              <Button title="Entrar" onPress={join} loading={busy} className="flex-1" />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
