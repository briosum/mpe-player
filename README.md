MPE.js Player v1.0.0
===

MPE Player using [mpe.js](http://mpe.js.org/) Library.

This demo app was built to play with Browser Based Audio Oscillators using MPE devices ( such as ROLI Lightpad & Seaboard BLOCKS ).  This _should_ work with any Modern Browser that supports [`AudioContext`](https://caniuse.com/#search=AudioContext).

### [♫ Use MPE Player ♫](https://briosum.com/lab/mpe-player/)

Seaboard BLOCK
---
![seaboard](img/demo-seaboard.gif "seaboard")

This demo uses the following Seaboard BLOCK config settings via the BLOCKS Dashboard.

- [x] Note Start channel: `2`
- [x] Note End channel: `16`
- [x] Use MPE: `Checked`
- [x] Pitch Bend Range: `48`


Lightpad BLOCK
---
![lightpad](img/demo-lightpad.gif "lightpad")

This demo uses the following Lightpad BLOCK config settings via the BLOCKS Dashboard.

- [x] Setting: `4x4 MPE Mode`
- [x] MIDI Mode: `MPE`
- [x] Note channel first: `2`
- [x] Note channel last: `16`
- [x] Base note: `C3`
- [x] Grid size: `4`
- [x] Send pitch bend: `unchecked`


Instructions
---

Connect your MPE device to your Web Browser and tinker away.

If you want to tweak some stuff, `MpePlayer` has a few config options.  `waveShape` is probably the one you might enjoy the most as it sets up the oscillator sound that the MPE device uses.

```
<script>
  MpePlayer.init({
    debug: false,
    debugHTML: true,
    waveShape: 'sine' // 'sine', 'square', 'sawtooth', 'triangle'
  });
</script>
```

Legal Stuff
---
Briosum is not affiliated with ROLI. All Product Names & Images are Copyright [ROLI Ltd](https://roli.com/)
