import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type TouchyActivityProps = {
  title: string;
  detail: string;
};

const TouchyActivity = (props: TouchyActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const ink = environment.isLuminanceReduced ? '#FFFFFF' : '#FF4B3E';
  return {
    banner: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'bold' }), foregroundStyle(ink)]}>{props.title}</Text>
        <Text>{props.detail}</Text>
      </VStack>
    ),
    compactLeading: <Image systemName="waveform" color={ink} />,
    compactTrailing: <Text modifiers={[font({ size: 12, weight: 'bold' })]}>touchy</Text>,
    minimal: <Image systemName="waveform" color={ink} />,
    expandedCenter: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ weight: 'bold' })]}>{props.title}</Text>
        <Text modifiers={[font({ size: 12 })]}>{props.detail}</Text>
      </VStack>
    ),
  };
};

export default createLiveActivity('TouchyActivity', TouchyActivity);
