import { useVoice } from '@/voice/store';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useEffect } from 'react';

export function VoiceHost() {
  useEffect(() => {
    if (!requireOptionalNativeModule('ExpoSpeechRecognition')) return;
    let cancelled = false;
    const subscriptions: { remove: () => void }[] = [];
    void import('expo-speech-recognition').then((mod) => {
        if (cancelled) return;
        const speech = mod.ExpoSpeechRecognitionModule;
        subscriptions.push(
          speech.addListener('start', () => useVoice.getState().setListening(true)),
          speech.addListener('end', () => useVoice.getState().setListening(false)),
          speech.addListener('error', () => useVoice.getState().setListening(false)),
          speech.addListener('result', (event) => {
            const text = event.results[0]?.transcript ?? '';
            useVoice.getState().setHeard(text);
            if (event.isFinal && text.trim()) useVoice.getState().onFinal?.(text.trim());
          }),
        );
        useVoice.setState({
          available: true,
          toggle: async () => {
            if (useVoice.getState().listening) {
              speech.stop();
              return;
            }
            const permission = await speech.requestPermissionsAsync();
            if (!permission.granted) return;
            useVoice.getState().setHeard('');
            speech.start({ lang: 'en-US', interimResults: true, continuous: false });
          },
        });
      })
      .catch(() => {
        useVoice.getState().setAvailable(false);
      });
    return () => {
      cancelled = true;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);
  return null;
}
