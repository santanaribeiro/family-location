import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { ActivityModal } from '@/components/ActivityModal';
import { CreateFamilyModal } from '@/components/CreateFamilyModal';
import { InviteQrModal } from '@/components/InviteQrModal';
import { useAuth } from '@/services/auth';
import { leaveFamily, listMyFamilies, type FamilyWithRole } from '@/services/family';
import { useFamilyStore } from '@/stores/familyStore';
import { colors } from '@/theme';
import type { FamilyRole } from '@/types/database';
import { confirmAsync, notify } from '@/utils/alert';

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
  const [inviteFor, setInviteFor] = useState<FamilyWithRole | null>(null);
  const [activityFor, setActivityFor] = useState<FamilyWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    listMyFamilies()
      .then(setFamilies)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

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

        {loading ? (
          <View className="items-center py-lg">
            <ActivityIndicator color={colors.neutral[400]} />
          </View>
        ) : families.length === 0 ? (
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
                        onPress={() => setActivityFor(family)}
                        className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700 active:bg-neutral-600"
                        accessibilityLabel="Ver atividade"
                      >
                        <Ionicons name="time-outline" size={18} color={colors.neutral[100]} />
                      </Pressable>
                      {family.role !== 'member' ? (
                        <Pressable
                          onPress={() => setInviteFor(family)}
                          className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700 active:bg-neutral-600"
                          accessibilityLabel="Compartilhar convite"
                        >
                          <Ionicons name="share-social-outline" size={18} color={colors.neutral[100]} />
                        </Pressable>
                      ) : null}
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

      <InviteQrModal
        visible={inviteFor !== null}
        familyId={inviteFor?.id ?? ''}
        familyName={inviteFor?.name?.trim() || 'Família sem nome'}
        onClose={() => setInviteFor(null)}
      />

      <ActivityModal
        visible={activityFor !== null}
        familyId={activityFor?.id ?? ''}
        familyName={activityFor?.name?.trim() || 'Família sem nome'}
        onClose={() => setActivityFor(null)}
      />
    </Screen>
  );
}
