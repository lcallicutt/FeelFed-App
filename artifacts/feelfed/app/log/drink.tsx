import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJournal } from '@/context/JournalContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/colors';
import { FormField, TextInputField, SingleChoice, MultiChoice, CustomSlider } from '@/components/Form';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export default function DrinkLogScreen() {
  const insets = useSafeAreaInsets();
  const { entries, addEntry, updateEntry } = useJournal();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const existing = id ? entries?.find(e => e.id === id) : null;

  const [drinkType, setDrinkType] = useState(existing?.drinkType || 'Water');
  const [amount, setAmount] = useState(existing?.amount || 'A few sips');
  const [note, setNote] = useState(existing?.note || '');

  const handleSave = async () => {
    if (existing) {
      await updateEntry({
        ...existing,
        drinkType,
        amount,
        note,
      });
    } else {
      await addEntry({
        kind: 'drink',
        drinkType,
        amount,
        note,
      });
    }
    router.back();
  };

  return (
    <KeyboardAwareScrollViewCompat 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      <FormField label="What did you drink?">
        <SingleChoice 
          options={['Water', 'Smoothie', 'Shake', 'Tea or coffee', 'Broth', 'Other']}
          selected={drinkType}
          onChange={setDrinkType}
        />
      </FormField>

      <FormField label="Amount">
        <SingleChoice 
          options={['A few sips', 'Half a glass', 'A full glass', 'More']}
          selected={amount}
          onChange={setAmount}
        />
      </FormField>

      <FormField label="What are you noticing? (optional)">
        <TextInputField value={note} onChangeText={setNote} placeholder="What are you noticing?" multiline />
      </FormField>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Entry</Text>
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
    padding: 24,
  },
  saveButton: {
    backgroundColor: colors.hydration,
    padding: 16,
    borderRadius: colors.radius,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.background,
    fontSize: 16,
  }
});
