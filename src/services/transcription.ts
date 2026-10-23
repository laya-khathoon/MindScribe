
import * as FileSystem from 'expo-file-system/legacy';
import { initWhisper, type WhisperContext } from 'whisper.rn';

const MODEL_URL =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin';

const MODEL_NAME = 'ggml-tiny.en.bin';

let whisperContext: WhisperContext | null = null;
let initializationPromise: Promise<WhisperContext> | null = null;

export type ModelDownloadProgress = {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
};

function getModelUri(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error('App document storage is unavailable.');
  }

  return `${FileSystem.documentDirectory}${MODEL_NAME}`;
}

export async function isModelDownloaded(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(getModelUri());
  return info.exists && !info.isDirectory && (info.size ?? 0) > 1_000_000;
}

export async function downloadWhisperModel(
  onProgress?: (progress: ModelDownloadProgress) => void,
): Promise<string> {
  const modelUri = getModelUri();

  if (await isModelDownloaded()) {
    return modelUri;
  }

  // Remove any incomplete download before trying again.
  const existing = await FileSystem.getInfoAsync(modelUri);

  if (existing.exists) {
    await FileSystem.deleteAsync(modelUri, { idempotent: true });
  }

  const download = FileSystem.createDownloadResumable(
    MODEL_URL,
    modelUri,
    {},
    (progress) => onProgress?.(progress),
  );

  const result = await download.downloadAsync();

  if (!result) {
    throw new Error('The Whisper model download did not complete.');
  }

  if (!(await isModelDownloaded())) {
    await FileSystem.deleteAsync(modelUri, { idempotent: true });
    throw new Error('The downloaded Whisper model is incomplete.');
  }

  return modelUri;
}

export async function getWhisperContext(
  onProgress?: (progress: ModelDownloadProgress) => void,
): Promise<WhisperContext> {
  if (whisperContext) {
    return whisperContext;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const modelUri = await downloadWhisperModel(onProgress);

    const context = await initWhisper({
      filePath: modelUri,
      useGpu: true,
    });

    whisperContext = context;
    return context;
  })();

  try {
    return await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

export async function transcribeAudio(
  audioUri: string,
): Promise<string> {
  const context = await getWhisperContext();

  const { promise } = context.transcribe(audioUri, {
    language: 'en',
    maxThreads: 4,
  });

  const result = await promise;
  const transcript = result.result.trim();

  if (!transcript) {
    throw new Error(
      'No speech was recognized. Try a clearer recording.',
    );
  }

  return transcript;
}

export async function releaseWhisperContext(): Promise<void> {
  if (!whisperContext) {
    return;
  }

  const context = whisperContext;
  whisperContext = null;

  await context.release();
}
