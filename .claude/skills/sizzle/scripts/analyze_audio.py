#!/usr/bin/env python3
"""
Analyse a narration (or speaker footage audio) and a music bed for a Sizzle film.

Usage:
  python3 analyze_audio.py VOICE MUSIC OUT_DIR [--model small.en]
  python3 analyze_audio.py VOICE -     OUT_DIR      # speech only, no music
  python3 analyze_audio.py -     MUSIC OUT_DIR      # music only

Writes to OUT_DIR:
  vo_words.json     [{"w": word, "s": start_s, "e": end_s}, ...]  (word timestamps, faster-whisper)
  vo_phrases.json   [{"text", "s", "e"}, ...]                       (segments)
  music_beats.json  {"tempo", "beat_interval", "beats": [...], "sections": [...], "duration"}
                    sections = beat times where loudness rises sharply (drops / section starts)

Needs: ffmpeg on PATH, and the Python packages faster-whisper, librosa, soundfile, numpy. If they're missing, it prints
the virtualenv commands to install them. Audio is decoded with ffmpeg rather than PyAV, which avoids PyAV version
mismatches inside faster-whisper.
"""
import json
import os
import subprocess
import sys
import tempfile


def need(mod):
    try:
        return __import__(mod)
    except ImportError:
        sys.exit(
            f"Missing Python module '{mod}'. Set up a virtualenv once, then rerun this script with its python:\n"
            "  python3 -m venv .sizzle-venv && .sizzle-venv/bin/pip install faster-whisper librosa soundfile numpy\n"
            "  .sizzle-venv/bin/python " + " ".join(sys.argv)
        )


def decode(path, sr, mono=True):
    """Decode any audio/video file to float32 numpy via ffmpeg."""
    np = need("numpy")
    sf = need("soundfile")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = tmp.name
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-vn", "-ar", str(sr)]
    cmd += ["-ac", "1"] if mono else []
    subprocess.run(cmd + [wav], check=True)
    data, _ = sf.read(wav, dtype="float32")
    os.unlink(wav)
    return np.asarray(data)


def analyze_voice(path, out, model_name):
    fw = need("faster_whisper")
    audio = decode(path, 16000)
    model = fw.WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(audio, word_timestamps=True, beam_size=5, vad_filter=False)
    words, phrases = [], []
    for seg in segments:
        phrases.append({"text": seg.text.strip(), "s": round(seg.start, 3), "e": round(seg.end, 3)})
        for w in seg.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
    json.dump(words, open(os.path.join(out, "vo_words.json"), "w"), indent=1)
    json.dump(phrases, open(os.path.join(out, "vo_phrases.json"), "w"), indent=1)
    print("Phrases:")
    for p in phrases:
        print(f"  {p['s']:7.2f}–{p['e']:7.2f}  {p['text']}")
    return words


def analyze_music(path, out):
    np = need("numpy")
    librosa = need("librosa")
    sr = 22050
    y = decode(path, sr)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
    tempo = float(np.atleast_1d(tempo)[0])
    beats = np.asarray(beats, dtype=float)
    # Section starts (drops): for each beat, compare the loudness of the next 1.5 s with the previous 1.5 s. Keep the
    # beats where it rises by 15% or more and the rise is the largest within ±2 s (the downbeat itself, not a beat on
    # the way up to it), spaced at least 4 s apart.
    rms = librosa.feature.rms(y=y)[0]
    t = librosa.times_like(rms, sr=sr)

    def mean(a, b):
        m = (t >= a) & (t < b)
        return float(rms[m].mean()) if m.any() else 0.0

    rise = np.array([mean(b, b + 1.5) / max(mean(b - 1.5, b), 1e-6) for b in beats])
    sections = []
    for i, b in enumerate(beats):
        near = (beats >= b - 2) & (beats <= b + 2)
        if rise[i] >= 1.15 and rise[i] == rise[near].max() and (not sections or b - sections[-1] >= 4):
            sections.append(round(float(b), 3))
    info = {
        "tempo": round(tempo, 2),
        "beat_interval": round(float(np.median(np.diff(beats))), 4) if len(beats) > 1 else None,
        "beats": [round(float(b), 3) for b in beats],
        "sections": sections,
        "duration": round(len(y) / sr, 3),
    }
    json.dump(info, open(os.path.join(out, "music_beats.json"), "w"), indent=1)
    print(f"Music: {info['duration']} s, {info['tempo']} BPM (beat every {info['beat_interval']} s)")
    print(f"  section starts (drops): {sections}")
    return info


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    model = "small.en"
    if "--model" in sys.argv:
        model = sys.argv[sys.argv.index("--model") + 1]
        args = [a for a in args if a != model]
    if len(args) != 3:
        sys.exit(__doc__)
    voice, music, out = args
    os.makedirs(out, exist_ok=True)
    if voice != "-":
        analyze_voice(voice, out, model)
    if music != "-":
        analyze_music(music, out)


if __name__ == "__main__":
    main()
