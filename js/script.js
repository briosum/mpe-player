/**
 * MPE Player
 * Connect an MPE device to your browser and play some music.
 *
 * This is just for demo purposes to show how you can connect your MPE device
 * and use it in a browser window. Feel free to do whatever you want with this
 * code, and hit me up with any questions of comments.
 *
 * @license MIT
 * @author Peter Schmalfeldt <me@peterschmalfeldt.com>
 * @link https://github.com/briosum/mpe-player
 */
var MpePlayer = {
  /**
   * Track if we have a device connected
   */
  connected: false,

  /**
   * MPE Instrument reference which will be populated on MpePlayer.init() with `mpe.min.js`
   */
  instrument: null,

  /**
   * Store Information about connected device
   */
  port: {},

  /**
   * MPE Player Configuration Options
   */
  options: {
    debug: false,
    debugHTML: true,
    debugElementID: 'debug',
    waveShape: 'sine'
  },

  /**
   * MPE Player Audio Engine
   */
  audio: {
    /**
     * Audio Context based on Browser Support
     */
    context: new (typeof AudioContext !== "undefined" && AudioContext !== null ? AudioContext : webkitAudioContext),

    /**
     * Audio Engine Oscillators
     */
    oscillators: {},

    /**
     * Audio Engine Envelopes
     */
    envelopes: {},

    /**
     * Audio Engine Note Timeouts
     */
    timeouts: {},

    /**
     * Convert MIDI note to Frequency
     *
     * @param note - MIDI Note
     * @param pitchBend - MPEs `pitchBend` parameter ( used here with x 12 to mimic octave bend )
     * @returns {number}
     */
    frequencyFromNoteNumber: function (note, pitchBend) {
      return (440 * Math.pow(2, (note-69) / 12)) + (pitchBend * 12);
    },

    /**
     * Make sure output does not go above or below limits
     * @param output
     * @returns {number}
     */
    limiter: function (output) {
      if (output < 0) {
        output = 0;
      }
      if (output > 1) {
        output = 1;
      }

      return output;
    },

    /**
     * Play Note
     * Use the browsers ability to create oscillators and apply some fun MPE features
     * such as pitch bend and after touch.  You could probably create an oscillator filter
     * here and use the `timbre` MPE param to make gliding on the keys apply an effect.
     *
     * @param note - This is the MPE Note object being passed in from MPEs `subscribe` handler
     */
    playNote: function (note) {

      // Setup Note Defaults
      var index = 'note_' + note.noteNumber;
      var now = MpePlayer.audio.context.currentTime;
      var frequency = MpePlayer.audio.frequencyFromNoteNumber(note.noteNumber, note.pitchBend);

      // Check if we are already playing this note, if not, create it
      if (MpePlayer.audio.oscillators[index] === undefined) {

        // Create oscillator for this note
        MpePlayer.audio.oscillators[index] = MpePlayer.audio.context.createOscillator();
        MpePlayer.audio.oscillators[index].type = MpePlayer.options.waveShape;
        MpePlayer.audio.oscillators[index].frequency.setValueAtTime(110, 0);

        // Create envelope for this note
        MpePlayer.audio.envelopes[index] = MpePlayer.audio.context.createGain();
        MpePlayer.audio.envelopes[index].gain.value = 0.0;

        // Connect oscillator & envelope
        MpePlayer.audio.envelopes[index].connect(MpePlayer.audio.context.destination);
        MpePlayer.audio.oscillators[index].connect(MpePlayer.audio.envelopes[index]);

        // Start oscillator
        MpePlayer.audio.oscillators[index].start(now);
      }

      // Create some cached params for referencing oscillator & envelope
      var oscillator = MpePlayer.audio.oscillators[index];
      var envelope = MpePlayer.audio.envelopes[index];

      // Control oscillator for this note
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.cancelScheduledValues(0);
      oscillator.frequency.setTargetAtTime(frequency, 0, 0);
      oscillator.frequency.linearRampToValueAtTime(1, now + 5);

      // Control envelope for this note
      envelope.gain.cancelScheduledValues(now);
      envelope.gain.setValueAtTime(MpePlayer.audio.limiter(note.pressure), now);
      envelope.gain.setTargetAtTime(MpePlayer.audio.limiter(note.pressure), 0, 0);
      envelope.gain.linearRampToValueAtTime(1, now + 5);

      // Clear Timeouts for Currently Playing Note
      clearTimeout(MpePlayer.audio.timeouts[index]);

      // Setup to auto stop and remove it from our
      MpePlayer.audio.timeouts[index] = setTimeout(function () {

        // Stop oscillator
        MpePlayer.audio.oscillators[index].stop(0);

        // Remove oscillator & envelope from memory
        delete MpePlayer.audio.oscillators[index];
        delete MpePlayer.audio.envelopes[index];
      }, 100);
    }
  },

  /**
   * Render Notes Being Played on Device
   */
  render: {
    /**
     * Render Note Timeouts
     */
    timeouts: {},

    /**
     * Handle Detecting which MPE Device is Connected
     */
    init: function () {
      var seaboard = document.getElementById('seaboard');
      var lightpad = document.getElementById('lightpad');
      var connectDevice = document.getElementById('connect-device');

      seaboard.style.opacity = 0;
      lightpad.style.opacity = 0;
      connectDevice.style.opacity = 0;

      seaboard.style.display = 'none';
      lightpad.style.display = 'none';
      connectDevice.style.display = 'none';

      if (!MpePlayer.connected) {
        connectDevice.style.opacity = 1;
        connectDevice.style.display = 'flex';
      }
      else {
        if (MpePlayer.port.name.trim() === 'Seaboard BLOCK') {
          seaboard.style.opacity = 1;
          seaboard.style.display = 'block';
        }
        else if (MpePlayer.port.name.trim() === 'Lightpad BLOCK') {
          lightpad.style.opacity = 1;
          lightpad.style.display = 'block';
        }
      }
    },

    /**
     * Render Note Being Played
     * rendering it based on its device name
     *
     * @param note
     */
    note: function (note){
      if (MpePlayer.port.name.trim() === 'Seaboard BLOCK') {
        MpePlayer.render.seaboard(note);
      }

      if (MpePlayer.port.name.trim() === 'Lightpad BLOCK') {
        MpePlayer.render.lightpad(note);
      }
    },

    /**
     * Render ROLI Seaboard Block
     *
     * Seaboard Settings:
     *
     * - Note Start channel: 2
     * - Note End channel: 16
     * - Use MPE: Checked
     * - Pitch Bend Range: 48
     *
     * @param note
     */
    seaboard: function (note) {
      var index = 'note_' + note.noteNumber;
      var seaboard = document.getElementById('seaboard');
      var elm = document.getElementById(index);

      // Check if we are already have not on screen
      if (!elm) {
        // Create note to append to Instrument
        elm = document.createElement('div');
        elm.className = 'note color note-' + note.noteNumber;
        elm.id = 'note_' + note.noteNumber;

        // Setup Positioning
        var position = (note.noteNumber % 24);
        var offset = (note.noteNumber % 24);

        // Handle the Gaps in the Seaboard that are not really unique keys
        if (position > 4 && position <= 11) {
          offset += 1;
        }
        else if (position > 11 && position <= 16) {
          offset += 2;
        }
        else if (position > 16) {
          offset += 3;
        }

        // Apply Initial Style
        elm.style.left = (13 + (offset * 30) * 0.955) + 'px';

        // Append to Instrument
        seaboard.appendChild(elm);
      }

      // Convert MPE note into CSS Styles
      var pitchBend = (800/50) * note.pitchBend;
      var scale = 'scale(' + ( 1 + note.pressure ) + ')';
      var translate = 'translate(' + pitchBend + 'px, 0)';

      // Apply Live Styles
      elm.style.top = (400 - (400 * note.timbre) - (15 * ( 1 + note.pressure ))) + 'px';
      elm.style.filter = 'blur('+ (1 * note.pressure) + 'px)';
      elm.style.transform = scale + ' ' + translate;
      elm.style.webkitTransform = scale + ' ' + translate;

      // Automatically Remove Note from DOM
      clearTimeout(MpePlayer.render.timeouts[index]);
      MpePlayer.render.timeouts[index] = setTimeout(function () {
        elm.remove();
      }, 100);
    },

    /**
     * Render ROLI Lightpad Block
     *
     * Lightpad Settings:
     *
     * - Setting: 4x4 MPE Mode
     * - MIDI Mode: MPE
     * - Note channel first: 2
     * - Note channel last: 16
     * - Base note: C3
     * - Grid size: 4
     * - Send pitch bend: unchecked
     *
     * @param note
     */
    lightpad: function (note) {
      var index = 'note_' + note.noteNumber;
      var lightpad = document.getElementById('lightpad');
      var elm = document.getElementById(index);

      // Check if we are already have not on screen
      if (!elm) {
        // Create note to append to Instrument
        elm = document.createElement('div');
        elm.className = 'note-square color note-' + note.noteNumber;
        elm.id = 'note_' + note.noteNumber;

        // Setup Positioning
        var vOffset = 0;
        var hOffset = (note.noteNumber % 4);
        var position = (note.noteNumber % 60);

        if (position > 3 && position <= 7) {
          vOffset += 1;
        }
        else if (position > 7 && position <= 11) {
          vOffset += 2;
        }
        else if (position > 11) {
          vOffset += 3;
        }

        var vGutter = (vOffset * 26);
        var hGutter = (hOffset * 26);

        // Apply Initial Style
        elm.style.left = (12 + (75 * hOffset)) + hGutter + 'px';
        elm.style.bottom = (12 + (75 * vOffset)) + vGutter + 'px';

        // Append to Instrument
        lightpad.appendChild(elm);
      }

      // Convert MPE note into CSS Styles
      elm.style.opacity = 0.35 + ((1 * note.pressure) * 0.65);
      elm.style.filter = 'blur('+ (5 * note.pressure) + 'px)';

      // Automatically Remove Note from DOM
      clearTimeout(MpePlayer.render.timeouts[index]);
      MpePlayer.render.timeouts[index] = setTimeout(function () {
        elm.remove();
      }, 100);
    }
  },

  /**
   * Initialize MPE Player
   * @param options - JSON Object to Customize Player
   */
  init: function (options) {

    // Overload Default Option with init(options)
    MpePlayer.options = Object.assign(MpePlayer.options, options);

    // Configure `MpePlayer.instrument` to use global `mpe` from `mpe.min.js`
    MpePlayer.instrument = mpe({
      log: MpePlayer.options.debug
    });

    // Subscribe to Active Note Changes
    MpePlayer.instrument.subscribe(function (notes) {
      // Send Individual Notes to Audio Engine
      for (var i = 0; i < notes.length; i++) {
        MpePlayer.audio.playNote(notes[i]);
        MpePlayer.render.note(notes[i]);
      }

      // Send Debug of Notes to Debug HTML Node
      if (MpePlayer.options.debugHTML && MpePlayer.options.debugElementID) {
        var output = JSON.stringify(notes, null, 2);
        var debug = document.getElementById(MpePlayer.options.debugElementID);
        debug.innerText = (output.length > 2) ? output : '';
        debug.style.opacity = (output.length > 2) ? 1 : 0;
      }
    });

    // Check first that we have can have MIDI access
    if (navigator.requestMIDIAccess) {

      // Request Midi Access
      navigator.requestMIDIAccess().then(function (access) {

        // Handle Device
        access.onstatechange = function(e) {
          MpePlayer.port = {
            connection: e.port.connection,
            id: e.port.id,
            manufacturer: e.port.manufacturer,
            name: e.port.name,
            state: e.port.state,
            type: e.port.type,
            version: e.port.version
          };

          // Update Status of Device Connection
          MpePlayer.connected = (e.port.state === 'connected');

          // Show MPE Device
          MpePlayer.render.init();
        };

        setTimeout(MpePlayer.render.init, 250)

        // Capture Input from MIDI Device
        var inputs = access.inputs.values();

        // Loop through inputs to process MIDI Messages
        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
          // Hand off MIDI Message to MPEs Midi Message Processor
          input.value.onmidimessage = function (message) {
            MpePlayer.instrument.processMidiMessage(message.data);
          };
        }
      }, function (e) {
        console.error('No access to your midi devices.' + e)
      });
    }
  }
};
