import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text, Image, Switch, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJournal } from '@/context/JournalContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/colors';
import { FormField, TextInputField, SingleChoice, MultiChoice, CustomSlider } from '@/components/Form';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';

export default function AteLogScreen() {
  const insets = useSafeAreaInsets();
  const { entries, addEntry, updateEntry } = useJournal();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const existing = id ? entries?.find(e => e.id === id) : null;

  const [what, setWhat] = useState(existing?.what || '');
  const [texture, setTexture] = useState(existing?.texture || '');
  const [portion, setPortion] = useState(existing?.portion || 'A few bites');
  const [fullnessBefore, setFullnessBefore] = useState(existing?.fullnessBefore ?? 5);
  const [fullnessAfter, setFullnessAfter] = useState(existing?.fullnessAfter ?? 5);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms || []);
  const [note, setNote] = useState(existing?.note || '');
  const [photoUri, setPhotoUri] = useState<string | undefined>(existing?.photoUri);
  const [checkLater, setCheckLater] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (Platform.OS === 'web') setPhotoUri(uri);
      else {
        const file = new File(uri);
        const destination = new File(Paths.document, `meal-${Date.now()}.jpg`);
        file.copy(destination);
        setPhotoUri(destination.uri);
      }
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
    if (!what.trim()) { Alert.alert('What did you eat?', 'Add a short description before saving.'); return; }
    if (existing) {
      await updateEntry({
        ...existing,
        what,
        texture,
        portion,
        fullnessBefore,
        fullnessAfter,
        symptoms,
        note,
        photoUri
      });
    } else {
      const entry = await addEntry({
        kind: 'ate',
        what,
        texture,
        portion,
        fullnessBefore,
        fullnessAfter,
        symptoms,
        note,
        photoUri
      });
      
      if (checkLater && Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'A gentle check-in',
              body: 'How did that meal sit with you? Open FeelFed to record what you notice.',
              data: { mealId: entry.id },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 45 * 60 },
          });
          await updateEntry({ ...entry, notificationId });
        } else Alert.alert('Notifications are off', 'This meal is saved. You can check in from your journal whenever you like.');
      }
    }
    router.back();
    } catch { Alert.alert('Could not save', 'Please try again.'); } finally { setSaving(false); }
  };

  return (
    <KeyboardAwareScrollViewCompat 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      <FormField label="What did you eat?">
        <TextInputField value={what} onChangeText={setWhat} placeholder="e.g. Soup, Rice..." />
      </FormField>

      <FormField label="Photo (Optional)">
        {photoUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: photoUri }} style={styles.image} />
            <Pressable style={styles.removeImageBtn} onPress={() => setPhotoUri(undefined)}>
              <Feather name="x" size={20} color="#FFF" />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.photoButton} onPress={handlePickImage}>
            <Feather name="camera" size={24} color={colors.text} />
            <Text style={styles.photoButtonText}>Add Photo</Text>
          </Pressable>
        )}
      </FormField>

      <FormField label="Texture">
        <SingleChoice 
          options={['Solid', 'Soft', 'Blended', 'Liquid']}
          selected={texture}
          onChange={setTexture}
        />
      </FormField>

      <FormField label="How much?">
        <SingleChoice 
          options={['A few bites', 'About a quarter', 'About half', 'About three quarters', 'All of it']}
          selected={portion}
          onChange={setPortion}
        />
      </FormField>

      <FormField label="Fullness Before" note="0 = Empty, 10 = Very full">
        <CustomSlider value={fullnessBefore} onValueChange={setFullnessBefore} maximumValue={10} />
      </FormField>

      <FormField label="Fullness After" note="0 = Empty, 10 = Very full">
        <CustomSlider value={fullnessAfter} onValueChange={setFullnessAfter} maximumValue={10} />
      </FormField>

      <FormField label="How did it sit?">
        <MultiChoice 
          options={['Comfortable', 'Full', 'Uncomfortably full', 'Bloated', 'Nauseated', 'Tired', 'Energized', 'Still hungry']}
          selected={symptoms}
          onChange={setSymptoms}
        />
      </FormField>

      <FormField label="What are you noticing? (optional)">
        <TextInputField value={note} onChangeText={setNote} placeholder="What are you noticing?" multiline />
      </FormField>
      {!existing && <View style={styles.checkRow}><Text style={styles.checkText}>Check in with me in 45 minutes</Text><Switch value={checkLater} onValueChange={setCheckLater} trackColor={{ true: colors.fullness }} /></View>}
      <Text style={styles.gentle}>Stopping after a few bites is a complete entry.</Text>

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
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
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: colors.radius,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    color: '#FFF',
    fontSize: 16,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 16,
    gap: 8,
  },
  photoButtonText: {
    fontFamily: 'Figtree_500Medium',
    color: colors.text,
    fontSize: 16,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4/3,
    borderRadius: colors.radius,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, marginBottom: 16 },
  checkText: { color: colors.text, fontFamily: 'Figtree_500Medium', fontSize: 15, flex: 1 },
  gentle: { color: colors.muted, fontFamily: 'Figtree_400Regular', marginBottom: 12 },
});
