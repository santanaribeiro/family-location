import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Modal, Pressable, Share, View } from 'react-native';

import { Button, Input, Text } from '@/components';
import { createFamily, createInvite } from '@/services/family';
import { inviteLink, inviteMessage } from '@/utils/invite';

interface CreateFamilyModalProps {
  visible: boolean;
  onClose: () => void;
  /** Chamado após criar (para recarregar a lista). */
  onCreated: () => void;
}

export function CreateFamilyModal({ visible, onClose, onCreated }: CreateFamilyModalProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ familyName: string; token: string } | null>(null);

  function close() {
    setName('');
    setCreated(null);
    setBusy(false);
    onClose();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      setBusy(true);
      const family = await createFamily(name);
      const token = await createInvite(family.id);
      setCreated({ familyName: family.name, token });
      onCreated();
    } catch (error) {
      Alert.alert('Família', error instanceof Error ? error.message : 'Erro ao criar a família.');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    await Clipboard.setStringAsync(inviteLink(created.token));
    Alert.alert('Copiado', 'Link do convite copiado.');
  }

  async function shareInvite() {
    if (!created) return;
    await Share.share({ message: inviteMessage(created.familyName, created.token) });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable onPress={close} className="flex-1 justify-center px-xl" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable onPress={() => {}} className="gap-md rounded-xl bg-neutral-800 p-lg">
          {created ? (
            <>
              <Text variant="subtitle">Família criada 🎉</Text>
              <Text variant="muted">Compartilhe o convite para alguém entrar em “{created.familyName}”.</Text>
              <View className="gap-xs rounded-lg bg-neutral-900 px-md py-md">
                <Text variant="caption">Código do convite</Text>
                <Text variant="body" selectable className="font-semibold">
                  {created.token}
                </Text>
              </View>
              <View className="flex-row gap-sm">
                <Button title="Copiar link" onPress={copyLink} className="flex-1" />
                <Button title="Compartilhar" variant="secondary" onPress={shareInvite} className="flex-1" />
              </View>
              <Button title="Concluir" variant="ghost" onPress={close} />
            </>
          ) : (
            <>
              <Text variant="subtitle">Nova família</Text>
              <Input placeholder="Nome da família" value={name} onChangeText={setName} autoFocus />
              <View className="flex-row gap-sm">
                <Button title="Cancelar" variant="ghost" onPress={close} className="flex-1" />
                <Button title="Criar" onPress={handleCreate} loading={busy} className="flex-1" />
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
