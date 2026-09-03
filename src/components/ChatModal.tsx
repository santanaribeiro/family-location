import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Input, Text } from '@/components';
import { useAuth } from '@/services/auth';
import { deleteMessage, listMessages, sendMessage, subscribeMessages, type ChatMessage } from '@/services/chat';
import { useChatStore } from '@/stores/chatStore';
import { colors } from '@/theme';
import { confirmAsync, notify } from '@/utils/alert';

interface ChatModalProps {
  visible: boolean;
  familyId: string;
  familyName: string;
  memberCount: number;
  /** Owner/admin podem apagar mensagem de qualquer um; a RPC também garante isso no servidor. */
  canModerate: boolean;
  onClose: () => void;
}

export function ChatModal({ visible, familyId, familyName, memberCount, canModerate, onClose }: ChatModalProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const markRead = useChatStore((s) => s.markRead);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const refresh = () => {
      listMessages(familyId)
        .then((list) => {
          setMessages(list);
          const last = list[list.length - 1];
          if (last) markRead(familyId, last.created_at);
          requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
        })
        .catch(() => {});
    };
    refresh();
    const unsubscribe = subscribeMessages(familyId, refresh);
    return unsubscribe;
  }, [visible, familyId, markRead]);

  async function handleSend() {
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      setSending(true);
      await sendMessage(familyId, body);
    } catch (error) {
      notify('Mensagem', error instanceof Error ? error.message : 'Erro ao enviar.');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(message: ChatMessage) {
    const isOwn = message.user_id === user?.id;
    if (!isOwn && !canModerate) return;
    const ok = await confirmAsync('Apagar mensagem', 'Deseja apagar esta mensagem?', 'Apagar');
    if (!ok) return;
    try {
      await deleteMessage(message.id);
    } catch (error) {
      notify('Mensagem', error instanceof Error ? error.message : 'Erro ao apagar.');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-neutral-900"
        style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}
      >
        <View className="flex-row items-center gap-sm border-b border-neutral-800 px-lg pb-md">
          <Pressable onPress={onClose} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.neutral[100]} />
          </Pressable>
          <Avatar name={familyName} size={34} />
          <View>
            <Text variant="body" className="font-semibold">
              {familyName}
            </Text>
            <Text variant="caption">
              {memberCount} {memberCount === 1 ? 'membro' : 'membros'}
            </Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} className="flex-1 px-lg" contentContainerStyle={{ paddingVertical: 16, gap: 12 }}>
          {messages.map((message) => {
            const isOwn = message.user_id === user?.id;
            const deleted = message.deleted_at != null;
            const senderName = message.user?.name ?? message.user?.email ?? 'Membro';
            return (
              <Pressable
                key={message.id}
                onLongPress={() => !deleted && handleDelete(message)}
                className={`max-w-[84%] flex-row gap-sm ${isOwn ? 'self-end flex-row-reverse' : 'self-start'}`}
              >
                {!isOwn ? <Avatar name={senderName} size={28} className="mt-1" /> : null}
                <View
                  className={`rounded-lg px-md py-sm ${isOwn ? 'bg-neutral-700' : 'bg-neutral-800'}`}
                  style={isOwn ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }}
                >
                  {!isOwn ? (
                    <Text variant="caption" className="mb-0.5 font-bold">
                      {senderName}
                    </Text>
                  ) : null}
                  <Text variant="body" className={deleted ? 'italic text-neutral-400' : undefined}>
                    {deleted ? 'Mensagem apagada' : message.body}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="flex-row items-center gap-sm px-lg pt-sm">
          <Input
            placeholder="Mensagem…"
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
            className="flex-1"
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !text.trim()}
            className="h-11 w-11 items-center justify-center rounded-full bg-neutral-700"
            style={{ opacity: sending || !text.trim() ? 0.5 : 1 }}
          >
            <Ionicons name="send" size={18} color={colors.neutral[100]} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
