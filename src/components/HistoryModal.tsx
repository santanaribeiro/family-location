import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Text } from '@/components';
import HistoryMap from '@/components/HistoryMap';
import { listHistory, type HistoryPoint } from '@/services/history';
import { colors } from '@/theme';

interface HistoryModalProps {
  visible: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
}

const DAY_COUNT = 7;
const SCRUBBER_MAX = 40;

function dayLabel(offset: number, date: Date): string {
  if (offset === 0) return 'Hoje';
  if (offset === 1) return 'Ontem';
  const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function haversineMeters(a: HistoryPoint, b: HistoryPoint): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function HistoryModal({ visible, userId, userName, onClose }: HistoryModalProps) {
  const insets = useSafeAreaInsets();
  const days = useMemo(() => {
    return Array.from({ length: DAY_COUNT }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      return { offset, date, label: dayLabel(offset, date) };
    });
  }, []);
  const [dayIndex, setDayIndex] = useState(0);
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDayIndex(0);
  }, [visible, userId]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSelectedIndex(null);
    listHistory(userId, days[dayIndex].date)
      .then(setPoints)
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [visible, userId, dayIndex, days]);

  const scrubberIndices = useMemo(() => {
    if (points.length <= SCRUBBER_MAX) return points.map((_, i) => i);
    const step = points.length / SCRUBBER_MAX;
    return Array.from({ length: SCRUBBER_MAX }, (_, i) => Math.min(points.length - 1, Math.round(i * step)));
  }, [points]);

  const totalDistance = useMemo(() => {
    let sum = 0;
    for (let i = 1; i < points.length; i++) sum += haversineMeters(points[i - 1], points[i]);
    return sum;
  }, [points]);

  const summary =
    points.length === 0
      ? 'Sem pontos registrados neste dia.'
      : `${formatTime(points[0].recorded_at)} – ${formatTime(points[points.length - 1].recorded_at)} · ${(totalDistance / 1000).toFixed(1)} km percorridos`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-neutral-900" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}>
        <View className="flex-row items-center gap-sm px-lg pb-md">
          <Pressable onPress={onClose} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.neutral[100]} />
          </Pressable>
          <Avatar name={userName} size={34} />
          <Text variant="body" className="font-semibold">
            Histórico de {userName}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-md flex-none"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {days.map((d) => {
            const active = d.offset === dayIndex;
            return (
              <Pressable
                key={d.offset}
                onPress={() => setDayIndex(d.offset)}
                className={`rounded-full px-md py-sm ${active ? 'bg-neutral-50' : 'bg-neutral-800 border border-neutral-700'}`}
              >
                <Text style={{ color: active ? colors.neutral[900] : colors.neutral[100], fontWeight: '600', fontSize: 13 }}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="flex-1">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.neutral[400]} />
            </View>
          ) : (
            <HistoryMap points={points} selectedIndex={selectedIndex} />
          )}
        </View>

        <View className="gap-sm bg-neutral-800 px-lg pb-sm pt-md">
          <Text variant="muted">{summary}</Text>
          {selectedIndex != null && points[selectedIndex] ? (
            <Text variant="subtitle">{formatTime(points[selectedIndex].recorded_at)}</Text>
          ) : null}
          {points.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {scrubberIndices.map((idx) => {
                const active = selectedIndex === idx;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => setSelectedIndex(idx)}
                    className="items-center justify-center rounded-full"
                    style={{
                      width: active ? 14 : 8,
                      height: active ? 14 : 8,
                      backgroundColor: active ? colors.neutral[50] : colors.neutral[600],
                    }}
                  />
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
