import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { colors } from '@/constants/colors';
import { Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

export function FormField({ label, children, note }: { label: string, children: React.ReactNode, note?: string }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {note && <Text style={styles.fieldNote}>{note}</Text>}
    </View>
  );
}

export function TextInputField({ value, onChangeText, placeholder, multiline, ...props }: any) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.multilineInput]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      multiline={multiline}
      {...props}
    />
  );
}

export function ChoiceChip({ label, selected, onPress }: any) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function MultiChoice({ options, selected, onChange }: { options: string[], selected: string[], onChange: (v: string[]) => void }) {
  return (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const isSelected = selected.includes(opt);
        return (
          <ChoiceChip
            key={opt}
            label={opt}
            selected={isSelected}
            onPress={() => {
              if (isSelected) {
                onChange(selected.filter(s => s !== opt));
              } else {
                onChange([...selected, opt]);
              }
            }}
          />
        );
      })}
    </View>
  );
}

export function SingleChoice({ options, selected, onChange }: { options: string[], selected: string, onChange: (v: string) => void }) {
  return (
    <View style={styles.chipRow}>
      {options.map(opt => (
        <ChoiceChip
          key={opt}
          label={opt}
          selected={selected === opt}
          onPress={() => onChange(opt)}
        />
      ))}
    </View>
  );
}

export function CustomSlider({ value, onValueChange, minimumValue = 0, maximumValue = 10 }: any) {
  const [width, setWidth] = React.useState(0);
  const progress = useSharedValue(value / maximumValue);

  const gesture = Gesture.Pan().onUpdate((e) => {
    if (width === 0) return;
    let newValue = (e.x) / width;
    newValue = Math.max(0, Math.min(1, newValue));
    progress.value = newValue;
    const finalValue = Math.round(newValue * maximumValue);
    runOnJS(onValueChange)(finalValue);
  });

  const trackStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: progress.value * width - 12 }]
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.sliderContainer} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={styles.sliderTrack} />
        <Animated.View style={[styles.sliderFill, trackStyle]} />
        <Animated.View style={[styles.sliderThumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  fieldNote: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 16,
    color: colors.text,
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.labels,
    borderColor: colors.labels,
  },
  chipText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.background,
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    marginVertical: 10,
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.card,
    width: '100%',
    position: 'absolute',
  },
  sliderFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.labels,
    position: 'absolute',
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  }
});
