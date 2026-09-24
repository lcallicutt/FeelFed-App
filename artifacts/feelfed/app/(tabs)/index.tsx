import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { DraggableRings } from '@/components/DraggableRings';
import { useJournal } from '@/context/JournalContext';
import { useRouter } from 'expo-router';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { Sparkline } from '@/components/Sparkline';
import { FULLNESS_WORDS, ENERGY_WORDS, HYDRATION_WORDS } from '@/lib/state-words';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { ready, settings, addEntry, entries, appointment } = useJournal();
  const router = useRouter();

  const [fullness, setFullness] = useState(0.5);
  const [energy, setEnergy] = useState(0.5);
  const [hydration, setHydration] = useState(0.5);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready && settings && !settings.onboarded) {
      router.replace('/onboarding');
    } else if (ready && entries && entries.length > 0) {
      // Find latest moment
      const latestMoment = entries.find(e => e.kind === 'moment');
      if (latestMoment) {
        if (latestMoment.fullness !== undefined) setFullness(latestMoment.fullness / 10);
        if (latestMoment.energy !== undefined) setEnergy(latestMoment.energy / 10);
        if (latestMoment.hydration !== undefined) setHydration(latestMoment.hydration / 10);
      }
    }
  }, [ready, settings, router, entries]);

  const handleLogMoment = async () => {
    await addEntry({
      kind: 'moment',
      fullness: Math.round(fullness * 10),
      energy: Math.round(energy * 10),
      hydration: Math.round(hydration * 10),
    });
    setSaved(true);
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const fullnessInt = Math.round(fullness * 10);
  const energyInt = Math.round(energy * 10);
  const hydrationInt = Math.round(hydration * 10);

  const get14DayData = (key: 'fullness' | 'energy' | 'hydration') => {
    if (!entries) return [];
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    // Get moments from last 14 days, group by day, average
    const recentMoments = entries.filter(e => e.kind === 'moment' && new Date(e.createdAt) >= fourteenDaysAgo);
    const byDay = recentMoments.reduce((acc, e) => {
      const d = format(new Date(e.createdAt), 'yyyy-MM-dd');
      if (!acc[d]) acc[d] = [];
      if (e[key] !== undefined) acc[d].push(e[key]!);
      return acc;
    }, {} as Record<string, number[]>);

    // Map the last 14 days strictly so sparkline is accurate
    const result: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = format(d, 'yyyy-MM-dd');
      const vals = byDay[dStr];
      result.push(vals?.length ? vals.reduce((sum, v) => sum + v, 0) / vals.length : NaN);
    }
    return result;
  };

  const fullnessData = get14DayData('fullness');
  const energyData = get14DayData('energy');
  const hydrationData = get14DayData('hydration');

  const appointmentDate = appointment?.date && /^\d{4}-\d{2}-\d{2}$/.test(appointment.date) ? parseISO(appointment.date) : null;
  const daysUntil = appointmentDate && !isNaN(appointmentDate.getTime()) ? differenceInCalendarDays(appointmentDate, new Date()) : null;
  const momentsSinceVisit = entries.filter(e => !appointment?.lastVisit || new Date(e.createdAt) >= new Date(appointment.lastVisit)).length;
  const observation = fullnessInt >= 8 && energyInt <= 4
    ? 'Fullness is high while energy is low.'
    : energyInt <= 3 ? 'Energy feels lower in this moment.' : 'This moment is worth recording as it is.';

  if (!ready) return null;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.header}>
        <Text style={styles.timeLabel}>{getTimeOfDay()} Check-in</Text>
        <Text style={styles.greeting}>
          How is your body{'\n'}
          <Text style={styles.greetingHighlight}>right now?</Text>
        </Text>
      </View>

      <View style={styles.ringsContainer}>
        <DraggableRings 
          fullness={fullness} onFullnessChange={setFullness}
          energy={energy} onEnergyChange={setEnergy}
          hydration={hydration} onHydrationChange={setHydration}
        />
        
        <View style={styles.wordsContainer}>
          <Text style={[styles.wordLabel, { color: colors.fullness }]}>{fullnessInt} - {FULLNESS_WORDS[fullnessInt]}</Text>
          <Text style={[styles.wordLabel, { color: colors.energy }]}>{energyInt} - {ENERGY_WORDS[energyInt]}</Text>
          <Text style={[styles.wordLabel, { color: colors.hydration }]}>{hydrationInt} - {HYDRATION_WORDS[hydrationInt]}</Text>
        </View>
      </View>

      <View style={styles.noticeCard}>
        <View style={styles.noticeHeader}><Feather name="info" size={16} color={colors.fullness} /><Text style={styles.noticeTitle}>FeelFed noticed</Text></View>
        <Text style={styles.noticeBody}>{observation}</Text>
        <Text style={styles.noticeBody}>Fullness {fullnessInt}, energy {energyInt}, hydration {hydrationInt}. That combination is written down when you save.</Text>
        <Text style={styles.noticeDisclaimer}>Recorded as you reported it. FeelFed never guesses why.</Text>
      </View>
      <View style={styles.actionContainer}>
        <Pressable style={styles.logButton} onPress={handleLogMoment}>
          <Text style={styles.logButtonText}>{saved ? 'Saved · Save another moment' : 'Save this moment'}</Text>
        </Pressable>
      </View>

      {appointment && daysUntil !== null && daysUntil >= 0 ? (
        <View style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <Text style={styles.appointmentTitle}>Appointment in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}</Text>
          </View>
          <Text style={styles.appointmentDate}>{format(appointmentDate!, 'MMMM d, yyyy')}{appointment.label ? ` · ${appointment.label}` : ''}</Text>
          <Text style={styles.appointmentSince}>{momentsSinceVisit} moments recorded since {appointment.lastVisit ? 'your last visit' : 'you began journaling'}</Text>
          
          <View style={styles.sparklineContainer}>
            <View style={styles.sparklineRow}>
              <Text style={styles.sparklineLabel}>Fullness</Text>
              <Sparkline data={fullnessData} color={colors.fullness} width={100} height={20} />
            </View>
            <View style={styles.sparklineRow}>
              <Text style={styles.sparklineLabel}>Energy</Text>
              <Sparkline data={energyData} color={colors.energy} width={100} height={20} />
            </View>
            <View style={styles.sparklineRow}>
              <Text style={styles.sparklineLabel}>Hydration</Text>
              <Sparkline data={hydrationData} color={colors.hydration} width={100} height={20} />
            </View>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/visit')} style={styles.addVisitCard}><Text style={styles.addVisitText}>Preview my visit summary</Text></Pressable>
        </View>
      ) : (
        <Pressable style={styles.addVisitCard} onPress={() => router.push('/(tabs)/visit')}>
          <Feather name="calendar" size={20} color={colors.muted} />
          <Text style={styles.addVisitText}>Add Upcoming Appointment</Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Quick log</Text>
      <View style={styles.grid}>
        <LogCard title="I ate something" iconName="coffee" onPress={() => router.push('/log/ate')} color={colors.fullness} />
        <LogCard title="I had a drink" iconName="droplet" onPress={() => router.push('/log/drink')} color={colors.hydration} />
        <LogCard title="How's my energy" iconName="zap" onPress={() => router.push('/log/energy')} color={colors.energy} />
        <LogCard title="I moved (or rested)" iconName="activity" onPress={() => router.push('/log/moved')} color={colors.peach} />
      </View>
    </ScrollView>
  );
}

