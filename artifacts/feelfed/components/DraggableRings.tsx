import React, { useMemo, useRef } from 'react';
import { Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { colors } from '@/constants/colors';

const SIZE = Math.min(Dimensions.get('window').width - 52, 340);
const C = SIZE / 2;
const START = 220;
const SWEEP = 280;
const RADII = [SIZE * .405, SIZE * .32, SIZE * .235];
function point(radius: number, degrees: number) {
  const angle = (degrees - 90) * Math.PI / 180;
  return { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) };
}
function arc(radius: number) {
  const a = point(radius, START), b = point(radius, START + SWEEP);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 1 1 ${b.x} ${b.y}`;
}
type Metric = { value: number; color: string; onChange?: (value: number) => void };
export function DraggableRings({ fullness = .5, energy = .5, hydration = .5, onFullnessChange, onEnergyChange, onHydrationChange }: {
  fullness?: number; energy?: number; hydration?: number;
  onFullnessChange?: (value: number) => void;
  onEnergyChange?: (value: number) => void;
  onHydrationChange?: (value: number) => void;
}) {
  const metrics: Metric[] = [
    { value: fullness, color: colors.fullness, onChange: onFullnessChange },
    { value: energy, color: colors.energy, onChange: onEnergyChange },
    { value: hydration, color: colors.hydration, onChange: onHydrationChange },
  ];
  const callbacks = useRef(metrics);
  callbacks.current = metrics;
  const active = useRef<number | null>(null);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: event => {
      const x = event.nativeEvent.locationX - C, y = event.nativeEvent.locationY - C;
      const distance = Math.sqrt(x * x + y * y);
      const candidate = RADII.findIndex(r => Math.abs(distance - r) < 24);
      active.current = candidate >= 0 ? candidate : null;
      return candidate >= 0;
    },
    onMoveShouldSetPanResponder: () => active.current !== null,
    onPanResponderMove: event => {
      if (active.current === null) return;
      const x = event.nativeEvent.locationX - C, y = event.nativeEvent.locationY - C;
      let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
      if (angle < 0) angle += 360;
      if (angle < START) angle += 360;
      const amount = Math.max(0, Math.min(10, Math.round((angle - START) / SWEEP * 10))) / 10;
      callbacks.current[active.current].onChange?.(amount);
    },
    onPanResponderRelease: () => { active.current = null; },
    onPanResponderTerminate: () => { active.current = null; },
  }), []);
  const waterY = 83 - fullness * 36;
  const waterColor = hydration < .4 ? colors.peach : colors.hydration;
  return (
    <View style={styles.container} {...responder.panHandlers} accessibilityLabel="Drag the fullness, energy, or hydration ring to record a value from zero to ten">
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {metrics.map((metric, index) => {
          const radius = RADII[index], length = SWEEP / 360 * 2 * Math.PI * radius;
          const knob = point(radius, START + metric.value * SWEEP);
          return <React.Fragment key={index}>
            <Path d={arc(radius)} fill="none" stroke={colors.border} strokeWidth="12" strokeLinecap="round" />
            <Path d={arc(radius)} fill="none" stroke={metric.color} strokeOpacity={.18 + metric.value * .27} strokeWidth={22} strokeLinecap="round" strokeDasharray={`${length} ${length}`} strokeDashoffset={length * (1 - metric.value)} />
            <Path d={arc(radius)} fill="none" stroke={metric.color} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${length} ${length}`} strokeDashoffset={length * (1 - metric.value)} />
            <Circle cx={knob.x} cy={knob.y} r="11" fill={metric.color} stroke={colors.background} strokeWidth="3" />
          </React.Fragment>;
        })}
        <G transform={`translate(${C - 47}, ${C - 47}) scale(0.94)`}>
          <Defs><ClipPath id="bowl"><Path d="M 25 45 Q 50 54 75 45 C 73 77 63 88 50 88 C 37 88 27 77 25 45 Z" /></ClipPath></Defs>
          <Path d="M 25 45 Q 50 54 75 45 C 73 77 63 88 50 88 C 37 88 27 77 25 45 Z" fill={colors.brandTeal} stroke={colors.labels} strokeWidth="2" />
          <Rect x="25" y={waterY} width="50" height="48" fill={waterColor} opacity={.28 + hydration * .38} clipPath="url(#bowl)" />
          <Path d="M 25 45 Q 50 54 75 45" fill="none" stroke={colors.text} strokeWidth="2" />
          <Path d="M 49 45 C 35 39 34 24 29 23 C 40 22 48 29 49 45 Z" fill={colors.fullness} />
          <Path d="M 51 45 C 65 39 66 24 71 23 C 60 22 52 29 51 45 Z" fill={colors.labels} />
          <Circle cx="50" cy="47" r={3 + energy * 2} fill={colors.peach} opacity={.5 + energy * .5} />
        </G>
      </Svg>
    </View>
  );
}
const styles = StyleSheet.create({ container: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' } });