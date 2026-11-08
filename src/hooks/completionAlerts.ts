import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { CompletionNative } from './completionAlerts.types';

const candidate = Platform.OS === 'android' ? requireOptionalNativeModule<CompletionNative>('CronoCompletionAlerts') : null;
export const completionAlerts = candidate?.protocolVersion === 1 ? candidate : null;
