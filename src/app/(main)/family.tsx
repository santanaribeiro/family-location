import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { CreateFamilyModal } from '@/components/CreateFamilyModal';
import { useAuth } from '@/services/auth';
import { createInvite, leaveFamily, listMyFamilies, type FamilyWithRole } from '@/services/family';
import { useFamilyStore } from '@/stores/familyStore';
import { colors } from '@/theme';
import type { FamilyRole } from '@/types/database';
import { confirmAsync, notify } from '@/utils/alert';
import { inviteLink } from '@/utils/invite';

const roleLabel: Record<FamilyRole, string> = {
  owner: 'Dono',
  admin: 'Admin',
  member: 'Membro',
};

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
      notify('Convite copiado', `O link de convite para “${family.name}” foi copiado. É só colar e enviar.`);
    } catch (error) {
      notify('Convite', error instanceof Error ? error.message : 'Erro ao gerar o convite.');
    }
  }

  async function confirmLeave(family: FamilyWithRole) {
    if (!user) return;
    const ok = await confirmAsync('Sair da família', `Deseja sair de “${family.name}”?`, 'Sair');
    if (!ok) return;
    try {
      await leaveFamily(family.id, user.id);
      if (activeFamilyId === family.id) setActiveFamily(null);
      load();
    } catch (error) {
      notify('Família', error instanceof Error ? error.message : 'Erro ao sair.');
    }
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
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="gap-sm pb-lg">
              {families.map((family) => {
                const displayName = family.name?.trim() || 'Família sem nome';
                return (
                  <View
                    key={family.id}
                    className="flex-row items-center gap-md rounded-xl bg-neutral-800 px-md py-md"
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-neutral-700">
                      <Ionicons name="people" size={20} color={colors.neutral[100]} />
                    </View>

                    <View className="flex-1 gap-xs">
                      <Text variant="body" className="font-semibold" numberOfLines={1}>
                        {displayName}
                      </Text>
                      <View className="self-start rounded-full bg-neutral-700 px-sm py-0.5">
                        <Text variant="caption" className="uppercase">
                          {roleLabel[family.role]}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row gap-xs">
                      <Pressable
                        onPress={() => shareFamily(family)}
                        className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700 active:bg-neutral-600"
                        accessibilityLabel="Compartilhar convite"
                      >
                        <Ionicons name="share-social-outline" size={18} color={colors.neutral[100]} />
                      </Pressable>
                      <Pressable
                        onPress={() => confirmLeave(family)}
                        className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700 active:bg-neutral-600"
                        accessibilityLabel="Sair da família"
                      >
                        <Ionicons name="exit-outline" size={18} color={colors.neutral[400]} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      <CreateFamilyModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </Screen>
  );
}
