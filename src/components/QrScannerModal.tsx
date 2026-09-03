import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Chamado com o conteúdo bruto do QR (link ou token) assim que lido, uma única vez. */
  onScanned: (data: string) => void;
}

function Corner({ style }: { style: object }) {
  return <View style={[{ position: 'absolute', width: 26, height: 26 }, style]} />;
}

/** Leitor de QR em tela cheia. Só faz sentido nativo — a Web usa o campo de colar código. */
export function QrScannerModal({ visible, onClose, onScanned }: QrScannerModalProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    scannedRef.current = false;
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleScan(result: { data: string }) {
    if (scannedRef.current) return;
    scannedRef.current = true;
    onScanned(result.data);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-md px-xl">
            <Text variant="body" className="text-center">
              Precisamos da câmera para ler o QR code do convite.
            </Text>
            <Button title="Permitir câmera" onPress={() => void requestPermission()} />
          </View>
        )}

        <Pressable
          onPress={onClose}
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ position: 'absolute', top: insets.top + 8, left: 20, backgroundColor: 'rgba(255,255,255,0.12)' }}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>

        {permission?.granted ? (
          <>
            <View style={{ position: 'absolute', top: '38%', left: '50%', marginLeft: -110, width: 220, height: 220 }}>
              <Corner style={{ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#FFFFFF', borderTopLeftRadius: 6 }} />
              <Corner style={{ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#FFFFFF', borderTopRightRadius: 6 }} />
              <Corner style={{ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#FFFFFF', borderBottomLeftRadius: 6 }} />
              <Corner style={{ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#FFFFFF', borderBottomRightRadius: 6 }} />
            </View>

            <View style={{ position: 'absolute', left: 24, right: 24, bottom: 120 }}>
              <Text className="text-center" style={{ color: '#FFFFFF' }}>
                Aponte a câmera para o QR code
              </Text>
            </View>

            <Pressable onPress={onClose} style={{ position: 'absolute', left: 24, right: 24, bottom: 52 }}>
              <Text variant="muted" className="text-center" style={{ textDecorationLine: 'underline' }}>
                Ou digite o código
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
}
