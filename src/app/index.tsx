import { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import {
  getVoiceNotes,
  deleteVoiceNote,
  type VoiceNote,
} from '../db/database';

export default function HomeScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const [playingUri, setPlayingUri] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const savedNotes = await getVoiceNotes();
      setNotes(savedNotes);
    } catch (error) {
      console.error('Failed to load voice notes:', error);
      Alert.alert('Could not load notes', 'Please try reopening the Home screen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotes();
    }, [loadNotes])
  );

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
      Alert.alert('Playback error', String(error));
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
      ]
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
        await FileSystem.deleteAsync(note.audioUri, { idempotent: true });
      } catch (error) {
        console.error('Could not delete audio file:', error);
        Alert.alert(
          'Could not delete audio',
          'The audio file could not be removed. The note has been kept.'
        );
        return;
      }

      await deleteVoiceNote(note.id);
      setNotes((currentNotes) =>
        currentNotes.filter((item) => item.id !== note.id)
      );
    } catch (error) {
      Alert.alert('Delete failed', String(error));
      await loadNotes();
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F7F2" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>MindScribe</Text>
            <Text style={styles.subtitle}>
              Your thoughts, beautifully organized.
            </Text>
          </View>

          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.settingsIcon}>Settings</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR SPACE TO THINK</Text>
          <Text style={styles.heroTitle}>Thoughts are{'\n'}worth keeping.</Text>
          <Text style={styles.heroDescription}>
            Speak freely. MindScribe will help you organize your ideas later.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.recordButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/record')}
          >
            <Text style={styles.recordButtonText}>Start a voice note</Text>
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

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color="#536A57" />
            <Text style={styles.emptyDescription}>Loading your notes...</Text>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>+</Text>
            </View>
            <Text style={styles.emptyTitle}>A fresh page</Text>
            <Text style={styles.emptyDescription}>
              Your saved voice notes will appear here. Start with an idea
              that's on your mind.
            </Text>
          </View>
        ) : (
          notes.map((note) => {
            const isThisPlaying =
              playingUri === note.audioUri && playerStatus.playing;

            return (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteHeading}>
                  <View style={styles.noteIcon}>
                    <Text style={styles.noteIconText}>Audio</Text>
                  </View>
                  <View style={styles.noteInfo}>
                    <Text style={styles.noteTitle}>{note.title}</Text>
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

                <View style={styles.actionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.playButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => void playNote(note)}
                    disabled={deletingId === note.id}
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
                  >
                    <Text style={styles.deleteButtonText}>
                      {deletingId === note.id ? 'Deleting…' : 'Delete'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.footer}>Made for thoughts on the go.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F2',
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
    marginBottom: 38,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#243B32',
  },
  subtitle: {
    fontSize: 13,
    color: '#7B8178',
    marginTop: 5,
  },
  settingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#E9EDE4',
  },
  settingsIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#344A3D',
  },
  hero: {
    backgroundColor: '#E6EBDD',
    borderRadius: 28,
    padding: 25,
    marginBottom: 36,
  },
  eyebrow: {
    color: '#64785D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 17,
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    color: '#263D31',
    letterSpacing: -1.2,
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: '#536354',
    marginTop: 14,
    marginBottom: 24,
  },
  recordButton: {
    minHeight: 58,
    borderRadius: 17,
    backgroundColor: '#365846',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  recordHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#71816D',
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
    color: '#263D31',
  },
  sectionSubtitle: {
    color: '#858980',
    fontSize: 13,
    marginTop: 5,
  },
  noteCount: {
    fontSize: 12,
    color: '#536A57',
    backgroundColor: '#E9EDE4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDEDE5',
    borderRadius: 22,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  emptyIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F1F3EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIcon: {
    fontSize: 30,
    color: '#536A57',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34483A',
  },
  emptyDescription: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 21,
    color: '#858980',
    marginTop: 9,
    maxWidth: 300,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDEDE5',
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
    backgroundColor: '#E9EDE4',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
  },
  noteIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#536A57',
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263D31',
  },
  noteDate: {
    fontSize: 12,
    color: '#858980',
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
    color: '#626B60',
    flex: 1,
  },
  duration: {
    fontSize: 12,
    color: '#536A57',
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
    backgroundColor: '#365846',
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
    backgroundColor: '#F8EAE7',
    borderWidth: 1,
    borderColor: '#F0D5D0',
  },
  deleteButtonText: {
    color: '#9B4035',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: '#92968C',
    fontSize: 12,
    marginTop: 28,
  },
});
