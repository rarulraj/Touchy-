import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { LiveActivity } from 'expo-widgets';
import type { TouchyActivityProps } from '@/island/TouchyActivity';

let activity: LiveActivity<TouchyActivityProps> | null = null;
let lastDetail = 'Circle the screen. I will walk you through the next tap.';

export function say(text: string) {
  const line = text.replace(/\s+/g, ' ').trim();
  if (!line) return;
  const headline = line.split(/(?<=[.!?])\s/)[0] ?? line;
  lastDetail = headline.slice(0, 90);
  showOnNotch('touchy', lastDetail);
  void Speech.stop();
  Speech.speak(line.slice(0, 420), { language: 'en-US', rate: 0.96 });
}

export function showOnNotch(title: string, detail: string) {
  if (Platform.OS !== 'ios') return;
  lastDetail = detail.slice(0, 90);
  void push(title.slice(0, 24), lastDetail);
}

export function notchStillHere() {
  showOnNotch('with you', lastDetail || 'I stayed on the notch.');
}

async function push(title: string, detail: string) {
  try {
    const { default: TouchyActivity } = await import('@/island/TouchyActivity');
    const props = { title, detail };
    if (!activity) {
      activity = TouchyActivity.getInstances()[0] ?? TouchyActivity.start(props, 'touchy://');
      return;
    }
    activity.update(props);
  } catch {
    activity = null;
  }
}
