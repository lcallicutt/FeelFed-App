import React from 'react';
import { Stack as ExpoStack, useRouter } from 'expo-router';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { Feather } from '@expo/vector-icons';

export default function LogLayout() {
  const router = useRouter();

  return (
    <ExpoStack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        headerLeft: () => (
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Feather name="x" size={24} color={colors.text} />
          </Pressable>
        ),
      }}
    >
      <ExpoStack.Screen name="ate" options={{ title: 'Log Food' }} />
      <ExpoStack.Screen name="drink" options={{ title: 'Log Drink' }} />
      <ExpoStack.Screen name="energy" options={{ title: 'Log Energy' }} />
      <ExpoStack.Screen name="moved" options={{ title: 'Log Movement' }} />
      <ExpoStack.Screen name="note" options={{ title: 'Edit Note' }} />
    </ExpoStack>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    padding: 8,
    marginLeft: -8,
  }
});
