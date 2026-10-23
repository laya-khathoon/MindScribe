 import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteVoiceNote,
  getVoiceNotes,
  updateVoiceNoteTranscript,
  type VoiceNote,
} from '../db/database';

import { transcribeAudio } from '../services/transcription';

type NoteFilter = 'all' | 'recent' | 'older';

const RECENT_DAYS = 7;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export default function HomeScreen() {
  const router = useRouter();

  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [noteFilter, setNoteFilter] = useState<NoteFilter>('all');
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [transcribingId, setTranscribingId] = useState<number | null>(null);

  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const loadNotes = useCallback(async () => {
    try {
      const savedNotes = await getVoiceNotes();
      setNotes(savedNotes);
      setCurrentTime(Date.now());
    } catch (error) {
      console.error('Failed to load voice notes:', error);
      Alert.alert(
        'Could not load notes',
        'Please try reopening the Home screen.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadNotes();
    }, [loadNotes]),
  );

  const filteredNotes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const now = currentTime;
    const recentCutoff = now - RECENT_DAYS * DAY_IN_MILLISECONDS;

    return notes.filter((note) => {
      const matchesSearch = note.title
        .toLowerCase()
        .includes(normalizedQuery);

      if (!matchesSearch) {
        return false;
      }

      const createdAt = new Date(note.createdAt).getTime();

      if (noteFilter === 'recent') {
        return (
          !Number.isNaN(createdAt) &&
          createdAt >= recentCutoff &&
          createdAt <= now
        );
      }

      if (noteFilter === 'older') {
        return (
          !Number.isNaN(createdAt) &&
          createdAt < recentCutoff
        );
      }

      return true;
    });
  }, [notes, searchQuery, noteFilter, currentTime]);

  const handleTranscribe = async (note: VoiceNote) => {
    try {
      setTranscribingId(note.id);

      const transcript = await transcribeAudio(note.audioUri);

      await updateVoiceNoteTranscript(note.id, transcript);

      setNotes((currentNotes) =>
        currentNotes.map((item) =>
          item.id === note.id ? { ...item, transcript } : item,
        ),
      );

      Alert.alert('Transcription complete', 'Your transcript has been saved.');
    } catch (error) {
      console.error('Transcription failed:', error);

      Alert.alert(
        'Transcription failed',
        error instanceof Error
          ? error.message
          : 'Could not transcribe this recording. Please try again.',
      );
    } finally {
      setTranscribingId(null);
    }
  };
  const playNote = async (note: VoiceNote) => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });

      if (playingUri === note.audioUri && playerStatus.playing) {
        player.pause();
        return;
      }

      setPlayingUri(note.audioUri);
      player.replace(note.audioUri);
      player.play();
    } catch (error) {
      console.error('Playback failed:', error);
      Alert.alert(
        'Playback error',
        'Could not play this recording. Please try again.',
      );
    }
  };

  const confirmDelete = (note: VoiceNote) => {
    Alert.alert(
      'Delete voice note?',
      'This will permanently delete this note and its original audio recording from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void removeNote(note);
          },
        },
      ],
    );
  };

  const removeNote = async (note: VoiceNote) => {
    try {
      setDeletingId(note.id);

      if (playingUri === note.audioUri) {
        player.pause();
        setPlayingUri(null);
      }

      try {
        await FileSystem.deleteAsync(note.audioUri, {
          idempotent: true,
        });
      } catch (error) {
        console.error('Could not delete audio file:', error);
        Alert.alert(
          'Could not delete audio',
          'The audio file could not be removed. The note has been kept.',
        );
        return;
      }

      await deleteVoiceNote(note.id);

      setNotes((currentNotes) =>
        currentNotes.filter((item) => item.id !== note.id),
      );
    } catch (error) {
      console.error('Delete failed:', error);
      Alert.alert(
        'Delete failed',
        'Could not delete this note. Please try again.',
      );
      await loadNotes();
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  };

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(
      seconds,
    ).padStart(2, '0')}`;
  };

  const filterOptions: { label: string; value: NoteFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Recent', value: 'recent' },
    { label: 'Older', value: 'older' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F5F9F0"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>MindScribe</Text>
            <Text style={styles.subtitle}>
              Your thoughts, beautifully organized.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Text style={styles.settingsIcon}>Settings</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR SPACE TO THINK</Text>

          <Text style={styles.heroTitle}>
            Thoughts are{'\n'}worth keeping.
          </Text>

          <Text style={styles.heroDescription}>
            Speak freely. MindScribe will help you organize your ideas
            later.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.recordButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/record')}
            accessibilityRole="button"
            accessibilityLabel="Start a voice note"
          >
            <Text style={styles.recordButtonText}>
              + Start a voice note
            </Text>
          </Pressable>

          <Text style={styles.recordHint}>
            Capture now. Organize afterward.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your notes</Text>
            <Text style={styles.sectionSubtitle}>
              All your thoughts in one place
            </Text>
          </View>

          <Text style={styles.noteCount}>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </Text>
        </View>

        {!loading && notes.length > 0 && (
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your notes by title..."
              placeholderTextColor="#899487"
              returnKeyType="search"
              accessibilityLabel="Search voice notes by title"
            />

            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Text style={styles.clearSearchText}>×</Text>
              </Pressable>
            )}
          </View>
        )}

        {!loading && notes.length > 0 && (
          <View style={styles.filterRow}>
            {filterOptions.map((option) => {
              const selected = noteFilter === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setNoteFilter(option.value)}
                  style={[
                    styles.filterButton,
                    selected && styles.filterButtonActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.filterTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color="#39834A" />
            <Text style={styles.emptyDescription}>
              Loading your notes...
            </Text>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>+</Text>
            </View>

            <Text style={styles.emptyTitle}>A fresh page</Text>

            <Text style={styles.emptyDescription}>
              Your saved voice notes will appear here. Start with an
              idea that&apos;s on your mind.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.emptyRecordButton,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/record')}
            >
              <Text style={styles.emptyRecordButtonText}>
                Record your first note
              </Text>
            </Pressable>
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>⌕</Text>
            </View>

            <Text style={styles.emptyTitle}>
              No matching notes
            </Text>

            <Text style={styles.emptyDescription}>
              {searchQuery.trim()
                ? 'Try another title or clear your search.'
                : 'There are no notes in this category yet.'}
            </Text>

            <Pressable
              style={styles.resetButton}
              onPress={() => {
                setSearchQuery('');
                setNoteFilter('all');
              }}
            >
              <Text style={styles.resetButtonText}>
                Show all notes
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.resultsText}>
              Showing {filteredNotes.length}{' '}
              {filteredNotes.length === 1 ? 'note' : 'notes'}
            </Text>

            {filteredNotes.map((note) => {
              const isThisPlaying =
                playingUri === note.audioUri && playerStatus.playing;

              return (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeading}>
                    <View style={styles.noteIcon}>
                      <Text style={styles.noteIconText}>AUDIO</Text>
                    </View>

                    <View style={styles.noteInfo}>
                      <Text style={styles.noteTitle}>
                        {note.title}
                      </Text>

                      <Text style={styles.noteDate}>
                        {formatDate(note.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.noteFooter}>
                    <Text style={styles.notePreview}>
                      Voice recording saved locally
                    </Text>

                    <Text style={styles.duration}>
                      {formatDuration(note.durationMillis)}
                    </Text>
                  </View>

                  {note.transcript ? (
                    <View style={styles.transcriptContainer}>
                      <Text style={styles.transcriptTitle}>Transcript</Text>
                      <Text style={styles.transcriptText}>{note.transcript}</Text>
                    </View>
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      styles.transcribeButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => void handleTranscribe(note)}
                    disabled={transcribingId !== null || deletingId === note.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Transcribe ${note.title}`}
                  >
                    <Text style={styles.transcribeButtonText}>
                      {transcribingId === note.id
                        ? 'Transcribing...'
                        : note.transcript
                          ? 'Transcribe again'
                          : 'Transcribe recording'}
                    </Text>
                  </Pressable>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.playButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => void playNote(note)}
                      disabled={deletingId === note.id}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isThisPlaying
                          ? `Pause ${note.title}`
                          : `Play ${note.title}`
                      }
                    >
                      <Text style={styles.playButtonText}>
                        {isThisPlaying ? 'Ⅱ Pause' : '▶ Play'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => confirmDelete(note)}
                      disabled={deletingId === note.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${note.title}`}
                    >
                      <Text style={styles.deleteButtonText}>
                        {deletingId === note.id
                          ? 'Deleting…'
                          : 'Delete'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.footer}>
          Made for thoughts on the go.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9F0',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  logo: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#24512E',
  },
  subtitle: {
    fontSize: 13,
    color: '#71806F',
    marginTop: 5,
  },
  settingsButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: '#E1F4D1',
  },
  settingsIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#285C35',
  },
  hero: {
    backgroundColor: '#DFF5C8',
    borderRadius: 28,
    padding: 25,
    marginBottom: 34,
  },
  eyebrow: {
    color: '#3C7A39',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 17,
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    color: '#21452B',
    letterSpacing: -1.2,
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: '#49644B',
    marginTop: 14,
    marginBottom: 24,
  },
  recordButton: {
    minHeight: 58,
    borderRadius: 17,
    backgroundColor: '#347A3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  recordHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#5C7955',
    marginTop: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#25482D',
  },
  sectionSubtitle: {
    color: '#788575',
    fontSize: 13,
    marginTop: 5,
  },
  noteCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2F7139',
    backgroundColor: '#E1F4D1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE8D5',
    borderRadius: 15,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 25,
    color: '#56805A',
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#25482D',
    paddingVertical: 12,
  },
  clearSearchButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: {
    fontSize: 25,
    color: '#71806F',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#EAF0E4',
    borderWidth: 1,
    borderColor: '#E0E8D9',
  },
  filterButtonActive: {
    backgroundColor: '#347A3E',
    borderColor: '#347A3E',
  },
  filterText: {
    color: '#4F6850',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  resultsText: {
    fontSize: 12,
    color: '#788575',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3ECDD',
    borderRadius: 22,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  emptyIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EAF7DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIcon: {
    fontSize: 30,
    color: '#347A3E',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#285C35',
  },
  emptyDescription: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 21,
    color: '#788575',
    marginTop: 9,
    maxWidth: 300,
  },
  emptyRecordButton: {
    backgroundColor: '#347A3E',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 20,
  },
  emptyRecordButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resetButton: {
    marginTop: 18,
    backgroundColor: '#E1F4D1',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  resetButtonText: {
    color: '#285C35',
    fontSize: 13,
    fontWeight: '700',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3ECDD',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  noteHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteIcon: {
    backgroundColor: '#E1F4D1',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
  },
  noteIconText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#347A3E',
    letterSpacing: 0.5,
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#25482D',
  },
  noteDate: {
    fontSize: 12,
    color: '#788575',
    marginTop: 5,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  notePreview: {
    fontSize: 12,
    color: '#667462',
    flex: 1,
  },
  duration: {
    fontSize: 12,
    color: '#347A3E',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  playButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#347A3E',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FFF0ED',
    borderWidth: 1,
    borderColor: '#F1D6D0',
  },
  deleteButtonText: {
    color: '#9B4035',
    fontSize: 14,
    fontWeight: '700',
  },
  transcriptContainer: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F3F8EE',
    borderWidth: 1,
    borderColor: '#DCE8D5',
  },
  transcriptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#285C35',
    marginBottom: 7,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#354936',
  },
  transcribeButton: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E1F4D1',
  },
  transcribeButtonText: {
    color: '#285C35',
    fontSize: 14,
    fontWeight: '700',
  },  footer: {
    textAlign: 'center',
    color: '#899487',
    fontSize: 12,
    marginTop: 28,
  },
});
