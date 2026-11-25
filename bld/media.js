(function () {
  if (typeof PlayerContainer === "undefined" || typeof Media === "undefined") {
    return;
  }

  var BaseAudioContext = window.AudioContext || window.webkitAudioContext;
  var sharedAudio = null;
  window.AudioContext = function () {
    if (sharedAudio) return sharedAudio;
    try {
      sharedAudio = new BaseAudioContext({ latencyHint: "playback", sampleRate: 22050 });
    } catch (e) {
      sharedAudio = new BaseAudioContext();
    }
    return sharedAudio;
  };
  window.AudioContext.prototype = BaseAudioContext.prototype;

  var MIME = { MPEG_layer_3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", aac: "audio/aac", m4a: "audio/mp4" };
  var TYPES = [
    ["audio/mpeg", "MPEG_layer_3"], ["audio/mp3", "MPEG_layer_3"], ["audio/x-mp3", "MPEG_layer_3"], ["audio/mpeg3", "MPEG_layer_3"],
    ["audio/wav", "wav"], ["audio/x-wav", "wav"], ["audio/ogg", "ogg"], ["audio/aac", "aac"],
    ["audio/mp4", "m4a"], ["audio/x-m4a", "m4a"], ["audio/x-midi", "mid"], ["audio/sp-midi", "mid"]
  ];

  TYPES.forEach(function (t) {
    Media.contentTypeToFormat.set(t[0], t[1]);
    ["memory", "file", "http", "https"].forEach(function (p) {
      if (Media.ContentTypes[p].indexOf(t[0]) < 0) Media.ContentTypes[p].push(t[0]);
    });
  });
  Object.keys(MIME).forEach(function (f) {
    Media.formatToContentType.set(f, MIME[f]);
    if (Media.supportedAudioFormats.indexOf(f) < 0) Media.supportedAudioFormats.push(f);
  });
  [["aac", "aac"], ["m4a", "m4a"], ["mid", "mid"], ["midi", "mid"]].forEach(function (e) {
    Media.extToFormat.set(e[0], e[1]);
  });

  function audio() {
    return new window.AudioContext();
  }

  function unlock() {
    var ctx = audio();
    if (ctx.state !== "running") ctx.resume();
  }

  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);

  function sniff(d, n) {
    if (n < 4) return null;
    var s = String.fromCharCode(d[0] & 255, d[1] & 255, d[2] & 255, d[3] & 255);
    if (s === "#!AM") return "amr";
    if (s === "MThd") return "mid";
    if (s === "OggS") return "ogg";
    if (s === "RIFF" && n >= 12 && String.fromCharCode(d[8] & 255, d[9] & 255, d[10] & 255, d[11] & 255) === "WAVE") return "wav";
    if (s.slice(0, 3) === "ID3") return "MPEG_layer_3";
    if (n >= 8 && String.fromCharCode(d[4] & 255, d[5] & 255, d[6] & 255, d[7] & 255) === "ftyp") return "m4a";
    var b0 = d[0] & 255, b1 = d[1] & 255;
    if (b0 === 255 && (b1 & 0xf6) === 0xf0) return "aac";
    if (b0 === 255 && (b1 & 0xe0) === 0xe0 && (b1 & 6) !== 0) return "MPEG_layer_3";
    return null;
  }

  function sampled(p) {
    return !!MIME[p.getMediaFormat()];
  }

  function decode(p) {
    if (!p.dirty && p.decoding) return p.decoding;
    p.dirty = false;
    var bytes = p.data.slice(0, p.contentSize).buffer;
    p.decoding = new Promise(function (resolve) {
      audio().decodeAudioData(bytes, function (buf) {
        p.buf = buf;
        resolve(0);
      }, function () {
        p.buf = null;
        resolve(0);
      });
    });
    return p.decoding;
  }

  function gain(p) {
    if (!p.gainNode) {
      p.gainNode = audio().createGain();
      p.gainNode.connect(audio().destination);
      p.volume = p.volume === undefined ? 100 : p.volume;
    }
    p.gainNode.gain.value = p.muted ? 0 : p.volume / 100;
    return p.gainNode;
  }

  function heard(ctx) {
    var o = ctx.getOutputTimestamp && ctx.getOutputTimestamp();
    if (o && o.contextTime > 0) return Math.min(ctx.currentTime, o.contextTime + (performance.now() - o.performanceTime) / 1000);
    return ctx.currentTime - (ctx.baseLatency || 0) - (ctx.outputLatency || 0);
  }

  function position(p) {
    if (!p.src) return p.offset || 0;
    return Math.min(audio().currentTime - p.startedAt, p.buf ? p.buf.duration : Infinity);
  }

  function halt(p) {
    if (!p.src) return;
    p.offset = position(p);
    var src = p.src;
    p.src = null;
    src.onended = null;
    try {
      src.stop();
    } catch (e) {}
  }

  function play(p) {
    p.wantPlay = true;
    var ctx = audio();
    if (ctx.state !== "running") ctx.resume();
    decode(p).then(function () {
      if (!p.wantPlay || p.src || !p.buf) return;
      var src = ctx.createBufferSource();
      var off = p.offset || 0;
      if (off >= p.buf.duration) off = 0;
      src.buffer = p.buf;
      src.connect(gain(p));
      p.src = src;
      p.startedAt = ctx.currentTime - off;
      src.onended = function () {
        if (p.src !== src) return;
        p.src = null;
        p.offset = 0;
        p.wantPlay = false;
        MIDP.sendEndOfMediaEvent(p.pId, p.buf.duration * 1000 | 0);
      };
      src.start(0, off);
    });
  }

  var P = PlayerContainer.prototype;
  var base = {};
  ["writeBuffer", "start", "pause", "resume", "close", "getMediaTime", "setMediaTime", "getDuration",
   "getVolume", "setVolume", "getMute", "setMute"].forEach(function (m) {
    base[m] = P[m];
  });

  P.getMediaFormat = function () {
    return (this.contentSize && sniff(this.data, this.contentSize)) || this.mediaFormat;
  };

  P.writeBuffer = function (buffer, resolve, bufferSize) {
    var fmt = this.contentSize ? this.getMediaFormat() : sniff(buffer, buffer.length) || this.mediaFormat;
    if (!MIME[fmt]) {
      base.writeBuffer.call(this, buffer, resolve, bufferSize);
      return;
    }
    var need = this.contentSize + buffer.length;
    if (!this.data || this.data.length < need) {
      var grown = new Int8Array(Math.max(need, this.data ? this.data.length * 2 : this.getBufferSize()));
      if (this.data) grown.set(this.data.subarray(0, this.contentSize));
      this.data = grown;
    }
    this.data.set(buffer, this.contentSize);
    this.contentSize = need;
    this.dirty = true;
    resolve(bufferSize);
  };

  P.finish = function () {
    this.eof = true;
    if (!this.contentSize || !sampled(this)) return null;
    return decode(this);
  };

  P.start = function () {
    if (!sampled(this)) return base.start.call(this);
    play(this);
  };

  P.resume = function () {
    if (!sampled(this)) return base.resume.call(this);
    play(this);
  };

  P.pause = function () {
    if (!sampled(this)) return base.pause.call(this);
    this.wantPlay = false;
    halt(this);
  };

  P.close = function () {
    if (!sampled(this)) return base.close.call(this);
    this.wantPlay = false;
    halt(this);
    if (this.gainNode) this.gainNode.disconnect();
    this.gainNode = null;
    this.buf = null;
    this.data = null;
  };

  P.getMediaTime = function () {
    if (!sampled(this)) return base.getMediaTime.call(this);
    return position(this) * 1e6 | 0;
  };

  P.setMediaTime = function (us) {
    if (!sampled(this)) return base.setMediaTime.call(this, us);
    var playing = !!this.src;
    halt(this);
    this.offset = Math.max(0, us) / 1e6;
    if (playing) play(this);
    return us;
  };

  P.getDuration = function () {
    if (!sampled(this)) return base.getDuration ? base.getDuration.call(this) : -1;
    return this.buf ? this.buf.duration * 1e6 | 0 : -1;
  };

  P.getVolume = function () {
    if (!sampled(this)) return base.getVolume.call(this);
    return this.volume === undefined ? 100 : this.volume;
  };

  P.setVolume = function (level) {
    if (!sampled(this)) return base.setVolume.call(this, level);
    this.volume = Math.max(0, Math.min(100, level));
    gain(this);
  };

  P.getMute = function () {
    if (!sampled(this)) return base.getMute.call(this);
    return !!this.muted;
  };

  P.setMute = function (mute) {
    if (!sampled(this)) return base.setMute.call(this, mute);
    this.muted = !!mute;
    gain(this);
  };

  function Recorder(url) {
    var params = {};
    (url.split("?")[1] || "").split("&").forEach(function (kv) {
      var i = kv.indexOf("=");
      if (i > 0) params[kv.slice(0, i).toLowerCase()] = decodeURIComponent(kv.slice(i + 1)).toLowerCase();
    });
    this.amr = /amr/.test(params.encoding || "");
    this.rate = this.amr ? 8000 : +params.rate || 8000;
    this.bits = params.bits === "8" ? 8 : 16;
    this.chunks = [];
    this.data = new Int8Array(0);
    this.recording = false;
  }

  Recorder.prototype.getContentType = function () {
    return this.amr ? "audio/amr" : "audio/x-wav";
  };

  Recorder.prototype.open = function () {
    var r = this;
    if (r.ready) return r.ready;
    r.ready = navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } }).then(function (stream) {
      r.stream = stream;
      r.ctx = new AudioContext();
      r.src = r.ctx.createMediaStreamSource(stream);
      r.node = r.ctx.createScriptProcessor(4096, 1, 1);
      r.node.onaudioprocess = function (e) {
        if (r.recording) r.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      r.src.connect(r.node);
      r.node.connect(r.ctx.destination);
    });
    r.ready.catch(function () {
      r.ready = null;
    });
    return r.ready;
  };

  Recorder.prototype.start = function () {
    var r = this;
    return r.open().then(function () {
      return r.ctx.resume();
    }).then(function () {
      r.recording = true;
      return 1;
    }, function () {
      return 0;
    });
  };

  Recorder.prototype.samples = function () {
    var n = 0, i, out;
    this.chunks.forEach(function (c) { n += c.length; });
    out = new Float32Array(n);
    n = 0;
    for (i = 0; i < this.chunks.length; i++) {
      out.set(this.chunks[i], n);
      n += this.chunks[i].length;
    }
    return out;
  };

  Recorder.prototype.wav = function (src, srcRate) {
    var ratio = srcRate / this.rate, len = Math.floor(src.length / ratio), bytes = this.bits / 8;
    var buf = new DataView(new ArrayBuffer(44 + len * bytes));
    function str(o, t) {
      for (var i = 0; i < t.length; i++) buf.setUint8(o + i, t.charCodeAt(i));
    }
    str(0, "RIFF");
    buf.setUint32(4, 36 + len * bytes, true);
    str(8, "WAVE");
    str(12, "fmt ");
    buf.setUint32(16, 16, true);
    buf.setUint16(20, 1, true);
    buf.setUint16(22, 1, true);
    buf.setUint32(24, this.rate, true);
    buf.setUint32(28, this.rate * bytes, true);
    buf.setUint16(32, bytes, true);
    buf.setUint16(34, this.bits, true);
    str(36, "data");
    buf.setUint32(40, len * bytes, true);
    for (var i = 0; i < len; i++) {
      var a = Math.floor(i * ratio), b = Math.min(src.length, Math.floor((i + 1) * ratio)), sum = 0;
      for (var j = a; j < b; j++) sum += src[j];
      var v = Math.max(-1, Math.min(1, b > a ? sum / (b - a) : 0));
      if (bytes === 2) buf.setInt16(44 + i * 2, v < 0 ? v * 32768 : v * 32767, true);
      else buf.setUint8(44 + i, Math.round(v * 127) + 128);
    }
    return new Int8Array(buf.buffer);
  };

  Recorder.prototype.finish = function () {
    var r = this;
    r.recording = false;
    if (!r.ctx) return Promise.resolve(1);
    var src = r.samples(), rate = r.ctx.sampleRate;
    if (!r.amr) {
      r.data = r.wav(src, rate);
      return Promise.resolve(1);
    }
    return new BenzAMRRecorder().encodeAMRAsync(src, rate).then(function (amr) {
      var head = "#!AMR\n", raw = new Uint8Array(amr.buffer || amr);
      var has = String.fromCharCode.apply(null, raw.subarray(0, 6)) === head;
      var out = new Int8Array(raw.length + (has ? 0 : 6));
      if (!has) for (var i = 0; i < 6; i++) out[i] = head.charCodeAt(i);
      out.set(new Int8Array(raw.buffer, raw.byteOffset, raw.length), has ? 0 : 6);
      r.data = out;
      return 1;
    }, function () {
      return 0;
    });
  };

  Recorder.prototype.pause = Recorder.prototype.finish;
  Recorder.prototype.stop = Recorder.prototype.finish;

  Recorder.prototype.reset = function () {
    this.recording = false;
    this.chunks = [];
    this.data = new Int8Array(0);
  };

  Recorder.prototype.close = function () {
    var r = this;
    return (r.recording ? r.finish() : Promise.resolve(1)).then(function (res) {
      if (r.stream) r.stream.getTracks().forEach(function (t) { t.stop(); });
      if (r.node) {
        r.node.onaudioprocess = null;
        r.src.disconnect();
        r.node.disconnect();
      }
      r.stream = r.ctx = r.ready = r.src = r.node = null;
      r.chunks = [];
      return res;
    });
  };

  ["start", "pause", "resume"].forEach(function (m) {
    var f = P[m];
    P[m] = function () {
      if (this.mediaFormat === "capture") return;
      return f.apply(this, arguments);
    };
  });

  var closeBase = P.close;
  P.close = function () {
    if (this.mediaFormat !== "capture") return closeBase.call(this);
    if (this.audioRecorder) this.audioRecorder.close();
  };

  var realizeBase = P.realize;
  P.realize = function (contentType) {
    if (this.mediaFormat !== "capture") return realizeBase.call(this, contentType);
    this.audioRecorder = new Recorder(this.url);
    this.contentType = this.audioRecorder.getContentType();
    this.player = { isVideoControlSupported: false, isVolumeControlSupported: false };
    return Promise.resolve(1);
  };

  var initBase = Native["com/sun/mmedia/PlayerImpl.nInit.(IILjava/lang/String;)I"];
  Native["com/sun/mmedia/PlayerImpl.nInit.(IILjava/lang/String;)I"] = function () {
    var id = initBase.apply(this, arguments);
    var p = Media.PlayerCache[id];
    if (p.isAudioCapture()) p.mediaFormat = "capture";
    return id;
  };

  var R = "com/sun/mmedia/DirectRecord.";
  Native[R + "nGetRecordedData.(III[B)I"] = function (addr, handle, offset, size, bufferAddr) {
    var data = Media.PlayerCache[handle].audioRecorder.data;
    J2ME.getArrayFromAddr(bufferAddr).set(data.subarray(offset, offset + size));
    return 1;
  };
  Native[R + "nClose.(I)I"] = function (addr, handle) {
    var p = Media.PlayerCache[handle];
    if (p && p.audioRecorder) p.audioRecorder.close();
    return 1;
  };
  Native[R + "nReset.(I)I"] = function (addr, handle) {
    Media.PlayerCache[handle].audioRecorder.reset();
    return 1;
  };
  Native[R + "nSetSizeLimit.(II)I"] = function (addr, handle, size) {
    return size;
  };
  Native[R + "finalize.()V"] = function () {};
  Native["com/sun/mmedia/DirectPlayer.nIsMIDIControlSupported.(I)Z"] = function (addr, handle) {
    var p = Media.PlayerCache[handle];
    return p && p.mediaFormat === "capture" ? 0 : 1;
  };

  var BaseSynth = window.WebAudioTinySynth;
  var synthPool = [];
  if (BaseSynth) {
    window.WebAudioTinySynth = function () {
      return synthPool.pop() || new BaseSynth();
    };
    window.WebAudioTinySynth.prototype = BaseSynth.prototype;
  }

  function midiSeconds(song, tick) {
    var sec = 0, last = 0, tempo = 120, perTick = 60 / tempo / (song.timebase / 4);
    for (var i = 0; i < song.ev.length && song.ev[i].t < tick; i++) {
      var e = song.ev[i];
      if (e.m[0] !== 65361) continue;
      sec += (e.t - last) * perTick;
      last = e.t;
      perTick = 60 / e.m[1] / (song.timebase / 4);
    }
    return sec + (tick - last) * perTick;
  }

  function midiTick(song, seconds) {
    var sec = 0, last = 0, perTick = 60 / 120 / (song.timebase / 4);
    for (var i = 0; i < song.ev.length; i++) {
      var e = song.ev[i];
      if (e.m[0] !== 65361) continue;
      var span = (e.t - last) * perTick;
      if (sec + span > seconds) break;
      sec += span;
      last = e.t;
      perTick = 60 / e.m[1] / (song.timebase / 4);
    }
    return Math.round(last + (seconds - sec) / perTick);
  }

  function midi(p) {
    return p.tinysynth && p.tinysynth.song && p.getMediaFormat() === "mid" ? p.tinysynth : null;
  }

  function midiDuration(p, ts) {
    if (ts.song.dur == null) ts.song.dur = midiSeconds(ts.song, ts.maxTick);
    return ts.song.dur;
  }

  function midiNow(p, ts) {
    var pos = p.midiPos || 0;
    if (p.midiStart != null) pos += Math.max(0, heard(ts.actx) - p.midiStart);
    return Math.min(pos, midiDuration(p, ts));
  }

  function midiWatch(p, ts) {
    clearTimeout(p.midiTimer);
    if (p.midiStart == null || ts.loop) return;
    var left = midiDuration(p, ts) - midiNow(p, ts);
    p.midiTimer = setTimeout(function () {
      if (p.midiStart == null || midi(p) !== ts) return;
      if (ts.playing) return midiWatch(p, ts);
      p.midiPos = midiDuration(p, ts);
      p.midiStart = null;
      MIDP.sendEndOfMediaEvent(p.pId, p.midiPos * 1000 | 0);
    }, Math.max(50, left * 1000 + 50));
  }

  function midiPlay(p, ts) {
    if (ts.playTick >= ts.maxTick) {
      ts.locateMIDI(0);
      p.midiPos = 0;
    }
    midiVol(p, ts);
    var t0 = ts.actx.currentTime;
    ts.playMIDI();
    p.midiStart = t0 + 0.1;
    midiWatch(p, ts);
  }

  ["start", "resume"].forEach(function (m) {
    var f = P[m];
    P[m] = function () {
      var ts = midi(this);
      if (!ts) return f.apply(this, arguments);
      midiPlay(this, ts);
    };
  });

  function midiVol(p, ts) {
    var v = p.volume === undefined ? 100 : p.volume;
    ts.setMasterVol(p.muted ? 0 : v / 200);
  }

  var volMidi = P.getVolume;
  P.getVolume = function () {
    if (this.getMediaFormat() !== "mid") return volMidi.apply(this, arguments);
    return this.volume === undefined ? 100 : this.volume;
  };

  var setVolMidi = P.setVolume;
  P.setVolume = function (level) {
    if (this.getMediaFormat() !== "mid") return setVolMidi.apply(this, arguments);
    this.volume = Math.max(0, Math.min(100, level));
    if (this.tinysynth) midiVol(this, this.tinysynth);
  };

  var muteMidi = P.getMute;
  P.getMute = function () {
    if (this.getMediaFormat() !== "mid") return muteMidi.apply(this, arguments);
    return !!this.muted;
  };

  var setMuteMidi = P.setMute;
  P.setMute = function (mute) {
    if (this.getMediaFormat() !== "mid") return setMuteMidi.apply(this, arguments);
    this.muted = !!mute;
    if (this.tinysynth) midiVol(this, this.tinysynth);
  };

  var pauseMidi = P.pause;
  P.pause = function () {
    var ts = midi(this);
    if (!ts) return pauseMidi.apply(this, arguments);
    if (this.midiStart != null) {
      this.midiPos = midiNow(this, ts);
      this.midiStart = null;
    }
    clearTimeout(this.midiTimer);
    ts.stopMIDI();
    ts.locateMIDI(midiTick(ts.song, this.midiPos));
  };

  var timeMidi = P.getMediaTime;
  P.getMediaTime = function () {
    var ts = midi(this);
    return ts ? midiNow(this, ts) * 1e6 | 0 : timeMidi.apply(this, arguments);
  };

  var seekMidi = P.setMediaTime;
  P.setMediaTime = function (us) {
    var ts = midi(this);
    if (!ts) return seekMidi.apply(this, arguments);
    var sec = Math.max(0, Math.min(us / 1e6, midiDuration(this, ts)));
    var playing = this.midiStart != null;
    ts.locateMIDI(midiTick(ts.song, sec));
    this.midiPos = sec;
    this.midiStart = null;
    if (playing) midiPlay(this, ts);
    return sec * 1e6 | 0;
  };

  var durationMidi = P.getDuration;
  P.getDuration = function () {
    var ts = midi(this);
    return ts ? midiDuration(this, ts) * 1e6 | 0 : durationMidi.apply(this, arguments);
  };

  var closeMidi = P.close;
  P.close = function () {
    var ts = this.tinysynth;
    clearTimeout(this.midiTimer);
    this.midiStart = null;
    var r = closeMidi.apply(this, arguments);
    if (ts && synthPool.indexOf(ts) < 0) {
      ts.stopMIDI();
      ts.setLoop(0);
      ts.song = null;
      this.tinysynth = null;
      synthPool.push(ts);
    }
    return r;
  };

  var loopBase = Native["com/sun/mmedia/DirectMIDI.nSetLoopCount.(II)V"];
  Native["com/sun/mmedia/DirectMIDI.nSetLoopCount.(II)V"] = function (addr, handle, count) {
    var p = Media.PlayerCache[handle];
    if (p && (sampled(p) || p.getMediaFormat() === "mid")) {
      if (p.tinysynth) p.tinysynth.setLoop(0);
      return;
    }
    return loopBase.apply(this, arguments);
  };

  var M = "com/sun/mmedia/MediaDownload.";
  var buffering = Native[M + "nBuffering.(I[BII)I"];

  Native[M + "nBuffering.(I[BII)I"] = function (addr, handle, bufferAddr, offset, size) {
    var p = Media.PlayerCache[handle];
    if (p && (bufferAddr === J2ME.Constants.NULL || size === 0)) {
      var wait = p.finish();
      if (!wait) return 0;
      asyncImpl("I", wait);
      return;
    }
    return buffering.apply(this, arguments);
  };

  Native[M + "nNeedMoreDataImmediatelly.(I)Z"] = function (addr, handle) {
    var p = Media.PlayerCache[handle];
    return p && !p.eof && p.contentSize && sampled(p) ? 1 : 0;
  };
})();
