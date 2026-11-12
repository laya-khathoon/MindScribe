# MindScribe

A private voice-notes app for your phone. Record notes, play them back,
search them, and transcribe them to text - all on your device. No account,
no cloud, no API key.

## Features

- **Record** voice notes with one tap.
- **Play back** any note in the built-in player.
- **Search** notes by title or transcribed text.
- **Transcribe on device** with Whisper (`whisper.rn`). The small
  English model (`ggml-tiny.en`) downloads once from Hugging Face on first
  use; after that, transcription works offline.
- **Local storage only** - notes and transcripts live in an on-device
  SQLite database. Delete any note at any time.

## Tech stack

- [Expo](https://expo.dev) + React Native (file-based routing with expo-router)
- `expo-audio` for recording and playback
- `expo-sqlite` for local storage
- `whisper.rn` for on-device speech-to-text

## Run it

```bash
npm install
npx expo start
```

Then open the app in a development build on your phone (transcription needs
a development build, not Expo Go, because `whisper.rn` uses native code).
