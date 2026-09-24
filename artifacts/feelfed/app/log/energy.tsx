import React, { useState } from 'react';
import { StyleSheet, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJournal } from '@/context/JournalContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/colors';
import { FormField, TextInputField, SingleChoice, MultiChoice, CustomSlider } from '@/components/Form';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ENERGY_WORDS } from '@/lib/state-words';

export default function EnergyLogScreen() {
  const insets = useSafeAreaInsets();
  const { entries, addEntry, updateEntry } = useJournal();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const existing = id ? entries?.find(e => e.id === id) : null;

  const [energy, setEnergy] = useState(existing?.energy ?? 5);
  const [contexts, setContexts] = useState<string[]>(existing?.contexts || []);
  const [note, setNote] = useState(existing?.note || '');

  const handleSave = async () => {
    if (existing) {
      await updateEntry({
        ...existing,
        energy,
        contexts,
        note,
      });
    } else {
      await addEntry({
        kind: 'energy',
        energy,
        contexts,
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
      <FormField label={`Energy ${energy}/10 · ${ENERGY_WORDS[energy]}`}>
        <CustomSlider value={energy} onValueChange={setEnergy} maximumValue={10} />
      </FormField>

      <FormField label="Context (optional)">
        <MultiChoice 
          options={['Did not eat much', 'Poor sleep', 'Stressful day', 'Feeling unwell', 'After a meal', 'After a smoothie', 'After movement', 'Unsure']}
          selected={contexts}
          onChange={setContexts}
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
    backgroundColor: colors.energy,
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
