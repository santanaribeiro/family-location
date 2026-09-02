import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useAuth } from '@/services/auth';
import {
  acceptInvite,
  createFamily,
  createInvite,
  leaveFamily,
  listMembers,
  listMyFamilies,
  removeMember,
  type FamilyWithRole,
  type MemberWithUser,
} from '@/services/family';
import { useFamilyStore } from '@/stores/familyStore';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Algo deu errado.';
}

export default function FamilyScreen() {
  const { user } = useAuth();
  const { activeFamilyId, setActiveFamily } = useFamilyStore();

  const [families, setFamilies] = useState<FamilyWithRole[]>([]);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const active = families.find((f) => f.id === activeFamilyId) ?? null;
  const canManage = active?.role === 'owner' || active?.role === 'admin';

  const loadFamilies = useCallback(async () => {
    const list = await listMyFamilies();
    setFamilies(list);
    if (list.length === 0) {
      setActiveFamily(null);
    } else if (!list.some((f) => f.id === activeFamilyId)) {
      setActiveFamily(list[0].id);
    }
  }, [activeFamilyId, setActiveFamily]);

  useEffect(() => {
    loadFamilies()
      .catch((error) => Alert.alert('Famílias', errorMessage(error)))
      .finally(() => setLoading(false));
    // Carrega uma vez ao montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeFamilyId) {
      setMembers([]);
      return;
    }
    listMembers(activeFamilyId)
      .then(setMembers)
      .catch((error) => Alert.alert('Membros', errorMessage(error)));
  }, [activeFamilyId]);

  async function run(action: () => Promise<void>) {
    try {
      setBusy(true);
      await action();
    } catch (error) {
      Alert.alert('Erro', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const handleCreate = () =>
    run(async () => {
      if (!newName.trim()) return;
      const created = await createFamily(newName);
      setNewName('');
      await loadFamilies();
      setActiveFamily(created.id);
    });

  const handleJoin = () =>
    run(async () => {
      if (!inviteCode.trim()) return;
      await acceptInvite(inviteCode);
      setInviteCode('');
      await loadFamilies();
    });

  const handleInvite = () =>
    run(async () => {
      if (!active) return;
      const token = await createInvite(active.id);
      await Share.share({
        message: `Entre na família "${active.name}" no Family Location.\nCódigo do convite: ${token}`,
      });
    });

  const handleLeave = () => {
    if (!active || !user) return;
    Alert.alert('Sair da família', `Deseja sair de "${active.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await leaveFamily(active.id, user.id);
            await loadFamilies();
          }),
      },
    ]);
  };

  const handleRemove = (member: MemberWithUser) =>
    run(async () => {
      await removeMember(member.id);
      if (activeFamilyId) setMembers(await listMembers(activeFamilyId));
    });

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView className="flex-1">
        <View className="gap-lg px-lg py-lg">
          <Text variant="title">Famílias</Text>

          {families.length > 0 ? (
            <View className="gap-sm">
              {families.map((family) => (
                <Button
                  key={family.id}
                  title={`${family.id === activeFamilyId ? '● ' : ''}${family.name}  ·  ${family.role}`}
                  variant={family.id === activeFamilyId ? 'primary' : 'secondary'}
                  onPress={() => setActiveFamily(family.id)}
                />
              ))}
            </View>
          ) : (
            <Text variant="muted">
              Você ainda não participa de nenhuma família. Crie uma ou entre com um código.
            </Text>
          )}

          {active ? (
            <View className="gap-sm">
              <Text variant="subtitle">Membros de {active.name}</Text>
              {members.map((member) => (
                <View
                  key={member.id}
                  className="flex-row items-center justify-between rounded-lg bg-neutral-100 px-md py-sm dark:bg-neutral-800"
                >
                  <View className="flex-1 pr-sm">
                    <Text variant="body">{member.user?.name ?? member.user?.email ?? member.user_id}</Text>
                    <Text variant="caption">{member.role}</Text>
                  </View>
                  {canManage && member.user_id !== user?.id ? (
                    <Button title="Remover" variant="ghost" size="sm" onPress={() => handleRemove(member)} />
                  ) : null}
                </View>
              ))}
              <View className="flex-row gap-sm">
                {canManage ? (
                  <Button title="Convidar" onPress={handleInvite} loading={busy} className="flex-1" />
                ) : null}
                <Button title="Sair" variant="secondary" onPress={handleLeave} className="flex-1" />
              </View>
            </View>
          ) : null}

          <View className="gap-sm">
            <Text variant="subtitle">Criar família</Text>
            <Input placeholder="Nome da família" value={newName} onChangeText={setNewName} />
            <Button title="Criar" onPress={handleCreate} loading={busy} />
          </View>

          <View className="gap-sm">
            <Text variant="subtitle">Entrar com um código</Text>
            <Input
              placeholder="Cole o código do convite"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
            />
            <Button title="Entrar" variant="secondary" onPress={handleJoin} loading={busy} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
