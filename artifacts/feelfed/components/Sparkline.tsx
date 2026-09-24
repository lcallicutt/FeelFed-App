import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function Sparkline({ data, color, width = 100, height = 30 }: { data: number[], color: string, width?: number, height?: number }) {
  if (data.length === 0) return <View style={{ width, height }} />;
  
  const valid = data.filter(Number.isFinite);
  if (!valid.length) return <View style={{ width, height }} />;
  const min = Math.min(...valid, 0);
  const max = Math.max(...valid, 10);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return Number.isFinite(val) ? { x, y } : null;
  });
  let drawing = false;
  const pathD = points.map(point => {
    if (!point) { drawing = false; return ''; }
    const command = drawing ? 'L' : 'M';
    drawing = true;
    return `${command} ${point.x},${point.y}`;
  }).join(' ');

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        <Path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
