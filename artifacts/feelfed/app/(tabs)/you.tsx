import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useJournal } from '@/context/JournalContext';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Feather } from '@expo/vector-icons';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { FormField, TextInputField } from '@/components/Form';

export default function YouScreen() {
  const insets = useSafeAreaInsets();
  const { ready, settings, saveSettings, entries, appointment, questions, loadSample, clearSample, deleteAll } = useJournal();

  const [name, setName] = useState(settings?.name || '');
  useEffect(() => { if (ready) setName(settings.name); }, [ready]);

  const handleNameChange = (text: string) => {
    setName(text);
  };

  const handleToggleReminders = async () => {
    const newValue = !settings?.reminders;
    if (newValue) {
      if (Platform.OS === 'web') { Alert.alert('Unavailable here', 'Reminders can be enabled on your phone.'); return; }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "FeelFed",
            body: "Take a gentle moment to check in with your body.",
            data: { kind: 'gentle-reminder' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 12,
            minute: 0,
          },
        });
        await saveSettings({ reminders: true });
      } else {
        Alert.alert("Notifications Disabled", "Please enable notifications in your device settings.");
        await saveSettings({ reminders: false });
      }
    } else {
      if (Platform.OS !== 'web') {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const item of scheduled) if (item.content.data?.kind === 'gentle-reminder') await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
      await saveSettings({ reminders: false });
    }
  };

  const handleToggleAnimation = () => {
    saveSettings({ ambientAnimation: !settings?.ambientAnimation });
  };

  const handleExportJSON = async () => {
    try {
      const data = JSON.stringify({ entries, appointment, questions }, null, 2);
      const file = new File(Paths.document, 'feelfed-export.json');
      file.write(data);
      await Sharing.shareAsync(file.uri);
    } catch (e) {
      Alert.alert("Export Failed", "Could not export data.");
    }
  };

  const handleExportCSV = async () => {
    try {
      if (!entries) return;
      const fields = ['id','createdAt','kind','note','fullness','energy','hydration','what','texture','portion','fullnessBefore','fullnessAfter','symptoms','photoUri','drinkType','amount','contexts','activity','duration','effort','energyBefore','energyAfter','status','reasons','mealId'];
      const cell = (value: unknown) => `"${String(Array.isArray(value) ? value.join('; ') : value ?? '').replace(/"/g, '""')}"`;
      const csv = [fields.join(','), ...entries.map(e => fields.map(key => cell(e[key as keyof typeof e])).join(','))].join('\r\n');
      const file = new File(Paths.document, 'feelfed-export.csv');
      file.write(csv);
      await Sharing.shareAsync(file.uri);
    } catch (e) {
      Alert.alert("Export Failed", "Could not export data.");
    }
  };

  const handleDeleteAll = () => {
    const erase = async () => {
      if (Platform.OS !== 'web') await Notifications.cancelAllScheduledNotificationsAsync();
      await deleteAll();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete all journal data from this device? This cannot be undone.') && window.confirm('Final confirmation: permanently delete everything?')) void erase();
      return;
    }
    Alert.alert("Delete All Data", "Are you absolutely sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes, I'm sure", style: "destructive", onPress: () => {
          Alert.alert("Final Confirmation", "This will permanently erase your journal.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete Everything", style: "destructive", onPress: erase }
          ]);
      }}
    ]);
  };

  const handleExportPDF = async () => {
    try {
      if (!entries) return;
      let html = '<h1>FeelFed Journal</h1><ul>';
      entries.forEach(e => {
        html += `<li><strong>${new Date(e.createdAt).toLocaleString()}</strong> - ${e.kind}<br/>${e.note || ''}</li>`;
      });
      html += '</ul>';
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert("Export Failed", "Could not export data.");
    }
  };

  const hasSample = entries?.some(e => e.sample);

  return (
    <KeyboardAwareScrollViewCompat 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
    >
      <Text style={styles.title}>You</Text>
      
      <View style={styles.privacyBanner}>
        <Feather name="shield" size={20} color={colors.primary} />
        <Text style={styles.privacyText}>Your journal is stored only on this device.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <FormField label="Your Name">
          <TextInputField value={name} onChangeText={handleNameChange} placeholder="How should we greet you?" />
        </FormField>
        <Pressable style={styles.actionBtn} onPress={() => saveSettings({ name: name.trim() })}><Text style={styles.actionBtnText}>Save name</Text></Pressable>
      </View>
      <Text style={styles.disclaimer}>FeelFed is a personal wellness journal. It does not diagnose, treat, or prevent any condition.</Text>
      <Text style={styles.publisher}>LDC Digital Solutions LLC</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingText}>Reminders</Text>
            <Text style={styles.settingSubtext}>Gentle prompts to log</Text>
          </View>
          <Switch 
            value={settings?.reminders} 
            onValueChange={handleToggleReminders} 
            trackColor={{ false: colors.card, true: colors.labels }}
          />
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingText}>Ambient Animation</Text>
            <Text style={styles.settingSubtext}>Motion in the rings</Text>
          </View>
          <Switch 
            value={settings?.ambientAnimation} 
            onValueChange={handleToggleAnimation} 
            trackColor={{ false: colors.card, true: colors.labels }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data & Export</Text>
        
        <Pressable style={styles.actionBtn} onPress={handleExportJSON}>
          <Feather name="file" size={18} color={colors.text} />
          <Text style={styles.actionBtnText}>Export as JSON</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleExportCSV}>
          <Feather name="file-text" size={18} color={colors.text} />
          <Text style={styles.actionBtnText}>Export as CSV</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleExportPDF}>
          <Feather name="printer" size={18} color={colors.text} />
          <Text style={styles.actionBtnText}>Export as PDF</Text>
        </Pressable>

        <Pressable 
          style={styles.actionBtn} 
          onPress={() => {
            if (hasSample) clearSample();
            else loadSample();
          }}
        >
          <Feather name={hasSample ? "x-circle" : "file-plus"} size={18} color={colors.text} />
          <Text style={styles.actionBtnText}>
            {hasSample ? "Clear Sample Data" : "Load Sample Journal"}
          </Text>
        </Pressable>
        
        <Pressable style={[styles.actionBtn]} onPress={() => Linking.openURL('https://feelfed.com')}>
          <Feather name="globe" size={18} color={colors.text} />
          <Text style={styles.actionBtnText}>Visit feelfed.com</Text>
        </Pressable>
        
        <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={handleDeleteAll}>
          <Feather name="trash-2" size={18} color={colors.energy} />
          <Text style={[styles.actionBtnText, { color: colors.energy }]}>Delete All Data</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  disclaimer: { color: colors.muted, fontFamily: 'Figtree_400Regular', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  publisher: { color: colors.labels, fontFamily: 'Figtree_400Regular', fontSize: 12, marginBottom: 24 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 32,
    color: colors.text,
    marginBottom: 24,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: colors.radius,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 20,
    color: colors.text,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  settingText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
    color: colors.text,
  },
  settingSubtext: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dangerBtn: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  actionBtnText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  }
});
