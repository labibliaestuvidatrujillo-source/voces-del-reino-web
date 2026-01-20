import { Midi } from "@tonejs/midi";

type MidiInput = {
  title?: string;
  tempo?: number;
  timeSignature?: string; // "4/4"
  chords?: string[];
};

const sharpToFlat: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

const triads: Record<string, { maj: string[]; min: string[] }> = {
  C: { maj: ["C", "E", "G"], min: ["C", "Eb", "G"] },
  Db: { maj: ["Db", "F", "Ab"], min: ["Db", "E", "Ab"] },
  D: { maj: ["D", "F#", "A"], min: ["D", "F", "A"] },
  Eb: { maj: ["Eb", "G", "Bb"], min: ["Eb", "Gb", "Bb"] },
  E: { maj: ["E", "G#", "B"], min: ["E", "G", "B"] },
  F: { maj: ["F", "A", "C"], min: ["F", "Ab", "C"] },
  Gb: { maj: ["Gb", "Bb", "Db"], min: ["Gb", "A", "Db"] },
  G: { maj: ["G", "B", "D"], min: ["G", "Bb", "D"] },
  Ab: { maj: ["Ab", "C", "Eb"], min: ["Ab", "B", "Eb"] },
  A: { maj: ["A", "C#", "E"], min: ["A", "C", "E"] },
  Bb: { maj: ["Bb", "D", "F"], min: ["Bb", "Db", "F"] },
  B: { maj: ["B", "D#", "F#"], min: ["B", "D", "F#"] },
};

function normalizeChordRoot(root: string) {
  return sharpToFlat[root] ?? root;
}

function parseChord(chord: string): { root: string; isMinor: boolean } | null {
  // Soporta: D, Bm, F#, Bb, C#m etc (por ahora triadas simples)
  const m = chord.trim().match(/^([A-G])([b#]?)(m)?/);
  if (!m) return null;

  const rawRoot = `${m[1]}${m[2] || ""}`;
  const root = normalizeChordRoot(rawRoot);
  const isMinor = Boolean(m[3]);

  return { root, isMinor };
}

function chordToTriadNotes(chord: string, octave: number): string[] {
  const parsed = parseChord(chord);
  if (!parsed) return [];

  const triad = triads[parsed.root];
  if (!triad) return [];

  const notes = parsed.isMinor ? triad.min : triad.maj;
  return notes.map((n) => `${n}${octave}`);
}

function chordToBassNote(chord: string, octave: number): string | null {
  const parsed = parseChord(chord);
  if (!parsed) return null;
  return `${parsed.root}${octave}`;
}

export function chordsToMidiBytes2Tracks(input: MidiInput): Uint8Array {
  const tempo = input.tempo ?? 74;
  const timeSig = input.timeSignature ?? "4/4";
  const beatsPerBar = parseInt(String(timeSig).split("/")[0] || "4", 10) || 4;

  const midi = new Midi();
  midi.header.setTempo(tempo);

  // ✅ TRACK 1: Piano Chords
  const piano = midi.addTrack();
  piano.name = "Piano Chords";

  // ✅ TRACK 2: Bass Root
  const bass = midi.addTrack();
  bass.name = "Bass";

  const secondsPerBeat = 60 / tempo;
  const barDuration = beatsPerBar * secondsPerBeat;

  const chordsLines = input.chords ?? [];
  let t = 0;

  // Octavas
  const pianoOctave = 4;
  const bassOctave = 2;

  for (const line of chordsLines) {
    // Ej: "D - A - Bm - G"
    const parts = line
      .split("-")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length === 0) continue;

    const chordDuration = barDuration / parts.length;

    for (const chord of parts) {
      // Piano: triada completa
      const notes = chordToTriadNotes(chord, pianoOctave);
      for (const note of notes) {
        piano.addNote({
          name: note,
          time: t,
          duration: chordDuration * 0.95,
          velocity: 0.75,
        });
      }

      // Bass: solo root
      const root = chordToBassNote(chord, bassOctave);
      if (root) {
        bass.addNote({
          name: root,
          time: t,
          duration: chordDuration * 0.98,
          velocity: 0.85,
        });
      }

      t += chordDuration;
    }
  }

  return midi.toArray();
}
