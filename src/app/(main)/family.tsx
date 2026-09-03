import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { CreateFamilyModal } from '@/components/CreateFamilyModal';
import { useAuth } from '@/services/auth';
import { createInvite, leaveFamily, listMyFamilies, type FamilyWithRole } from '@/services/family';
import { useFamilyStore } from '@/stores/familyStore';
import { colors } from '@/theme';
import { inviteLink } from '@/utils/invite';

export default function FamilyScreen() {
  const { user } = useAuth();
  const { activeFamilyId, setActiveFamily } = useFamilyStore();
  const [families, setFamilies] = useState<FamilyWithRole[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(() => {
    listMyFamilies()
      .then(setFamilies)
      .catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  async function shareFamily(family: FamilyWithRole) {
    try {
      const token = await createInvite(family.id);
      await Clipboard.setStringAsync(inviteLink(token));
      Alert.alert('Convite copiado', `O link de convite para “${family.name}” foi copiado. É só colar e enviar.`);
    } catch (error) {
      Alert.alert('Convite', error instanceof Error ? error.message : 'Erro ao gerar o convite.');
    }
  }

  function confirmLeave(family: FamilyWithRole) {
    if (!user) return;
    Alert.alert('Sair da família', `Deseja sair de “${family.name}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveFamily(family.id, user.id);
            if (activeFamilyId === family.id) setActiveFamily(null);
            load();
          } catch (error) {
            Alert.alert('Família', error instanceof Error ? error.message : 'Erro ao sair.');
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <View className="flex-1 gap-lg">
        <View className="flex-row items-center justify-between">
          <Text variant="title">Famílias</Text>
          <Button title="+ Família" size="sm" onPress={() => setCreateOpen(true)} />
        </View>

        {families.length === 0 ? (
          <Text variant="muted">
            Você ainda não participa de nenhuma família. Crie uma em “+ Família”, ou entre em uma pelo botão
            “Entrar” na aba Mapa.
          </Text>
        ) : (
          <ScrollView className="flex-1">
            <View className="gap-sm">
              {families.map((family) => (
                <View
                  key={family.id}
                  className="flex-row items-center justify-between rounded-lg bg-neutral-800 px-md py-md"
                >
                  <View className="flex-1 pr-sm">
                    <Text variant="body" className="font-semibold">
                      {family.name}
                    </Text>
                    <Text variant="caption">{family.role}</Text>
                  </View>
                  <Pressable onPress={() => shareFamily(family)} className="p-sm" accessibilityLabel="Compartilhar convite">
                    <Ionicons name="share-social-outline" size={20} color={colors.brand[400]} />
                  </Pressable>
                  <Pressable onPress={() => confirmLeave(family)} className="p-sm" accessibilityLabel="Sair da família">
                    <Ionicons name="exit-outline" size={20} color={colors.neutral[400]} />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <CreateFamilyModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </Screen>
  );
}
