import MidiWriter from "midi-writer-js";

function noteNameToMidi(note: string, octave: number) {
  const map: Record<string, number> = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
  };

  const semitone = map[note];
  if (semitone === undefined) return null;
  return 12 * (octave + 1) + semitone; // C4=60
}

function normalizeChord(raw: string) {
  let s = raw.trim();
  if (!s) return null;

  s = s.replaceAll("(", "").replaceAll(")", "");
  if (s.includes("/")) s = s.split("/")[0];
  s = s.replace(/\s+/g, "");

  const m = s.match(/^([A-G])(#|b)?(.*)$/);
  if (!m) return null;

  const root = m[1] + (m[2] || "");
  const rest = (m[3] || "").toLowerCase();

  return { root, rest };
}

function chordToNotes(root: string, rest: string, octave = 4) {
  const rootMidi = noteNameToMidi(root, octave);
  if (rootMidi === null) return null;

  let intervals = [0, 4, 7]; // major triad

  if (rest.startsWith("m") && !rest.startsWith("maj")) intervals = [0, 3, 7];
  if (rest.includes("dim") || rest.includes("°")) intervals = [0, 3, 6];

  const isMaj7 = rest.includes("maj7");
  const is7 = rest.includes("7");
  const isM7 =
    rest.startsWith("m7") || (rest.startsWith("m") && rest.includes("7"));

  if (isMaj7) intervals = [...intervals, 11];
  else if (isM7) intervals = [...intervals, 10];
  else if (is7) intervals = [...intervals, 10];

  return intervals.map((i) => rootMidi + i);
}

export function chordsToMidiBytes(
  chords: string[],
  bpm: number,
  timeSignature: "4/4" | "3/4" | "6/8"
) {
  const track = new MidiWriter.Track();
  track.setTempo(Math.max(40, Math.min(240, bpm)));

  const [nn, dd] = timeSignature.split("/");
  track.addEvent(new MidiWriter.TimeSignatureEvent(Number(nn), Number(dd)));

  const duration = timeSignature === "6/8" ? "2" : "1";

  for (const line of chords) {
    const pieces = String(line)
      .split("-")
      .map((x) => x.trim())
      .filter(Boolean);

    const chord = pieces[0] || "";
    const parsed = normalizeChord(chord);
    if (!parsed) continue;

    const notes = chordToNotes(parsed.root, parsed.rest, 4);
    if (!notes) continue;

    track.addEvent(
      new MidiWriter.NoteEvent({
        pitch: notes,
        duration,
        velocity: 75,
      })
    );
  }

  const writer = new MidiWriter.Writer([track]);
  return writer.buildFile();
}
