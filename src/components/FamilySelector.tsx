import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/Text';
import { shadows } from '@/theme';
import type { FamilyWithRole } from '@/services/family';

interface FamilySelectorProps {
  families: FamilyWithRole[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Seletor horizontal de famílias (chips) exibido sobre o mapa. */
export function FamilySelector({ families, activeId, onSelect }: FamilySelectorProps) {
  if (families.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
    >
      {families.map((family) => {
        const active = family.id === activeId;
        return (
          <Pressable
            key={family.id}
            onPress={() => onSelect(family.id)}
            style={shadows.sm}
            className={`rounded-full border px-lg py-sm ${
              active
                ? 'border-brand-500 bg-brand-500'
                : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'
            }`}
          >
            <Text className={active ? 'font-semibold text-white' : 'text-neutral-800 dark:text-neutral-100'}>
              {family.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
