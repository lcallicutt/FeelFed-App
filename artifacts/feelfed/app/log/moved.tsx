import React, { useState } from 'react';
import { StyleSheet, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJournal } from '@/context/JournalContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/colors';
import { FormField, TextInputField, SingleChoice, MultiChoice, CustomSlider } from '@/components/Form';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export default function MovedLogScreen() {
  const insets = useSafeAreaInsets();
  const { entries, addEntry, updateEntry } = useJournal();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const existing = id ? entries?.find(e => e.id === id) : null;

  const [activity, setActivity] = useState(existing?.activity || 'Walking');
  const [otherActivity, setOtherActivity] = useState('');
  const [duration, setDuration] = useState(existing?.duration ? existing.duration.toString() : '15');
  const [effort, setEffort] = useState(existing?.effort || 'Easy');
  const [energyBefore, setEnergyBefore] = useState(existing?.energyBefore ?? 5);
  const [energyAfter, setEnergyAfter] = useState(existing?.energyAfter ?? 5);
  const [status, setStatus] = useState(existing?.status || 'Completed');
  const [reasons, setReasons] = useState<string[]>(existing?.reasons || []);
  const [note, setNote] = useState(existing?.note || '');

  const handleSave = async () => {
    if (existing) {
      await updateEntry({
        ...existing,
        activity: activity === 'Something else' ? otherActivity.trim() || activity : activity,
        duration: parseInt(duration, 10) || 0,
        effort,
        energyBefore,
        energyAfter,
        status,
        reasons,
        note,
      });
    } else {
      await addEntry({
        kind: 'moved',
        activity: activity === 'Something else' ? otherActivity.trim() || activity : activity,
        duration: parseInt(duration, 10) || 0,
        effort,
        energyBefore,
        energyAfter,
        status,
        reasons,
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
      <FormField label="Activity">
        <SingleChoice options={['Walking', 'Walking pad', 'Strength', 'Yoga', 'Pilates', 'Cycling', 'Swimming', 'Stretching', 'Housework', 'Rest day', 'Something else']} selected={activity} onChange={setActivity} />
      </FormField>
      {activity === 'Something else' && <FormField label="What did you do?"><TextInputField value={otherActivity} onChangeText={setOtherActivity} placeholder="Activity" /></FormField>}

      <FormField label="Duration (minutes)">
        <SingleChoice options={['5','10','15','20','30','45','60','Custom']} selected={['5','10','15','20','30','45','60'].includes(duration) ? duration : 'Custom'} onChange={setDuration} />
        <TextInputField value={duration} onChangeText={setDuration} keyboardType="numeric" />
      </FormField>

      <FormField label="Effort level">
        <SingleChoice 
          options={['Easy', 'Moderate', 'Hard']}
          selected={effort}
          onChange={setEffort}
        />
      </FormField>

      <FormField label="Energy Before" note="0 = Exhausted, 10 = Energized">
        <CustomSlider value={energyBefore} onValueChange={setEnergyBefore} maximumValue={10} />
      </FormField>

      <FormField label="Energy After" note="0 = Exhausted, 10 = Energized">
        <CustomSlider value={energyAfter} onValueChange={setEnergyAfter} maximumValue={10} />
      </FormField>
      <FormField label="Status"><SingleChoice options={['Completed', 'Shortened', 'Skipped']} selected={status} onChange={setStatus} /></FormField>
      {(status === 'Shortened' || status === 'Skipped') && <FormField label="What did you notice?"><MultiChoice options={['Low energy', 'Did not eat enough', 'Not feeling well', 'Soreness', 'Time conflict', 'Rest day', 'Other']} selected={reasons} onChange={setReasons} /></FormField>}

      <FormField label="What are you noticing? (optional)">
        <TextInputField value={note} onChangeText={setNote} placeholder="What are you noticing?" multiline />
      </FormField>
      <Text style={{ color: colors.muted, fontFamily: 'Figtree_400Regular' }}>Resting is a valid entry. There's no minimum to log here.</Text>

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
    backgroundColor: colors.peach,
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
