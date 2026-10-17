import * as SQLite from 'expo-sqlite';

export type VoiceNote = {
  id: number;
  title: string;
  audioUri: string;
  durationMillis: number;
  createdAt: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('mindscribe.db');
  }

  const db = await databasePromise;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS voice_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      audio_uri TEXT NOT NULL,
      duration_millis INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

export async function getVoiceNotes(): Promise<VoiceNote[]> {
  const db = await getDatabase();

  return db.getAllAsync<VoiceNote>(`
    SELECT
      id,
      title,
      audio_uri AS audioUri,
      duration_millis AS durationMillis,
      created_at AS createdAt
    FROM voice_notes
    ORDER BY id DESC;
  `);
}

export async function saveVoiceNote(
  title: string,
  audioUri: string,
  durationMillis: number
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO voice_notes
      (title, audio_uri, duration_millis, created_at)
     VALUES (?, ?, ?, ?);`,
    title,
    audioUri,
    durationMillis,
    new Date().toISOString()
  );

  return result.lastInsertRowId;
}

export async function deleteVoiceNote(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM voice_notes WHERE id = ?;', id);
}
