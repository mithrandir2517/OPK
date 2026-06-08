import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BackToOpk } from '../components/BackToOpk';
import { memories } from '../data/mockData';
import { loadJson, saveJson, storageKeys } from '../storage/localStorage';
import { ActivityKey, IconName, SavedMemory } from '../types';

const activityOptions: Array<{ key: ActivityKey; label: string; icon: IconName; color: string }> = [
  { key: 'obed', label: 'Oběd', icon: 'silverware-fork-knife', color: '#0F766E' },
  { key: 'pivo', label: 'Pivo', icon: 'glass-mug-variant', color: '#B45309' },
  { key: 'kolo', label: 'Kolo', icon: 'bike', color: '#2563EB' },
];

const activityLabel: Record<ActivityKey, string> = {
  obed: 'Oběd',
  pivo: 'Pivo',
  kolo: 'Kolo',
};

function formatMemoryDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'dnes';
  }

  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function createMemoryId() {
  return `${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

export function KronikaScreen({ onBack }: { onBack: () => void }) {
  const [savedMemories, setSavedMemories] = useState<SavedMemory[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityKey>('pivo');
  const [memoryText, setMemoryText] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadJson<SavedMemory[]>(storageKeys.memories).then((items) => {
      if (!mounted) {
        return;
      }

      setSavedMemories(Array.isArray(items) ? items : []);
      setStorageReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (storageReady) {
      saveJson(storageKeys.memories, savedMemories);
    }
  }, [savedMemories, storageReady]);

  const canSave = memoryText.trim().length > 0;

  const savedTimeline = useMemo(
    () =>
      [...savedMemories].sort(
        (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      ),
    [savedMemories],
  );

  const addMemory = () => {
    const text = memoryText.trim();

    if (!text) {
      return;
    }

    setSavedMemories((current) => [
      {
        id: createMemoryId(),
        activity: selectedActivity,
        text,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setMemoryText('');
    setFormOpen(false);
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kronika</Text>
        <BackToOpk onPress={onBack} />
      </View>

      <View style={styles.addPanel}>
        <View style={styles.addPanelHeader}>
          <View>
            <Text style={styles.label}>Vzpomínky party</Text>
            <Text style={styles.addPanelTitle}>Co se stalo?</Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setFormOpen((open) => !open)}>
            <MaterialCommunityIcons name={formOpen ? 'close' : 'plus'} size={18} color="#15251F" />
            <Text style={styles.addButtonText}>{formOpen ? 'Zavřít' : 'Přidat'}</Text>
          </Pressable>
        </View>

        {formOpen && (
          <View style={styles.memoryForm}>
            <View style={styles.activityRow}>
              {activityOptions.map((activity) => {
                const isActive = selectedActivity === activity.key;

                return (
                  <Pressable
                    key={activity.key}
                    onPress={() => setSelectedActivity(activity.key)}
                    style={[
                      styles.activityOption,
                      isActive && { backgroundColor: activity.color, borderColor: activity.color },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={activity.icon}
                      size={17}
                      color={isActive ? '#FFFFFF' : activity.color}
                    />
                    <Text style={[styles.activityOptionText, isActive && styles.activityOptionTextActive]}>
                      {activity.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={memoryText}
              onChangeText={setMemoryText}
              placeholder="Napiš krátkou hlášku, moment nebo výsledek..."
              placeholderTextColor="#9CA3AF"
              multiline
              style={styles.memoryInput}
            />

            <Pressable
              disabled={!canSave}
              onPress={addMemory}
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            >
              <MaterialCommunityIcons name="check" size={18} color="#1F2937" />
              <Text style={styles.saveButtonText}>Uložit vzpomínku</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.cardList}>
        {savedTimeline.length > 0 && <Text style={styles.subsectionTitle}>Uloženo v telefonu</Text>}
        {savedTimeline.map((memory) => (
          <View key={memory.id} style={styles.memoryCard}>
            <Text style={styles.cardTitle}>{activityLabel[memory.activity]}</Text>
            <Text style={styles.cardMeta}>{formatMemoryDate(memory.createdAt)} · lokální vzpomínka</Text>
            <Text style={styles.cardText}>{memory.text}</Text>
          </View>
        ))}

        <Text style={styles.subsectionTitle}>Ukázky</Text>
        {memories.map((memory) => (
          <View key={memory.title} style={styles.memoryCard}>
            <Text style={styles.cardTitle}>{memory.title}</Text>
            <Text style={styles.cardMeta}>{memory.meta}</Text>
            <Text style={styles.cardText}>{memory.text}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  addPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  addPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  addPanelTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#F8B84E',
    borderColor: '#F6D186',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: '#15251F',
    fontSize: 14,
    fontWeight: '900',
  },
  memoryForm: {
    gap: 12,
    marginTop: 14,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityOption: {
    alignItems: 'center',
    backgroundColor: '#FBFAF8',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  activityOptionText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '900',
  },
  activityOptionTextActive: {
    color: '#FFFFFF',
  },
  memoryInput: {
    backgroundColor: '#FBFAF8',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#F8B84E',
    borderColor: '#F6D186',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '900',
  },
  cardList: {
    gap: 10,
  },
  subsectionTitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '900',
  },
  memoryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  cardMeta: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  cardText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 10,
  },
});
