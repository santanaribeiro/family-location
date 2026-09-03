import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Button, Input, Text } from '@/components';
import PlacePickerMap from '@/components/PlacePickerMap';
import { getCurrent } from '@/services/location';
import { createPlace, deletePlace, updatePlace } from '@/services/places';
import { colors } from '@/theme';
import type { SavedPlace } from '@/types/database';
import { confirmAsync, notify } from '@/utils/alert';
import { DEFAULT_PLACE_ICON, PLACE_ICONS, placeIconName } from '@/utils/placeIcons';

const DEFAULT_COORD = { latitude: -23.5505, longitude: -46.6333 };
const RADIUS_STEP = 50;
const RADIUS_MIN = 10;
const RADIUS_MAX = 5000;

interface PlaceFormModalProps {
  visible: boolean;
  familyId: string;
  /** Presente = editar; ausente = criar. */
  place?: SavedPlace | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PlaceFormModal({ visible, familyId, place, onClose, onSaved }: PlaceFormModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_PLACE_ICON);
  const [coord, setCoord] = useState(DEFAULT_COORD);
  const [radius, setRadius] = useState(100);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (place) {
      setName(place.name);
      setIcon(placeIconName(place.icon));
      setCoord({ latitude: place.latitude, longitude: place.longitude });
      setRadius(place.radius);
      return;
    }
    setName('');
    setIcon(DEFAULT_PLACE_ICON);
    setRadius(100);
    setCoord(DEFAULT_COORD);
    getCurrent()
      .then((loc) => {
        if (loc) setCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      })
      .catch(() => {});
  }, [visible, place]);

  function close() {
    setBusy(false);
    onClose();
  }

  async function handleSave() {
    if (!name.trim()) return;
    try {
      setBusy(true);
      const input = { name, latitude: coord.latitude, longitude: coord.longitude, radius, icon };
      if (place) {
        await updatePlace(place.id, input);
      } else {
        await createPlace(familyId, input);
      }
      onSaved();
      close();
    } catch (error) {
      notify('Local', error instanceof Error ? error.message : 'Erro ao salvar o local.');
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!place) return;
    const ok = await confirmAsync('Excluir local', `Deseja excluir “${place.name}”?`, 'Excluir');
    if (!ok) return;
    try {
      setBusy(true);
      await deletePlace(place.id);
      onSaved();
      close();
    } catch (error) {
      notify('Local', error instanceof Error ? error.message : 'Erro ao excluir o local.');
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable onPress={close} className="flex-1 justify-center px-lg" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable onPress={() => {}}>
          <ScrollView className="max-h-full rounded-xl bg-neutral-800" contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Text variant="subtitle">{place ? 'Editar local' : 'Novo local'}</Text>

            <Input placeholder="Nome do local" value={name} onChangeText={setName} autoFocus={!place} />

            <View className="gap-sm">
              <Text variant="caption">Ícone</Text>
              <View className="flex-row flex-wrap gap-sm">
                {PLACE_ICONS.map((opt) => {
                  const active = opt.name === icon;
                  return (
                    <Pressable
                      key={opt.name}
                      onPress={() => setIcon(opt.name)}
                      accessibilityLabel={opt.label}
                      className={`h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-brand-500' : 'bg-neutral-700'}`}
                    >
                      <Ionicons name={opt.name} size={20} color={colors.neutral[100]} />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="gap-sm">
              <Text variant="caption">Toque no mapa (ou arraste o pino) para definir a coordenada</Text>
              <PlacePickerMap
                latitude={coord.latitude}
                longitude={coord.longitude}
                radius={radius}
                onChangeCoordinate={setCoord}
              />
            </View>

            <View className="gap-sm">
              <Text variant="caption">Raio</Text>
              <View className="flex-row items-center gap-md">
                <Pressable
                  onPress={() => setRadius((r) => Math.max(RADIUS_MIN, r - RADIUS_STEP))}
                  className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700 active:bg-neutral-600"
                  accessibilityLabel="Diminuir raio"
                >
                  <Ionicons name="remove" size={18} color={colors.neutral[100]} />
                </Pressable>
                <Text variant="body" className="w-16 text-center font-semibold">
                  {radius}m
                </Text>
                <Pressable
                  onPress={() => setRadius((r) => Math.min(RADIUS_MAX, r + RADIUS_STEP))}
                  className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700 active:bg-neutral-600"
                  accessibilityLabel="Aumentar raio"
                >
                  <Ionicons name="add" size={18} color={colors.neutral[100]} />
                </Pressable>
              </View>
            </View>

            <View className="flex-row gap-sm">
              <Button title="Cancelar" variant="ghost" onPress={close} className="flex-1" disabled={busy} />
              <Button title="Salvar" onPress={handleSave} loading={busy} className="flex-1" />
            </View>

            {place ? (
              <Button title="Excluir local" variant="secondary" onPress={handleDelete} disabled={busy} />
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
