import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert` é um no-op no react-native-web (não existe diálogo nativo do browser
 * embutido) — usar sempre estes helpers no lugar de `Alert.alert` direto para que
 * confirmações e avisos funcionem também na web.
 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** Confirmação com Cancelar/Confirmar; resolve `true` se confirmado. */
export function confirmAsync(title: string, message: string, confirmLabel = 'Confirmar'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
