import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { saveVoiceNote } from '../db/database';

export default function RecordScreen() {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });

  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const [isPaused, setIsPaused] = useState(false);
  const [savedUri, setSavedUri] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [savedTitle, setSavedTitle] = useState('');

  const startRecording = async () => {
    try {
      setIsBusy(true);

      const permission =
        await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Microphone permission required',
          'Allow microphone access in your device settings to record a voice note.'
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setSavedUri(null);
      setSavedTitle('');
      setIsPaused(false);
    } catch (error) {
      Alert.alert('Recording error', String(error));
    } finally {
      setIsBusy(false);
    }
  };

  const pauseRecording = () => {
    recorder.pause();
    setIsPaused(true);
  };

  const resumeRecording = () => {
    recorder.record();
    setIsPaused(false);
  };

  const stopRecording = async () => {
    try {
      setIsBusy(true);
      const durationMillis = recorderState.durationMillis;

      await recorder.stop();

      const uri = recorder.uri;

      if (!uri) {
        Alert.alert(
          'Recording unavailable',
          'The recording stopped, but no audio file URI was returned.'
        );
        return;
      }

      const title = `Voice note ${new Date().toLocaleString()}`;

      await saveVoiceNote(title, uri, durationMillis);

      setSavedUri(uri);
      setSavedTitle(title);
      setIsPaused(false);

      Alert.alert(
        'Recording saved',
        'Your audio and its details have been saved on this device.'
      );

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
    } catch (error) {
      Alert.alert(
        'Could not save recording',
        String(error)
      );
    } finally {
      setIsBusy(false);
    }
  };

  const playRecording = async () => {
    if (!savedUri) return;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });

      player.replace(savedUri);
      player.play();
    } catch (error) {
      Alert.alert('Playback error', String(error));
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  };

  const isRecording = recorderState.isRecording;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.brand}>MindScribe</Text>
        <Text style={styles.heading}>New voice note</Text>
        <Text style={styles.subtitle}>
          Speak freely. Your thoughts deserve to be kept.
        </Text>

        <View style={styles.recordingCard}>
          <View
            style={[
              styles.recordingIndicator,
              isRecording && styles.recordingIndicatorActive,
            ]}
          >
            <Text style={styles.micIcon}>
              {isRecording ? '●' : '🎙'}
            </Text>
          </View>

          <Text style={styles.timer}>
            {formatTime(recorderState.durationMillis)}
          </Text>

          <Text style={styles.status}>
            {isRecording
              ? 'Recording in progress'
              : isPaused
                ? 'Recording paused'
                : savedUri
                  ? 'Recording saved'
                  : 'Ready when you are'}
          </Text>

          {!isRecording && !isPaused && !savedUri && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startRecording}
              disabled={isBusy}
            >
              <Text style={styles.primaryButtonText}>
                {isBusy ? 'Please wait…' : 'Start recording'}
              </Text>
            </TouchableOpacity>
          )}

          {isRecording && (
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={pauseRecording}
                disabled={isBusy}
              >
                <Text style={styles.secondaryButtonText}>Pause</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopRecording}
                disabled={isBusy}
              >
                <Text style={styles.stopButtonText}>
                  {isBusy ? 'Saving…' : 'Stop & save'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isPaused && (
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={resumeRecording}
                disabled={isBusy}
              >
                <Text style={styles.primaryButtonText}>Resume</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopRecording}
                disabled={isBusy}
              >
                <Text style={styles.stopButtonText}>
                  {isBusy ? 'Saving…' : 'Stop & save'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {savedUri && (
          <View style={styles.savedCard}>
            <Text style={styles.savedTitle}>Your audio is ready</Text>
            <Text style={styles.savedDescription}>
              {savedTitle}
            </Text>
            <Text style={styles.savedDescription}>
              Your original audio is stored locally.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={playRecording}
            >
              <Text style={styles.primaryButtonText}>
                {playerStatus.playing ? 'Playing…' : '▶ Play recording'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={startRecording}
              disabled={isBusy}
            >
              <Text style={styles.secondaryButtonText}>
                Record another
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.privacyNote}>
          Your voice note stays on your device. You control when to
          delete it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F7F2',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingRight: 16,
  },
  backText: {
    color: '#526B58',
    fontSize: 15,
    fontWeight: '600',
  },
  brand: {
    marginTop: 24,
    color: '#526B58',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heading: {
    marginTop: 12,
    color: '#26352B',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 10,
    color: '#747B72',
    fontSize: 15,
    lineHeight: 23,
  },
  recordingCard: {
    alignItems: 'center',
    marginTop: 34,
    padding: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E8DE',
  },
  recordingIndicator: {
    width: 94,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9EFE6',
    borderRadius: 47,
  },
  recordingIndicatorActive: {
    backgroundColor: '#FCE7E3',
  },
  micIcon: {
    fontSize: 32,
    color: '#526B58',
  },
  timer: {
    marginTop: 24,
    color: '#26352B',
    fontSize: 42,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  status: {
    marginTop: 8,
    marginBottom: 26,
    color: '#747B72',
    fontSize: 14,
  },
  primaryButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 10,
    backgroundColor: '#526B58',
    borderRadius: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  controls: {
    width: '100%',
    gap: 10,
  },
  secondaryButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D7DED2',
    borderRadius: 14,
  },
  secondaryButtonText: {
    color: '#526B58',
    fontSize: 15,
    fontWeight: '700',
  },
  stopButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginTop: 10,
    backgroundColor: '#F6E7E3',
    borderRadius: 14,
  },
  stopButtonText: {
    color: '#9B4035',
    fontSize: 15,
    fontWeight: '700',
  },
  savedCard: {
    marginTop: 22,
    padding: 22,
    backgroundColor: '#EDF2E9',
    borderRadius: 20,
  },
  savedTitle: {
    color: '#26352B',
    fontSize: 19,
    fontWeight: '700',
  },
  savedDescription: {
    marginTop: 8,
    color: '#667166',
    fontSize: 14,
    lineHeight: 21,
  },
  privacyNote: {
    marginTop: 28,
    marginBottom: 24,
    color: '#8A8F84',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },

});
