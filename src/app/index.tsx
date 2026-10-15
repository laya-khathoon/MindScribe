
import { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const [notes] = useState<
    { id: string; title: string; date: string; preview: string }[]
  >([]);

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
            <Text style={styles.settingsIcon}>⚙</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR SPACE TO THINK</Text>
          <Text style={styles.heroTitle}>
            Thoughts are{'\n'}worth keeping.
          </Text>
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
            <Text style={styles.micIcon}>🎙</Text>
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
          <Text style={styles.noteCount}>{notes.length} notes</Text>
        </View>

        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>✎</Text>
            </View>
            <Text style={styles.emptyTitle}>A fresh page</Text>
            <Text style={styles.emptyDescription}>
              Your saved voice notes will appear here. Start with an idea
              that's on your mind.
            </Text>
          </View>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.noteTitle}>{note.title}</Text>
              <Text style={styles.noteDate}>{note.date}</Text>
              <Text style={styles.notePreview}>{note.preview}</Text>
            </View>
          ))
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E9EDE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.8,
  },
  micIcon: {
    fontSize: 21,
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
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#263D31',
  },
  noteDate: {
    fontSize: 12,
    color: '#858980',
    marginTop: 5,
  },
  notePreview: {
    fontSize: 14,
    color: '#626B60',
    marginTop: 10,
  },
  footer: {
    textAlign: 'center',
    color: '#92968C',
    fontSize: 12,
    marginTop: 28,
  },
});
