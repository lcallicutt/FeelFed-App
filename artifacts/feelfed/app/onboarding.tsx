import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Switch, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useJournal } from '@/context/JournalContext';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import * as Notifications from 'expo-notifications';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { saveSettings } = useJournal();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const [reminders, setReminders] = useState(false);

  const handleFinish = async () => {
    let allowed = false;
    if (reminders && Platform.OS !== 'web') {
      const permission = await Notifications.requestPermissionsAsync();
      allowed = permission.granted;
      if (allowed) await Notifications.scheduleNotificationAsync({
        content: { title: 'FeelFed', body: 'A quiet moment to notice how your body feels.', data: { kind: 'gentle-reminder' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 12, minute: 0 },
      });
      else Alert.alert('Notifications are off', 'You can turn on gentle reminders later in You.');
    }
    await saveSettings({
      name: name.trim(),
      onboarded: true,
      reminders: allowed,
      ambientAnimation: true,
    });
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAwareScrollViewCompat 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
    >
      <View style={styles.iconContainer}><Feather name={step === 2 ? 'shield' : 'circle'} size={48} color={colors.primary} /></View>
      <Text style={styles.step}>{step + 1} / 3</Text>
      <Text style={styles.title}>{['Four bites is still data.', 'Log what actually happened. Nothing gets graded.', 'Your journal stays on this device.'][step]}</Text>
      <Text style={styles.subtitle}>{['Every moment belongs here, even if it felt small.', 'Record fullness, energy, meals, drinks, movement, or rest.', 'Your journal is stored only on this device.'][step]}</Text>

      {step === 2 && <><View style={styles.privacyBanner}>
        <Feather name="shield" size={20} color={colors.primary} />
        <Text style={styles.privacyText}>Your journal is stored only on this device.</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>What should we call you?</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name (optional)"
          placeholderTextColor={colors.muted}
        />
      </View>
      <View style={styles.reminderRow}><Text style={styles.privacyText}>Optional gentle reminders</Text><Switch value={reminders} onValueChange={setReminders} trackColor={{ true: colors.fullness }} /></View></>}

      <Pressable style={styles.button} onPress={step < 2 ? () => setStep(step + 1) : handleFinish}>
        <Text style={styles.buttonText}>{step < 2 ? 'Continue' : 'Begin'}</Text>
        <Feather name="arrow-right" size={20} color={colors.background} />
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 32,
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  step: { color: colors.labels, fontFamily: 'Figtree_600SemiBold', textAlign: 'center', letterSpacing: 2, marginBottom: 16 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 36,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 18,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: colors.radius,
    marginBottom: 40,
  },
  privacyText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 40,
  },
  label: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
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
  button: {
    backgroundColor: colors.labels,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.background,
    fontSize: 18,
  }
});
