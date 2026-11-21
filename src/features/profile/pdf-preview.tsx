import Constants, { ExecutionEnvironment } from 'expo-constants';
import type Pdf from 'react-native-pdf';

import { Body } from '@/components/campus';

export function PdfPreview({ uri, onError }: { uri: string; onError: () => void }) {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return <Body>Open this guide in a DueTogether development build to preview the PDF.</Body>;
  }
  // Loading the native module only here keeps other screens usable in Expo Go.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const NativePdf = (require('react-native-pdf') as { default: typeof Pdf }).default;
  return <NativePdf source={{ uri }} style={{ flex: 1, width: '100%' }} onError={onError} trustAllCerts={false} />;
}