function LogCard({ title, iconName, onPress, color }: { title: string, iconName: keyof typeof Feather.glyphMap, onPress: () => void, color: string }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Feather name={iconName} size={32} color={color} />
      <Text style={styles.cardTitle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 40,
  },
  timeLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  greeting: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 32,
    color: colors.text,
    lineHeight: 40,
  },
  greetingHighlight: {
    fontFamily: 'Fraunces_400Regular_Italic',
    color: colors.peach,
  },
  ringsContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  wordsContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  wordLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
  actionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  logButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.text,
    fontSize: 16,
  },
  noticeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 16,
    marginBottom: 24,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.text,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noticeBody: {
    fontFamily: 'Figtree_400Regular',
    color: colors.text,
    fontSize: 16,
    marginBottom: 12,
  },
  noticeDisclaimer: {
    fontFamily: 'Figtree_400Regular_Italic',
    color: colors.muted,
    fontSize: 12,
  },
  appointmentCard: {
    backgroundColor: colors.brandTeal,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 16,
    marginBottom: 24,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentTitle: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.text,
    fontSize: 16,
  },
  appointmentDate: {
    fontFamily: 'Figtree_500Medium',
    color: colors.labels,
    fontSize: 14,
  },
  appointmentSince: {
    fontFamily: 'Figtree_400Regular',
    color: colors.muted,
    fontSize: 14,
    marginBottom: 16,
  },
  addVisitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: colors.radius,
    padding: 20,
    marginBottom: 24,
  },
  addVisitText: {
    fontFamily: 'Figtree_500Medium',
    color: colors.muted,
    fontSize: 16,
  },
  sparklineContainer: {
    gap: 12,
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sparklineLabel: {
    fontFamily: 'Figtree_500Medium',
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 24,
    color: colors.text,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardTitle: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
    color: colors.text,
  }
});
