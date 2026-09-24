import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useJournal } from '@/context/JournalContext';
import { FormField, TextInputField } from '@/components/Form';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Feather } from '@expo/vector-icons';
import { format, differenceInDays, subDays } from 'date-fns';
import { Sparkline } from '@/components/Sparkline';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function VisitScreen() {
  const insets = useSafeAreaInsets();
  const { appointment, saveAppointment, questions, saveQuestions, entries } = useJournal();

  const [date, setDate] = useState(appointment?.date || '');
  const [label, setLabel] = useState(appointment?.label || '');
  const [lastVisit, setLastVisit] = useState(appointment?.lastVisit || '');
  const [newQuestion, setNewQuestion] = useState('');
  const [range, setRange] = useState<'7' | '14' | '30' | 'lastVisit'>('14');

  const handleSaveAppt = () => {
    // Very simple date validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(`${date}T12:00:00`).getTime())) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD for the upcoming appointment.');
      return;
    }
    if (lastVisit && (!/^\d{4}-\d{2}-\d{2}$/.test(lastVisit) || isNaN(new Date(`${lastVisit}T12:00:00`).getTime()))) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD for the last visit date.');
      return;
    }
    saveAppointment({
      date,
      label,
      lastVisit: lastVisit || undefined
    });
    Alert.alert('Saved', 'Appointment updated.');
  };

  const handleClearAppt = () => {
    setDate('');
    setLabel('');
    setLastVisit('');
    saveAppointment(null);
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      saveQuestions([...(questions || []), newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const handleDeleteQuestion = (idx: number) => {
    const next = [...(questions || [])];
    next.splice(idx, 1);
    saveQuestions(next);
  };

  const escapeHtml = (unsafe: string) => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  };

  const handleCreatePDF = async () => {
    let html = `<h1 style="font-family: sans-serif; color: #1F4E49;">FeelFed visit summary</h1><p>${range === 'lastVisit' ? 'Since last visit' : `Last ${range} days`}</p><p>${lessThanHalf} of ${mealCount} recorded meals were less than half. Discomfort was recorded after eating on ${discomfortCount} occasions, ${discomfortAfter6} after 6 PM.</p>`;
    html += `<h2>Portions</h2><ul>${Object.entries(portions).map(([name,count]) => `<li>${escapeHtml(name)}: ${count}</li>`).join('')}</ul>`;
    html += `<h2>Textures</h2><ul>${Object.entries(textures).map(([name,count]) => `<li>${escapeHtml(name)}: ${count}</li>`).join('')}</ul>`;
    html += `<h2>How it sat</h2><ul>${Object.entries(symptoms).map(([name,count]) => `<li>${escapeHtml(name)}: ${count}</li>`).join('')}</ul>`;
    if (questions && questions.length > 0) {
      html += `<h2>Questions for Visit</h2><ul>`;
      questions.forEach(q => {
        html += `<li>${escapeHtml(q)}</li>`;
      });
      html += `</ul>`;
    }
    html += `<h2>Recent Logs</h2><ul>`;
    const recent = rangeEntries;
    recent.forEach(e => {
      html += `<li><strong>${new Date(e.createdAt).toLocaleString()}</strong> - ${e.kind}<br/>${escapeHtml(e.note || '')}</li>`;
    });
    html += `</ul>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      else Alert.alert('PDF created', uri);
    } catch (e) {
      Alert.alert("PDF Failed", "Could not generate PDF.");
    }
  };

  // Derive stats based on range
  const getStartDate = () => {
    if (range === 'lastVisit' && appointment?.lastVisit) {
      return new Date(appointment.lastVisit);
    }
    const days = parseInt(range, 10);
    return subDays(new Date(), isNaN(days) ? 14 : days);
  };

  const startDate = getStartDate();
  const rangeEntries = entries?.filter(e => new Date(e.createdAt) >= startDate) || [];

  const mealCount = rangeEntries.filter(e => e.kind === 'ate').length;
  const discomfortWords = ['Uncomfortably full', 'Bloated', 'Nauseated'];
  const discomfortCount = rangeEntries.filter(e => e.kind === 'ate' && e.symptoms?.some(s => discomfortWords.includes(s))).length;
  const lessThanHalf = rangeEntries.filter(e => e.kind === 'ate' && ['A few bites','About a quarter'].includes(e.portion || '')).length;
  const discomfortAfter6 = rangeEntries.filter(e => {
    if (e.kind !== 'ate') return false;
    const hour = new Date(e.createdAt).getHours();
    return hour >= 18 && !!e.symptoms?.some(s => discomfortWords.includes(s));
  }).length;

  const portions = rangeEntries.filter(e => e.kind === 'ate').reduce((acc, e) => {
    if (e.portion) {
      acc[e.portion] = (acc[e.portion] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const symptoms = rangeEntries.filter(e => e.kind === 'ate').reduce((acc, e) => {
    e.symptoms?.forEach(s => {
      acc[s] = (acc[s] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  const textures = rangeEntries.filter(e => e.kind === 'ate').reduce((acc, e) => {
    if (e.texture) acc[e.texture] = (acc[e.texture] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getAveragedSparkline = (key: 'fullness' | 'energy' | 'hydration') => {
    const days = differenceInDays(new Date(), startDate) || 1;
    const byDay = rangeEntries.reduce((acc, e) => {
      const d = format(new Date(e.createdAt), 'yyyy-MM-dd');
      if (!acc[d]) acc[d] = [];
      if (e[key] !== undefined) acc[d].push(e[key]!);
      return acc;
    }, {} as Record<string, number[]>);

    const result: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const vals = byDay[format(d, 'yyyy-MM-dd')];
      if (vals && vals.length > 0) result.push(vals.reduce((s, v) => s + v, 0) / vals.length);
       else result.push(NaN);
    }
    return result;
  };

  return (
    <KeyboardAwareScrollViewCompat 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
    >
      <Text style={styles.title}>Visit</Text>
      <Text style={styles.subtitle}>Prepare for your next appointment.</Text>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardTitle}>Next Appointment</Text>
          {appointment && (
            <Pressable onPress={handleClearAppt}>
              <Text style={{ color: colors.muted, fontFamily: 'Figtree_400Regular' }}>Clear</Text>
            </Pressable>
          )}
        </View>
        <FormField label="Date">
          <TextInputField value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        </FormField>
        <FormField label="Doctor / Specialist">
          <TextInputField value={label} onChangeText={setLabel} placeholder="e.g. Dr. Smith (GI)" />
        </FormField>
        <FormField label="Last visit date (optional)"><TextInputField value={lastVisit} onChangeText={setLastVisit} placeholder="YYYY-MM-DD" /></FormField>
        <Pressable style={styles.button} onPress={handleSaveAppt}>
          <Text style={styles.buttonText}>Save Details</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summary Trends</Text>
        <View style={styles.rangeSelector}>
          {['7', '14', '30', 'lastVisit'].map(r => (
            <Pressable 
              key={r} 
              onPress={() => setRange(r as any)}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
            >
              <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>
                {r === 'lastVisit' ? 'Since Last Visit' : `${r} Days`}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{mealCount}</Text>
            <Text style={styles.statLabel}>Meals recorded</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{lessThanHalf} / {mealCount}</Text>
            <Text style={styles.statLabel}>Less than half finished</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Discomfort was recorded after eating on {discomfortCount} occasions, {discomfortAfter6} after 6 PM.</Text>

        {Object.keys(portions).length > 0 && (
          <View style={styles.subCard}>
            <Text style={styles.subCardTitle}>Portions recorded</Text>
            {Object.entries(portions).map(([name, count]) => (
              <View key={name} style={styles.barRow}>
                <Text style={styles.barLabel}>{name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(count / mealCount) * 100}%` }]} />
                </View>
                <Text style={styles.barCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}
        {Object.keys(textures).length > 0 && <View style={styles.subCard}><Text style={styles.subCardTitle}>Textures recorded</Text>{Object.entries(textures).map(([texture,count]) => <Text key={texture} style={styles.pillText}>{texture}: {count}</Text>)}</View>}

        {Object.keys(symptoms).length > 0 && (
          <View style={styles.subCard}>
            <Text style={styles.subCardTitle}>Symptom Occurrences</Text>
            <View style={styles.pillContainer}>
              {Object.entries(symptoms).map(([symp, count]) => (
                <View key={symp} style={styles.pill}>
                  <Text style={styles.pillText}>{symp} ({count})</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.trendsSection}>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Fullness</Text>
            <Sparkline data={getAveragedSparkline('fullness')} color={colors.fullness} width={120} height={24} />
          </View>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Energy</Text>
            <Sparkline data={getAveragedSparkline('energy')} color={colors.energy} width={120} height={24} />
          </View>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Hydration</Text>
            <Sparkline data={getAveragedSparkline('hydration')} color={colors.hydration} width={120} height={24} />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Questions to Ask</Text>
        {questions?.map((q, idx) => (
          <View key={idx} style={styles.questionRow}>
            <Text style={styles.questionText}>• {q}</Text>
            <Pressable onPress={() => handleDeleteQuestion(idx)}>
              <Feather name="trash-2" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        <View style={styles.addQuestionRow}>
          <View style={{ flex: 1 }}>
            <TextInputField 
              value={newQuestion} 
              onChangeText={setNewQuestion} 
              placeholder="What do you want to ask?" 
            />
          </View>
          <Pressable style={styles.addBtn} onPress={handleAddQuestion}>
            <Feather name="plus" size={20} color={colors.background} />
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.pdfButton} onPress={handleCreatePDF}>
        <Feather name="printer" size={20} color={colors.background} />
        <Text style={styles.pdfButtonText}>Create Summary PDF</Text>
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
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 32,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    color: colors.muted,
    marginBottom: 32,
    marginTop: 8,
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
  button: {
    backgroundColor: colors.labels,
    padding: 12,
    borderRadius: colors.radius,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Figtree_600SemiBold',
    color: colors.background,
    fontSize: 16,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  questionText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  addQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.labels,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  rangeBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeBtnActive: {
    backgroundColor: colors.labels,
    borderColor: colors.labels,
  },
  rangeBtnText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: colors.muted,
  },
  rangeBtnTextActive: {
    color: colors.background,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: colors.radius,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 24,
    color: colors.text,
  },
  statLabel: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  subCard: {
    marginTop: 16,
    marginBottom: 8,
  },
  subCardTitle: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    width: 100,
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.muted,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.fullness,
    borderRadius: 3,
  },
  barCount: {
    width: 20,
    textAlign: 'right',
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: colors.text,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  pillText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
    color: colors.muted,
  },
  trendsSection: {
    gap: 16,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: colors.text,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.labels,
    padding: 16,
    borderRadius: colors.radius,
    gap: 12,
    marginTop: 8,
  },
  pdfButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: colors.background,
  }
});
