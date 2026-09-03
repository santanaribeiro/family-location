import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { PlaceFormModal } from '@/components/PlaceFormModal';
import { listPlaces, subscribePlaces } from '@/services/places';
import { useFamilyStore } from '@/stores/familyStore';
import { colors } from '@/theme';
import type { SavedPlace } from '@/types/database';
import { placeIconName } from '@/utils/placeIcons';

export default function PlacesScreen() {
  const { activeFamilyId } = useFamilyStore();
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [editing, setEditing] = useState<SavedPlace | null | undefined>(undefined);

  const load = useCallback(() => {
    if (!activeFamilyId) {
      setPlaces([]);
      return;
    }
    listPlaces(activeFamilyId)
      .then(setPlaces)
      .catch(() => {});
  }, [activeFamilyId]);

  useFocusEffect(useCallback(() => load(), [load]));

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribePlaces(load);
      return unsubscribe;
    }, [load]),
  );

  if (!activeFamilyId) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-sm">
          <Text variant="title">Locais</Text>
          <Text variant="muted" className="text-center">
            Crie ou selecione uma família na aba Família para ver os locais.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 gap-lg">
        <View className="flex-row items-center justify-between">
          <Text variant="title">Locais</Text>
          <Button title="+ Local" size="sm" onPress={() => setEditing(null)} />
        </View>

        {places.length === 0 ? (
          <Text variant="muted">
            Nenhum local salvo ainda. Toque em “+ Local” para adicionar casa, trabalho, escola, etc.
          </Text>
        ) : (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="gap-sm pb-lg">
              {places.map((place) => (
                <Pressable
                  key={place.id}
                  onPress={() => setEditing(place)}
                  className="flex-row items-center gap-md rounded-xl bg-neutral-800 px-md py-md active:bg-neutral-700"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-neutral-700">
                    <Ionicons name={placeIconName(place.icon)} size={20} color={colors.neutral[100]} />
                  </View>
                  <View className="flex-1">
                    <Text variant="body" className="font-semibold" numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text variant="muted">Raio de {place.radius}m</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <PlaceFormModal
        visible={editing !== undefined}
        familyId={activeFamilyId}
        place={editing}
        onClose={() => setEditing(undefined)}
        onSaved={load}
      />
    </Screen>
  );
}
