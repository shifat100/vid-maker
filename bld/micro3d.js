(function () {
  if (typeof Native === "undefined") {
    return;
  }

  var SHADERS = {
"shaders/color.fsh": "precision mediump float;\nuniform sampler2D uSphereUnit;\nuniform vec2 uSphereSize;\nuniform vec3 uLightDir;\nuniform float uDirIntensity;\nuniform float uToonThreshold;\nuniform float uToonHigh;\nuniform float uToonLow;\nvarying vec3 vColor;\nvarying vec3 vNormal;\nvarying float vIsReflect;\nvarying float vAmbIntensity;\n\nvoid main() {\n    if (vAmbIntensity < -0.5) {\n        gl_FragColor = vec4(vColor, 1.0);\n        return;\n    }\n    vec4 spec = uSphereSize.x < -0.5 || vIsReflect < 0.5 ?\n        vec4(0.0) : texture2D(uSphereUnit, (normalize(vNormal).xy + 1.0) * 0.5 * uSphereSize);\n    float lambert_factor = max(dot(normalize(vNormal), uLightDir), 0.0);\n    float light = min(vAmbIntensity + uDirIntensity * lambert_factor, 1.0);\n    if (uToonThreshold > -0.5) {\n        light = light < uToonThreshold ? uToonLow : uToonHigh;\n    }\n    gl_FragColor = vec4(vColor * light + spec.rgb, 1.0);\n}",
"shaders/color.vsh": "uniform mat4 uMatrix;\nuniform mat4 uMatrixMV;\nuniform vec3 uColor;\nuniform float uAmbIntensity;\nuniform bool uIsPrimitive;\nattribute vec4 aPosition;\nattribute vec3 aNormal;\nattribute vec3 aColorData;\nattribute vec2 aMaterial;\nvarying vec3 vColor;\nvarying vec3 vNormal;\nvarying float vIsReflect;\nvarying float vAmbIntensity;\n\nconst float COLOR_UNIT = 1.0 / 255.0;\nvoid main() {\n    gl_Position = uMatrix * aPosition;\n    vNormal = mat3(uMatrixMV[0].xyz, uMatrixMV[1].xyz, uMatrixMV[2].xyz) * aNormal;\n    if (uIsPrimitive) {\n        vColor = uColor.r < -0.5 ? vec3(aColorData * COLOR_UNIT) : uColor;\n        vIsReflect = 1.0;\n        vAmbIntensity = uAmbIntensity;\n    } else {\n        vColor = vec3(aColorData * COLOR_UNIT);\n        vIsReflect = aMaterial[1];\n        vAmbIntensity = aMaterial[0] > 0.5 ? uAmbIntensity : -1.0;\n    }\n}",
"shaders/simple.fsh": "precision mediump float;\nuniform sampler2D sampler0;\nvarying vec2 v_texcoord0;\nvoid main() {\n    gl_FragColor = texture2D(sampler0, v_texcoord0);\n}",
"shaders/simple.vsh": "attribute vec4 a_position;\nattribute vec2 a_texcoord0;\nvarying vec2 v_texcoord0;\nvoid main() {\n    gl_Position = a_position;\n    v_texcoord0 = a_texcoord0;\n}",
"shaders/sprite.fsh": "precision mediump float;\nuniform vec2 uTexSize;\nuniform sampler2D uTexUnit;\nuniform vec3 uColorKey;\nuniform bool uIsTransparency;\nvarying vec2 vTexture;\n\nconst vec3 COLORKEY_ERROR = vec3(0.5 / 255.0);\n\nvoid main() {\n#ifdef FILTER\n    vec4 color = texture2D(uTexUnit, vTexture / uTexSize);\n#else\n    vec4 color = texture2D(uTexUnit, (floor(vTexture) + 0.5) / uTexSize);\n#endif\n    if (uIsTransparency && all(lessThan(abs(color.rgb - uColorKey), COLORKEY_ERROR)))\n            discard;\n    gl_FragColor = vec4(color.rgb, 1.0);\n}",
"shaders/sprite.vsh": "attribute vec4 aPosition;\nattribute vec2 aColorData;\nvarying vec2 vTexture;\n\nvoid main() {\n    gl_Position = aPosition;\n#ifdef FILTER\n    vTexture = aColorData + 0.5;\n#else\n    vTexture = aColorData;\n#endif\n}",
"shaders/tex.fsh": "precision mediump float;\nuniform sampler2D uTextureUnit;\nuniform sampler2D uSphereUnit;\nuniform vec2 uTexSize;\nuniform vec3 uColorKey;\nuniform vec2 uSphereSize;\nuniform vec3 uLightDir;\nuniform float uDirIntensity;\nuniform float uToonThreshold;\nuniform float uToonHigh;\nuniform float uToonLow;\nvarying vec2 vTexture;\nvarying vec3 vNormal;\nvarying float vIsTransparency;\nvarying float vIsReflect;\nvarying float vAmbIntensity;\n\nconst vec3 COLORKEY_ERROR = vec3(0.5 / 255.0);\n\nvoid main() {\n#ifdef FILTER\n    vec4 color = texture2D(uTextureUnit, vTexture / uTexSize);\n#else\n    vec4 color = texture2D(uTextureUnit, (floor(vTexture) + 0.5) / uTexSize);\n#endif\n    if (vIsTransparency > 0.5 && all(lessThan(abs(color.rgb - uColorKey), COLORKEY_ERROR)))\n            discard;\n    if (vAmbIntensity < -0.5) {\n        gl_FragColor = vec4(color.rgb, 1.0);\n        return;\n    }\n    vec4 spec = uSphereSize.x < -0.5 || vIsReflect < 0.5 ?\n        vec4(0.0) : texture2D(uSphereUnit, (normalize(vNormal).xy + 1.0) * 0.5 * uSphereSize);\n    float lambert_factor = max(dot(normalize(vNormal), uLightDir), 0.0);\n    float light = min(vAmbIntensity + uDirIntensity * lambert_factor, 1.0);\n    if (uToonThreshold > -0.5) {\n        light = light < uToonThreshold ? uToonLow : uToonHigh;\n    }\n    gl_FragColor = vec4(color.rgb * light + spec.rgb, 1.0);\n}",
"shaders/tex.vsh": "uniform mat4 uMatrix;\nuniform mat4 uMatrixMV;\nuniform bool uIsTransparency;\nuniform bool uIsPrimitive;\nuniform float uAmbIntensity;\nattribute vec4 aPosition;\nattribute vec3 aNormal;\nattribute vec2 aColorData;\nattribute vec3 aMaterial;\nvarying vec2 vTexture;\nvarying vec3 vNormal;\nvarying float vIsTransparency;\nvarying float vIsReflect;\nvarying float vAmbIntensity;\n\nvoid main() {\n    gl_Position = uMatrix * aPosition;\n    vNormal = mat3(uMatrixMV[0].xyz, uMatrixMV[1].xyz, uMatrixMV[2].xyz) * aNormal;\n    if (uIsPrimitive) {\n        vIsTransparency = uIsTransparency ? 1.0 : 0.0;\n        vIsReflect = 1.0;\n        vAmbIntensity = uAmbIntensity;\n    } else {\n        vIsTransparency = aMaterial[2];\n        vIsReflect = aMaterial[1];\n        vAmbIntensity = aMaterial[0] > 0.5 ? uAmbIntensity : -1.0;\n    }\n#ifdef FILTER\n    vTexture = aColorData + 0.5;\n#else\n    vTexture = aColorData;\n#endif\n}"
};
  var GL = "android/opengl/GLES20.";
  var canvas = document.createElement("canvas");
  var gl = null;
  var objects = [null];
  var images = [null];
  var attribs = [];
  var boundArray = null;

  function context() {
    if (!gl) {
      gl = canvas.getContext("webgl", { alpha: true, depth: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    }
    return gl;
  }

  function put(obj) {
    objects.push(obj);
    return objects.length - 1;
  }

  function fl(bits) {
    aliasedI32[0] = bits;
    return aliasedF32[0];
  }

  function str(addr) {
    return J2ME.fromStringAddr(addr);
  }

  function bytes(addr, offset, length) {
    var a = J2ME.getArrayFromAddr(addr);
    var start = a.byteOffset + (offset || 0);
    return new Uint8Array(a.buffer, start, length === undefined ? a.byteLength - (offset || 0) : length);
  }

  function attrib(i) {
    return attribs[i] || (attribs[i] = { enabled: false, client: null });
  }

  var TYPE_SIZE = { 5121: 1, 5126: 4 };

  function uploadClientAttribs(first, count) {
    var g = context();
    for (var i = 0; i < attribs.length; i++) {
      var a = attribs[i];
      if (!a || !a.enabled || !a.client) continue;
      var stride = a.stride || a.size * TYPE_SIZE[a.type];
      var need = (first + count - 1) * stride + a.size * TYPE_SIZE[a.type];
      var data = bytes(a.client, a.offset);
      if (!a.buffer) a.buffer = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, a.buffer);
      g.bufferData(g.ARRAY_BUFFER, data.subarray(0, Math.min(need, data.length)), g.STREAM_DRAW);
      g.vertexAttribPointer(i, a.size, a.type, a.normalized, a.stride, 0);
    }
    g.bindBuffer(g.ARRAY_BUFFER, boundArray);
  }

  function graphicsContext(addr) {
    return NativeMap.get(addr).getGraphicsContext();
  }

  function decodeBmp(d) {
    var v = new DataView(d.buffer, d.byteOffset, d.byteLength);
    if (d.length < 54 || d[0] !== 66 || d[1] !== 77) return null;
    var dataOff = v.getUint32(10, true), hdr = v.getUint32(14, true);
    var w = v.getInt32(18, true), h = v.getInt32(22, true), bpp = v.getUint16(28, true);
    var compression = v.getUint32(30, true);
    if (compression !== 0 || w <= 0 || h === 0) return null;
    var topDown = h < 0;
    h = Math.abs(h);
    var colors = v.getUint32(46, true) || (bpp <= 8 ? 1 << bpp : 0);
    var pal = 14 + hdr;
    var rowSize = ((w * bpp + 31) >> 5) << 2;
    var out = new Uint8Array(w * h * 4);
    for (var y = 0; y < h; y++) {
      var row = dataOff + (topDown ? y : h - 1 - y) * rowSize;
      for (var x = 0; x < w; x++) {
        var o = (y * w + x) * 4, idx, p;
        if (bpp === 24 || bpp === 32) {
          p = row + x * (bpp >> 3);
          out[o] = d[p + 2];
          out[o + 1] = d[p + 1];
          out[o + 2] = d[p];
        } else {
          if (bpp === 8) idx = d[row + x];
          else if (bpp === 4) idx = (d[row + (x >> 1)] >> ((x & 1) ? 0 : 4)) & 15;
          else if (bpp === 1) idx = (d[row + (x >> 3)] >> (7 - (x & 7))) & 1;
          else return null;
          if (idx >= colors) idx = 0;
          p = pal + idx * 4;
          out[o] = d[p + 2];
          out[o + 1] = d[p + 1];
          out[o + 2] = d[p];
        }
        out[o + 3] = 255;
      }
    }
    return { w: w, h: h, data: out };
  }

  Native["android/graphics/BitmapFactory.decode0.([BII)I"] = function (addr, dataAddr, offset, length) {
    var img = decodeBmp(bytes(dataAddr, offset, length));
    if (!img) return 0;
    images.push(img);
    return images.length - 1;
  };

  Native["android/graphics/BitmapFactory.size0.(IZ)I"] = function (addr, id, height) {
    var img = images[id];
    return img ? (height ? img.h : img.w) : 0;
  };

  Native["android/opengl/GLUtils.texImage0.(IILjava/lang/Object;)V"] = function (addr, target, image, graphics) {
    var g = context();
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false);
    if (graphics) {
      g.texImage2D(target, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, graphicsContext(graphics).canvas);
      return;
    }
    var img = images[image];
    g.texImage2D(target, 0, g.RGBA, img.w, img.h, 0, g.RGBA, g.UNSIGNED_BYTE, img.data);
  };

  var U = "com/mascotcapsule/micro3d/v3/Utils.";

  Native[U + "asset.(Ljava/lang/String;)Ljava/lang/String;"] = function (addr, nameAddr) {
    return J2ME.newString(SHADERS[str(nameAddr)] || "");
  };

  Native[U + "targetSize.(Ljavax/microedition/lcdui/Graphics;Z)I"] = function (addr, g, height) {
    var c = graphicsContext(g).canvas;
    return height ? c.height : c.width;
  };

  Native[U + "resize.(II)V"] = function (addr, w, h) {
    canvas.width = w;
    canvas.height = h;
    context();
  };

  Native[U + "clearGraphics.(Ljavax/microedition/lcdui/Graphics;)V"] = function (addr, g) {
    var ctx = graphicsContext(g);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  };

  Native[U + "readPixels0.(IIIILjava/lang/Object;)V"] = function (addr, x, y, w, h, g) {
    if (w <= 0 || h <= 0) return;
    context().flush();
    var ctx = graphicsContext(g);
    var H = canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalCompositeOperation = "copy";
    ctx.globalAlpha = 1;
    ctx.translate(0, H);
    ctx.scale(1, -1);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  };

  Native[U + "fill0.([FI[F[I)V"] = function (addr, bufAddr, offset, vertAddr, idxAddr) {
    var dst = J2ME.getArrayFromAddr(bufAddr), src = J2ME.getArrayFromAddr(vertAddr), idx = J2ME.getArrayFromAddr(idxAddr);
    var p = offset;
    for (var i = 0; i < idx.length; i++) {
      var s = idx[i] * 3;
      dst[p++] = src[s];
      dst[p++] = src[s + 1];
      dst[p++] = src[s + 2];
    }
  };

  Native[U + "transform0.([F[F[F[F[B[F)V"] = function (addr, svA, dvA, snA, dnA, bonesA, actA) {
    var sv = J2ME.getArrayFromAddr(svA), dv = J2ME.getArrayFromAddr(dvA);
    var sn = snA ? J2ME.getArrayFromAddr(snA) : null, dn = dnA ? J2ME.getArrayFromAddr(dnA) : null;
    var bb = J2ME.getArrayFromAddr(bonesA);
    var bv = new DataView(bb.buffer, bb.byteOffset, bb.byteLength);
    var act = actA ? J2ME.getArrayFromAddr(actA) : null;
    var nBones = (bb.length / 56) | 0, nAct = act ? (act.length / 12) | 0 : 0;
    var mats = new Float32Array(nBones * 12), m = new Float32Array(12), tmp = new Float32Array(12);
    function mul(out, oo, l, lo, r, ro) {
      for (var row = 0; row < 3; row++) {
        var a = l[lo + row * 4], b = l[lo + row * 4 + 1], c = l[lo + row * 4 + 2];
        for (var col = 0; col < 4; col++) {
          tmp[row * 4 + col] = a * r[ro + col] + b * r[ro + 4 + col] + c * r[ro + 8 + col] + (col === 3 ? l[lo + row * 4 + 3] : 0);
        }
      }
      for (var k = 0; k < 12; k++) out[oo + k] = tmp[k];
    }
    var vi = 0;
    for (var i = 0; i < nBones; i++) {
      var base = i * 56, len = bv.getInt32(base, true), parent = bv.getInt32(base + 4, true);
      for (var k = 0; k < 12; k++) m[k] = bv.getFloat32(base + 8 + k * 4, true);
      if (parent === -1) {
        for (k = 0; k < 12; k++) mats[i * 12 + k] = m[k];
      } else {
        mul(mats, i * 12, mats, parent * 12, m, 0);
      }
      if (i < nAct) mul(mats, i * 12, mats, i * 12, act, i * 12);
      var o = i * 12;
      for (var j = 0; j < len; j++, vi += 3) {
        var x = sv[vi], y = sv[vi + 1], z = sv[vi + 2];
        dv[vi] = x * mats[o] + y * mats[o + 1] + z * mats[o + 2] + mats[o + 3];
        dv[vi + 1] = x * mats[o + 4] + y * mats[o + 5] + z * mats[o + 6] + mats[o + 7];
        dv[vi + 2] = x * mats[o + 8] + y * mats[o + 9] + z * mats[o + 10] + mats[o + 11];
        if (sn) {
          x = sn[vi];
          y = sn[vi + 1];
          z = sn[vi + 2];
          var nx = x * mats[o] + y * mats[o + 1] + z * mats[o + 2];
          var ny = x * mats[o + 4] + y * mats[o + 5] + z * mats[o + 6];
          var nz = x * mats[o + 8] + y * mats[o + 9] + z * mats[o + 10];
          var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          dn[vi] = nx / l;
          dn[vi + 1] = ny / l;
          dn[vi + 2] = nz / l;
        }
      }
    }
  };

  function simple(name, fn) {
    Native[GL + name] = fn;
  }

  simple("glActiveTexture.(I)V", function (a, t) { context().activeTexture(t); });
  simple("glAttachShader.(II)V", function (a, p, s) { context().attachShader(objects[p], objects[s]); });
  simple("glBindBuffer.(II)V", function (a, t, b) {
    var g = context();
    if (t === g.ARRAY_BUFFER) boundArray = objects[b] || null;
    g.bindBuffer(t, objects[b] || null);
  });
  simple("glBindTexture.(II)V", function (a, t, x) { context().bindTexture(t, objects[x] || null); });
  simple("glBlendColor.(FFFF)V", function (a, r, g, b, al) { context().blendColor(fl(r), fl(g), fl(b), fl(al)); });
  simple("glBlendEquation.(I)V", function (a, m) { context().blendEquation(m); });
  simple("glBlendFunc.(II)V", function (a, s, d) { context().blendFunc(s, d); });
  simple("glBlendFuncSeparate.(IIII)V", function (a, sr, dr, sa, da) { context().blendFuncSeparate(sr, dr, sa, da); });
  simple("glClear.(I)V", function (a, m) { context().clear(m); });
  simple("glClearColor.(FFFF)V", function (a, r, g, b, al) { context().clearColor(fl(r), fl(g), fl(b), fl(al)); });
  simple("glCompileShader.(I)V", function (a, s) { context().compileShader(objects[s]); });
  simple("glCreateProgram.()I", function () { return put(context().createProgram()); });
  simple("glCreateShader.(I)I", function (a, t) { return put(context().createShader(t)); });
  simple("glDeleteProgram.(I)V", function (a, p) { context().deleteProgram(objects[p]); });
  simple("glDeleteShader.(I)V", function (a, s) { context().deleteShader(objects[s]); });
  simple("glDepthFunc.(I)V", function (a, f) { context().depthFunc(f); });
  simple("glDepthMask.(Z)V", function (a, f) { context().depthMask(!!f); });
  simple("glDetachShader.(II)V", function (a, p, s) { context().detachShader(objects[p], objects[s]); });
  simple("glDisable.(I)V", function (a, c) { context().disable(c); });
  simple("glDisableVertexAttribArray.(I)V", function (a, i) { attrib(i).enabled = false; context().disableVertexAttribArray(i); });
  simple("glDrawArrays.(III)V", function (a, mode, first, count) {
    if (count <= 0) return;
    uploadClientAttribs(first, count);
    context().drawArrays(mode, first, count);
  });
  simple("glEnable.(I)V", function (a, c) { context().enable(c); });
  simple("glEnableVertexAttribArray.(I)V", function (a, i) { attrib(i).enabled = true; context().enableVertexAttribArray(i); });
  simple("glFlush.()V", function () { context().flush(); });
  simple("glGetAttribLocation.(ILjava/lang/String;)I", function (a, p, n) { return context().getAttribLocation(objects[p], str(n)); });
  simple("glGetError.()I", function () { return config.glDebug ? context().getError() : 0; });
  simple("glGetProgramInfoLog.(I)Ljava/lang/String;", function (a, p) { return J2ME.newString(context().getProgramInfoLog(objects[p]) || ""); });
  simple("glGetShaderInfoLog.(I)Ljava/lang/String;", function (a, s) { return J2ME.newString(context().getShaderInfoLog(objects[s]) || ""); });
  simple("glGetUniformLocation.(ILjava/lang/String;)I", function (a, p, n) {
    var loc = context().getUniformLocation(objects[p], str(n));
    return loc ? put(loc) : -1;
  });
  simple("glIsTexture.(I)Z", function (a, t) { return objects[t] instanceof WebGLTexture ? 1 : 0; });
  simple("glLinkProgram.(I)V", function (a, p) { context().linkProgram(objects[p]); });
  simple("glReleaseShaderCompiler.()V", function () {});
  simple("glScissor.(IIII)V", function (a, x, y, w, h) { context().scissor(x, y, w, h); });
  simple("glShaderSource.(ILjava/lang/String;)V", function (a, s, src) { context().shaderSource(objects[s], str(src)); });
  simple("glTexParameteri.(III)V", function (a, t, n, p) { context().texParameteri(t, n, p); });
  simple("glUniform1f.(IF)V", function (a, l, x) { if (l > 0) context().uniform1f(objects[l], fl(x)); });
  simple("glUniform1i.(II)V", function (a, l, x) { if (l > 0) context().uniform1i(objects[l], x); });
  simple("glUniform2f.(IFF)V", function (a, l, x, y) { if (l > 0) context().uniform2f(objects[l], fl(x), fl(y)); });
  simple("glUniform3f.(IFFF)V", function (a, l, x, y, z) { if (l > 0) context().uniform3f(objects[l], fl(x), fl(y), fl(z)); });
  simple("glUseProgram.(I)V", function (a, p) { context().useProgram(objects[p] || null); });
  simple("glViewport.(IIII)V", function (a, x, y, w, h) { context().viewport(x, y, w, h); });

  simple("genObjects.(II[II)V", function (a, kind, n, idsAddr, off) {
    var g = context(), ids = J2ME.getArrayFromAddr(idsAddr);
    for (var i = 0; i < n; i++) ids[off + i] = put(kind === 0 ? g.createTexture() : g.createBuffer());
  });
  simple("deleteObjects.(II[II)V", function (a, kind, n, idsAddr, off) {
    var g = context(), ids = J2ME.getArrayFromAddr(idsAddr);
    for (var i = 0; i < n; i++) {
      var o = objects[ids[off + i]];
      if (!o) continue;
      if (kind === 0) g.deleteTexture(o);
      else g.deleteBuffer(o);
      objects[ids[off + i]] = null;
    }
  });
  simple("getParam.(III[II)V", function (a, kind, id, pname, pAddr, off) {
    var g = context(), p = J2ME.getArrayFromAddr(pAddr);
    var v = kind === 0 ? g.getShaderParameter(objects[id], pname) : g.getProgramParameter(objects[id], pname);
    p[off] = v === true ? 1 : v === false ? 0 : v | 0;
  });
  simple("bufferData0.(IILjava/lang/Object;II)V", function (a, target, size, dataAddr, off, usage) {
    var g = context();
    if (!dataAddr) g.bufferData(target, size, usage);
    else g.bufferData(target, bytes(dataAddr, off, size), usage);
  });
  simple("attribPointer0.(IIIZILjava/lang/Object;I)V", function (a, index, size, type, norm, stride, dataAddr, off) {
    var at = attrib(index);
    at.size = size;
    at.type = type;
    at.normalized = !!norm;
    at.stride = stride;
    at.offset = off;
    at.client = dataAddr || null;
    if (!dataAddr) context().vertexAttribPointer(index, size, type, !!norm, stride, off);
  });
  simple("uniformMatrix4fv0.(II[FI)V", function (a, l, count, vAddr, off) {
    if (l <= 0) return;
    var v = J2ME.getArrayFromAddr(vAddr);
    context().uniformMatrix4fv(objects[l], false, v.subarray(off, off + 16 * count));
  });
  simple("uniform3fv0.(II[FI)V", function (a, l, count, vAddr, off) {
    if (l <= 0) return;
    var v = J2ME.getArrayFromAddr(vAddr);
    context().uniform3fv(objects[l], v.subarray(off, off + 3 * count));
  });
})();
