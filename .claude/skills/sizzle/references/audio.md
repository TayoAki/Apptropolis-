# Audio: music bed, narration and the mix

## Inputs and rights
- **Music:** a bed the team supplied or approved. AI-generated tracks (e.g. from Suno) need the paid plan that grants
  commercial use. Tell the team to check.
- **Narration:** the team's own read, or a stock synthetic narrator they generated, such as an ElevenLabs stock voice
  (again, a paid plan for commercial use). Never clone a real person's voice.
- **On a Speaker + Product cut,** the speaker's own recorded voice is the only voice.
- **Never change speed or pitch,** and never rewrite a recorded line. If the team wants a different read, write them
  a new script and they regenerate or re-record it.

## Analyse first

```bash
python3 scripts/analyze_audio.py vo.wav music.wav out/audio/
```

This writes:
- `vo_words.json`: one entry per word, `{ "w", "s", "e" }` (start and end in seconds), plus phrase segments;
- `music_beats.json`: tempo, beat times and section starts (sharp rises in loudness: the drops).

Read the phrase list against the script. TTS sometimes mispronounces brand names; whisper's spelling ("Data Dungeon")
is a hint.

## Place the music
- **Find the drop for the marquee moment.** Pick the music section start (drop) nearest the beat where the film's
  marquee moment should land (the pull-back, the big reveal). Set the music's file offset so that drop lands exactly
  there:
  `offset = drop_time_in_file − marquee_time_in_film`.
- **Check the rest of the grid.** With that offset, check where the other drops land. Ideally:
  - one lands on the payoff;
  - the outro's final hit lands on the lockup.

  If the first section start in the file is close to the offset, start the film exactly on that downbeat, so frame 0
  opens with energy.
- **Fit the length.** The film's runtime ends where the music's ring-out becomes inaudible, plus a few frames. Don't
  fade a ring-out early.
- **Cut on the grid.** Snap beat changes to the nearest beat, within about 60 ms, when the narration allows it. The
  narration's phrase boundaries take priority.

## The mix
- **Narration:** pre-normalize to about −16 LUFS integrated (two-pass `loudnorm`, plus a 70 Hz high-pass), then play
  it at unity.
- **Music ducking:**
  - about −11 dB under speech, with 120 ms attack and 400 ms release around each phrase (from the word timings);
  - about −5 dB in gaps longer than 0.6 s;
  - about −2 dB after the last word, for the outro.
- **Targets, measured on the encoded file:** integrated −14 LUFS ±1 for social and web, and true peak at or below
  −1 dBTP. Check with `scripts/loudness.sh`. If they're off, adjust the music gain or the master gain and re-render;
  don't guess.

Two-pass loudnorm for narration:

```bash
ffmpeg -i vo.mp3 -af "highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json" -f null - 2> ln.txt
# copy measured_I / measured_TP / measured_LRA / measured_thresh / offset from ln.txt into the second pass:
ffmpeg -i vo.mp3 -af "highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:offset=…:linear=true" -ar 48000 vo_master.wav
```

## Captions from the narration
- Make the SRT from `vo_words.json`:
  - cues of at most about 32 characters per line, and at most 2 lines;
  - break at punctuation or phrase gaps;
  - keep every spoken word;
  - use the brand's spelling ("DataDungeon", not "Data Dungeon").
- Burn the captions only into cuts that have a band for them (vertical, square). Ship the SRT with the 16:9 master.
