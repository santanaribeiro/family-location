import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const PLACE_ICONS: { name: IoniconName; label: string }[] = [
  { name: 'home', label: 'Casa' },
  { name: 'briefcase', label: 'Trabalho' },
  { name: 'school', label: 'Escola' },
  { name: 'fitness', label: 'Academia' },
  { name: 'cart', label: 'Mercado' },
  { name: 'restaurant', label: 'Restaurante' },
  { name: 'medical', label: 'Saúde' },
  { name: 'star', label: 'Favorito' },
];

export const DEFAULT_PLACE_ICON: IoniconName = 'location';

export function placeIconName(icon: string | null | undefined): IoniconName {
  return (PLACE_ICONS.find((p) => p.name === icon)?.name ?? DEFAULT_PLACE_ICON) as IoniconName;
}
