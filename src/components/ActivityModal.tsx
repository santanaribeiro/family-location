import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { useAuth } from '@/services/auth';
import { listAuditLog, type AuditLogRow } from '@/services/audit';
import { colors } from '@/theme';
import { AUDIT_ICON, describeAuditEntry } from '@/utils/auditLog';
import { timeAgo } from '@/utils/time';

interface ActivityModalProps {
  visible: boolean;
  familyId: string;
  familyName: string;
  onClose: () => void;
}

/** Tela de atividade da família: log de auditoria só de leitura, paginado. */
export function ActivityModal({ visible, familyId, familyName, onClose }: ActivityModalProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<AuditLogRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    listAuditLog(familyId)
      .then((page) => {
        setEntries(page.items);
        setCursor(page.nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, familyId]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const page = await listAuditLog(familyId, cursor);
      setEntries((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      // silencioso — usuário pode tentar "Carregar mais" de novo
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-neutral-900" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}>
        <View className="flex-row items-center gap-md px-lg pb-md">
          <Pressable onPress={onClose} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.neutral[100]} />
          </Pressable>
          <View>
            <Text variant="subtitle">Atividade</Text>
            <Text variant="muted">{familyName}</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-lg" showsVerticalScrollIndicator={false}>
          {loading ? (
            <Text variant="muted">Carregando…</Text>
          ) : entries.length === 0 ? (
            <Text variant="muted">Nenhuma atividade registrada ainda.</Text>
          ) : (
            <View>
              {entries.map((entry) => (
                <View key={entry.id} className="flex-row gap-md border-b border-neutral-800 py-md">
                  <View className="h-8 w-8 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800">
                    <Ionicons name={AUDIT_ICON[entry.action]} size={14} color={colors.neutral[400]} />
                  </View>
                  <View className="flex-1 gap-xs pt-0.5">
                    <Text variant="body">{describeAuditEntry(entry, user?.id ?? '')}</Text>
                    <Text variant="caption">{timeAgo(entry.created_at)}</Text>
                  </View>
                </View>
              ))}
              {cursor ? (
                <Button
                  title="Carregar mais"
                  variant="ghost"
                  onPress={loadMore}
                  loading={loadingMore}
                  className="mt-sm self-center"
                />
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
