import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/Text';
import { colors, shadows } from '@/theme';
import type { FamilyWithRole } from '@/services/family';

interface FamilySelectorProps {
  families: FamilyWithRole[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Dropdown de famílias: um botão com a família ativa que abre a lista para selecionar. */
export function FamilySelector({ families, activeId, onSelect }: FamilySelectorProps) {
  const [open, setOpen] = useState(false);
  const active = families.find((f) => f.id === activeId);

  if (families.length === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={shadows.sm}
        className="flex-row items-center gap-sm self-start rounded-full border border-neutral-700 bg-neutral-800 px-lg py-sm"
      >
        <Ionicons name="people" size={16} color={colors.brand[400]} />
        <Text className="font-semibold text-neutral-50">{active?.name ?? 'Selecionar família'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.neutral[400]} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 justify-center px-xl"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <Pressable onPress={() => {}} style={shadows.lg} className="rounded-xl bg-neutral-800 p-sm">
            <Text variant="subtitle" className="px-sm py-sm">
              Suas famílias
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {families.map((family) => {
                const isActive = family.id === activeId;
                return (
                  <Pressable
                    key={family.id}
                    onPress={() => {
                      onSelect(family.id);
                      setOpen(false);
                    }}
                    className={`flex-row items-center justify-between rounded-lg px-md py-md ${
                      isActive ? 'bg-neutral-700' : ''
                    }`}
                  >
                    <Text className={isActive ? 'font-semibold text-brand-400' : 'text-neutral-100'}>
                      {family.name}
                    </Text>
                    {isActive ? <Ionicons name="checkmark" size={18} color={colors.brand[400]} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
