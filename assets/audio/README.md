# Ambient audio

| File | Status | Notes |
| --- | --- | --- |
| `whitefish-ambience-loop.mp3` | **shipped** | 35.5s, 44.1kHz stereo, ~97kbps VBR, 422 KB. -17.9 LUFS integrated, -4.8 dBTP. Seamless. |

Steady mountain air with the lake under it — no waves, no birds, nothing that
resolves into an event you would notice a second time. `assets/js/config.js`
points at the path; nothing else hard-codes it.

## How it behaves

It is started only by the guest's tap on the envelope — mobile browsers refuse
audio outside a gesture — then fades in over 4 seconds to volume 0.16 and can
be muted with the control in the lower-left corner. If the file is absent,
playback fails silently and the mute control retires itself. Nothing else on
the page is affected.

Path, target volume and fade live in `assets/js/config.js`.

## Don't drop a raw clip in here

The shipped file was built from the 10-second clip attached to issue #10, and
that clip could not have been used as it arrived:

- it **opens from silence** over ~1.25s, which loops as a hole every 10s;
- its **ends don't meet**, so the loop point clicks;
- it sits at **-37 LUFS**, which at the page's 0.16 gain is inaudible.

`tools/make-ambient-loop.sh` fixes all three — trims the fade-in, folds the
tail back over the head with an equal-power crossfade, normalises to -18 LUFS
with a single constant gain, and tiles the result to ~35s:

```
tools/make-ambient-loop.sh path/to/new-source.mp3
```

Everything is overridable from the environment (`TRIM`, `XFADE`, `TILES`,
`LUFS`, `TP`, `OUT`).

## Why 35 seconds for a 7-second loop

The loop itself is seamless at 7.1s, and repeating it costs nothing
perceptually — the material is broadband air with a 1.3 LU range, so there is
no phrase to recognise. What repeating *does* cost is the loop point:
browsers restart an `<audio loop>` MP3 through the decoder's padding, and that
one join is the only seam the script cannot smooth. Tiling five copies into the
file makes it happen every 35 seconds instead of every 7.

If you ever need it gapless, the answer is a different container, not a longer
file — but MP3 is the only format every guest's phone will play.

## Level

-18 LUFS in the file, 0.16 gain on the page, so roughly **-34 LUFS** actually
in the room: under conversation, over silence. If it needs to move, change
`audio.targetVolume` in `assets/js/config.js` — leave the file where it is, so
the mastering stays comparable if the clip is ever replaced.
