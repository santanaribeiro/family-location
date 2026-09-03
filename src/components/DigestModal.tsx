import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Text } from '@/components';
import { getFamilyDigest, type DigestEntry, type DigestPeriod } from '@/services/digest';
import { listMembers, type MemberWithUser } from '@/services/family';
import { colors } from '@/theme';

interface DigestModalProps {
  visible: boolean;
  familyId: string;
  selfId: string;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function summaryLine(entry: DigestEntry): string {
  const km = (entry.distanceMeters / 1000).toFixed(1);
  const parts = [`${km} km`, `${entry.placesVisited} ${entry.placesVisited === 1 ? 'local' : 'locais'}`];
  if (entry.lastEventAt && entry.lastPlaceName) {
    const verb = entry.lastEventType === 'enter' ? 'chegou em' : 'saiu de';
    parts.push(`${verb} ${entry.lastPlaceName} às ${formatTime(entry.lastEventAt)}`);
  }
  return parts.join(' · ');
}

export function DigestModal({ visible, familyId, selfId, onClose }: DigestModalProps) {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<DigestPeriod>('today');
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [entries, setEntries] = useState<DigestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([listMembers(familyId), getFamilyDigest(familyId, period)])
      .then(([m, d]) => {
        setMembers(m);
        setEntries(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, familyId, period]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-neutral-900" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}>
        <View className="flex-row items-center gap-md px-lg pb-md">
          <Pressable onPress={onClose} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.neutral[100]} />
          </Pressable>
          <Text variant="subtitle">Resumo</Text>
        </View>

        <View className="mx-lg mb-md flex-row gap-xs rounded-full bg-neutral-800 p-1">
          <Pressable
            onPress={() => setPeriod('today')}
            className={`flex-1 items-center rounded-full py-sm ${period === 'today' ? 'bg-neutral-700' : ''}`}
          >
            <Text className="font-semibold">Diário</Text>
          </Pressable>
          <Pressable
            onPress={() => setPeriod('week')}
            className={`flex-1 items-center rounded-full py-sm ${period === 'week' ? 'bg-neutral-700' : ''}`}
          >
            <Text className="font-semibold">Semanal</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-lg" showsVerticalScrollIndicator={false}>
          {loading ? (
            <View className="items-center py-lg">
              <ActivityIndicator color={colors.neutral[400]} />
            </View>
          ) : (
            members.map((member) => {
              const entry = entries.find((e) => e.userId === member.user_id);
              const name = member.user_id === selfId ? 'Você' : (member.user?.name ?? member.user?.email ?? 'Membro');
              return (
                <View key={member.user_id} className="flex-row items-center gap-md border-b border-neutral-800 py-md">
                  <Avatar url={member.user?.avatar_url} name={member.user?.name ?? member.user?.email} size={40} />
                  <View className="flex-1">
                    <Text variant="body" className="font-semibold">
                      {name}
                    </Text>
                    <Text variant="muted">{entry ? summaryLine(entry) : 'Sem dados neste período.'}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
