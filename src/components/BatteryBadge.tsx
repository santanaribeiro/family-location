import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { colors } from '@/theme';
import type { BatteryStateText } from '@/types/database';

export interface BatteryBadgeProps {
  level: number | null;
  state: BatteryStateText;
  /** Versão compacta (marcador no mapa): sem largura mínima reservada pro texto. */
  compact?: boolean;
}

function levelColor(pct: number): string {
  if (pct >= 50) return colors.success[500];
  if (pct >= 20) return colors.warning[500];
  return colors.danger[500];
}

/**
 * Badge de nível de bateria (ícone + gauge + porcentagem), única exceção de cor do
 * app (docs/FEATURES_NEXT.md §2). Não renderiza nada sem dado — nunca quebra o layout.
 */
export function BatteryBadge({ level, state, compact = false }: BatteryBadgeProps) {
  if (level == null) return null;
  const pct = Math.max(0, Math.min(100, Math.round(level * 100)));
  const color = levelColor(pct);
  const charging = state === 'charging' || state === 'full';

  return (
    <View className="flex-row items-center gap-xs">
      {charging ? <Ionicons name="flash" size={12} color={color} /> : null}
      <View className="flex-row items-center">
        <View
          style={{
            width: 21,
            height: 11,
            borderRadius: 3,
            borderWidth: 1.4,
            borderColor: colors.neutral[400],
            padding: 1.5,
          }}
        >
          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 1 }} />
        </View>
        <View
          style={{
            width: 2,
            height: 5,
            marginLeft: 1,
            backgroundColor: colors.neutral[400],
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />
      </View>
      <Text
        variant="caption"
        style={{ color, fontWeight: '600', textAlign: 'right', minWidth: compact ? undefined : 26 }}
      >
        {pct}%
      </Text>
    </View>
  );
}
