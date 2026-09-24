import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJournal } from '@/context/JournalContext';
import { colors } from '@/constants/colors';
import { FormField, TextInputField, CustomSlider } from '@/components/Form';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export default function NoteSheet() {
  const { id, mealId } = useLocalSearchParams<{ id?: string; mealId?: string }>();
  const { entries, updateEntry, addEntry } = useJournal();
  const existing = entries.find(e => e.id === id);
  const [note, setNote] = useState(existing?.note || '');
  const [fullness, setFullness] = useState(existing?.fullness ?? 5);
  const [energy, setEnergy] = useState(existing?.energy ?? 5);
  const [hydration, setHydration] = useState(existing?.hydration ?? 5);
  const router = useRouter(), insets = useSafeAreaInsets();
  const save = async () => {
    if (!existing && !note.trim()) { Alert.alert('Add a note', 'What are you noticing?'); return; }
    if (existing) await updateEntry({ ...existing, note, ...(existing.kind === 'moment' ? { fullness, energy, hydration } : {}) });
    else await addEntry({ kind: mealId ? 'followup' : 'note', note: note.trim(), ...(mealId ? { mealId } : {}) });
    router.back();
  };
  return <KeyboardAwareScrollViewCompat style={styles.page} contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 36 }}>
    <Text style={styles.title}>{mealId ? 'How did it sit?' : existing?.kind === 'moment' ? 'Edit this moment' : 'What are you noticing?'}</Text>
    {existing?.kind === 'moment' && <>
      <FormField label={`Fullness ${fullness}/10`}><CustomSlider value={fullness} onValueChange={setFullness} /></FormField>
      <FormField label={`Energy ${energy}/10`}><CustomSlider value={energy} onValueChange={setEnergy} /></FormField>
      <FormField label={`Hydration ${hydration}/10`}><CustomSlider value={hydration} onValueChange={setHydration} /></FormField>
    </>}
    <FormField label="What are you noticing?"><TextInputField value={note} onChangeText={setNote} placeholder="What are you noticing?" multiline /></FormField>
    <Pressable style={styles.button} onPress={save}><Text style={styles.buttonText}>Save entry</Text></Pressable>
  </KeyboardAwareScrollViewCompat>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  title: { color: colors.text, fontFamily: 'Fraunces_400Regular', fontSize: 30, marginBottom: 24 },
  button: { minHeight: 50, backgroundColor: colors.fullness, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.background, fontFamily: 'Figtree_600SemiBold', fontSize: 16 },
});