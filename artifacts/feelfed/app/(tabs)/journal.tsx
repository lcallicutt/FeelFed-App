import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useJournal } from '@/context/JournalContext';
import { Feather } from '@expo/vector-icons';
import { format, isSameDay } from 'date-fns';

import { useRouter } from 'expo-router';
import type { Entry } from '@/lib/journal-repository';
import Swipeable from 'react-native-gesture-handler/Swipeable';

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { entries, addEntry, deleteEntry } = useJournal();
  const router = useRouter();

  const [noteText, setNoteText] = useState('');

  const sortedEntries = [...(entries || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const groupedEntries = sortedEntries.reduce((acc, entry) => {
    const d = new Date(entry.createdAt);
    const dateStr = format(d, 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(entry);
    return acc;
  }, {} as Record<string, Entry[]>);

  const sections = Object.keys(groupedEntries).map(dateStr => ({
    title: dateStr,
    data: groupedEntries[dateStr]
  }));

  const getEntryIcon = (kind: string) => {
    switch(kind) {
      case 'ate': return <Feather name="coffee" size={20} color={colors.fullness} />;
      case 'drink': return <Feather name="droplet" size={20} color={colors.hydration} />;
      case 'energy': return <Feather name="zap" size={20} color={colors.energy} />;
      case 'moved': return <Feather name="activity" size={20} color={colors.peach} />;
      default: return <Feather name="circle" size={20} color={colors.labels} />;
    }
  };

  const getEntryTitle = (entry: any) => {
    if (entry.kind === 'ate') return `${entry.what || 'Something eaten'}. ${entry.portion || 'Portion not noted'}.`;
    if (entry.kind === 'drink') return `Drank ${entry.amount ? entry.amount.toLowerCase() : 'some'} ${entry.drinkType || 'liquid'}`;
    if (entry.kind === 'moved') return `${entry.status === 'Skipped' ? 'Skipped' : entry.activity || 'Moved'} ${entry.duration || 0} min. Energy ${entry.energyBefore ?? '—'} to ${entry.energyAfter ?? '—'}.`;
    if (entry.kind === 'energy') return `Energy ${entry.energy ?? '—'}/10.`;
    if (entry.kind === 'followup') return 'After-meal check-in';
    if (entry.kind === 'note') return 'Note';
    return 'Checked in';
  };

  const getEntrySubtitle = (entry: any) => {
    let parts = [];
    if (entry.portion && entry.kind === 'ate') parts.push(entry.portion);
    if (entry.texture && entry.kind === 'ate') parts.push(entry.texture);
    if (entry.symptoms && entry.symptoms.length > 0 && !entry.symptoms.includes('None')) parts.push(entry.symptoms.join(', '));
    if (entry.effort && entry.kind === 'moved') parts.push(`${entry.effort} effort`);
    if (entry.contexts && entry.kind === 'energy') parts.push(entry.contexts.join(', '));
    if (entry.contexts && entry.kind === 'drink') parts.push(entry.contexts.join(', '));
    
    let subtitle = parts.join(' • ');
    if (entry.note) {
      if (subtitle) subtitle += `\n"${entry.note}"`;
      else subtitle = `"${entry.note}"`;
    }
    return subtitle;
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this entry?')) {
        deleteEntry(id);
      }
    } else {
      Alert.alert('Delete', 'Delete this entry?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(id) }
      ]);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    await addEntry({
      kind: 'note',
      note: noteText.trim()
    });
    setNoteText('');
  };

  const renderItem = ({ item }: { item: Entry }) => (
    <Swipeable renderRightActions={() => <Pressable accessibilityLabel="Delete entry" onPress={() => handleDelete(item.id)} style={styles.swipeDelete}><Feather name="trash-2" size={21} color={colors.text} /><Text style={styles.swipeText}>Delete</Text></Pressable>}>
    <Pressable 
      style={styles.entryCard}
      onPress={() => {
         router.push(`/log/${item.kind === 'moment' || item.kind === 'note' || item.kind === 'followup' ? 'note' : item.kind}?id=${item.id}` as any);
      }}
    >
      <View style={styles.entryHeader}>
        <View style={styles.iconContainer}>
          {getEntryIcon(item.kind)}
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.entryTime}>{format(new Date(item.createdAt), 'h:mm a')}</Text>
          <Text style={styles.entryTitle}>{getEntryTitle(item)}</Text>
        </View>
        <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <Feather name="trash-2" size={18} color={colors.muted} />
        </Pressable>
      </View>
      {getEntrySubtitle(item) ? (
        <Text style={styles.entrySubtitle}>{getEntrySubtitle(item)}</Text>
      ) : null}
      {item.kind === 'ate' && <Pressable style={styles.followup} onPress={() => router.push(`/log/note?mealId=${item.id}` as any)}><Text style={styles.followupText}>Add after-meal check-in</Text></Pressable>}
      {item.kind === 'ate' && entries.some(e => e.mealId === item.id) && <Text style={styles.followupText}>Follow-up recorded</Text>}
      
      {/* If moment, show small dots for rings */}
      {item.kind === 'moment' && (
        <View style={styles.metricsRow}>
          <View style={[styles.metricDot, { backgroundColor: colors.hydration, opacity: 0.2 + (item.hydration || 0) * 0.08 }]} />
          <View style={[styles.metricDot, { backgroundColor: colors.energy, opacity: 0.2 + (item.energy || 0) * 0.08 }]} />
          <View style={[styles.metricDot, { backgroundColor: colors.fullness, opacity: 0.2 + (item.fullness || 0) * 0.08 }]} />
        </View>
      )}
    </Pressable>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Journal</Text>
      </View>

      <View style={styles.composerContainer}>
        <TextInput 
          style={styles.composerInput}
          value={noteText}
          onChangeText={setNoteText}
           placeholder="What are you noticing?"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          onSubmitEditing={handleSaveNote}
        />
        <Pressable onPress={handleSaveNote} style={styles.saveNote}><Text style={styles.quickBtnText}>Save note</Text></Pressable>
        <View style={styles.quickButtons}>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/log/ate')}>
            <Text style={[styles.quickBtnText, { color: colors.fullness }]}>Ate</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/log/drink')}>
            <Text style={[styles.quickBtnText, { color: colors.hydration }]}>Sipped</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/log/energy')}>
            <Text style={[styles.quickBtnText, { color: colors.energy }]}>Felt</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/log/moved')}>
            <Text style={[styles.quickBtnText, { color: colors.peach }]}>Moved</Text>
          </Pressable>
        </View>
      </View>
      
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="book-open" size={48} color={colors.muted} />
          <Text style={styles.emptyText}>No entries yet.</Text>
          <Text style={styles.emptySubtext}>Your moments will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionDateDay}>{format(new Date(section.title), 'EEEE')}</Text>
                   <Text style={styles.sectionDate}>{format(new Date(`${section.title}T12:00:00`), 'MMMM d')}</Text>
                </View>
                 <Text style={styles.sectionCount}>{section.data.length} moments</Text>
              </View>
              {section.data.map((entry) => (
                <View key={entry.id}>{renderItem({ item: entry })}</View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  swipeDelete: { backgroundColor: colors.brandTeal, width: 86, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, minHeight: 64 },
  swipeText: { color: colors.text, fontFamily: 'Figtree_500Medium', fontSize: 12 },
  saveNote: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  followup: { minHeight: 44, justifyContent: 'center', marginTop: 4 },
  followupText: { color: colors.fullness, fontFamily: 'Figtree_500Medium', fontSize: 13 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 32,
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 24,
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    color: colors.muted,
    marginTop: 8,
  },
  listContent: {
    padding: 24,
  },
  composerContainer: {
    padding: 24,
    paddingBottom: 0,
  },
  composerInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 16,
    color: colors.text,
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    marginBottom: 12,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickBtnText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  sectionDateDay: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 20,
    color: colors.text,
  },
  sectionDate: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  sectionCount: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.muted,
  },
  entryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  entryTime: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    color: colors.muted,
  },
  deleteBtn: {
    padding: 8,
  },
  entrySubtitle: {
    fontFamily: 'Figtree_400Regular',
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  }
});
