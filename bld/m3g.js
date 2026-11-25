(function () {
  if (typeof Native === "undefined") {
    return;
  }

  var NATIVES = "AnimationController|_ctor|(I)I AnimationController|_setActiveInterval|(III)V AnimationController|_getActiveIntervalStart|(I)I AnimationController|_getActiveIntervalEnd|(I)I AnimationController|_setSpeed|(IFI)V AnimationController|_getSpeed|(I)F AnimationController|_setPosition|(IFI)V AnimationController|_getPosition|(II)F AnimationController|_setWeight|(IF)V AnimationController|_getWeight|(I)F AnimationController|_getRefWorldTime|(I)I AnimationTrack|_ctor|(III)I AnimationTrack|_getController|(I)I AnimationTrack|_getSequence|(I)I AnimationTrack|_getTargetProperty|(I)I AnimationTrack|_setController|(II)V Appearance|_ctor|(I)I Appearance|_getCompositingMode|(I)I Appearance|_getFog|(I)I Appearance|_getLayer|(I)I Appearance|_getMaterial|(I)I Appearance|_getPolygonMode|(I)I Appearance|_getTexture|(II)I Appearance|_setCompositingMode|(II)V Appearance|_setFog|(II)V Appearance|_setLayer|(II)V Appearance|_setMaterial|(II)V Appearance|_setPolygonMode|(II)V Appearance|_setTexture|(III)V Background|_ctor|(I)I Background|_setColor|(II)V Background|_getColor|(I)I Background|_setImage|(II)V Background|_getImage|(I)I Background|_setImageMode|(III)V Background|_getImageMode|(II)I Background|_enable|(IIZ)V Background|_isEnabled|(II)Z Background|_setCrop|(IIIII)V Background|_getCrop|(II)I Camera|_ctor|(I)I Camera|_setParallel|(IFFFF)V Camera|_setPerspective|(IFFFF)V Camera|_setGeneric|(I[B)V Camera|_getProjectionAsTransform|(I[B)I Camera|_getProjectionAsParams|(I[F)I CompositingMode|_ctor|(I)I CompositingMode|_setBlending|(II)V CompositingMode|_getBlending|(I)I CompositingMode|_setAlphaThreshold|(IF)V CompositingMode|_getAlphaThreshold|(I)F CompositingMode|_setAlphaWriteEnable|(IZ)V CompositingMode|_isAlphaWriteEnabled|(I)Z CompositingMode|_enableDepthTest|(IZ)V CompositingMode|_isDepthTestEnabled|(I)Z CompositingMode|_enableDepthWrite|(IZ)V CompositingMode|_isDepthWriteEnabled|(I)Z CompositingMode|_enableColorWrite|(IZ)V CompositingMode|_isColorWriteEnabled|(I)Z CompositingMode|_setDepthOffset|(IFF)V CompositingMode|_getDepthOffsetFactor|(I)F CompositingMode|_getDepthOffsetUnits|(I)F Fog|_ctor|(I)I Fog|_setMode|(II)V Fog|_getMode|(I)I Fog|_setLinear|(IFF)V Fog|_getDistance|(II)F Fog|_setDensity|(IF)V Fog|_getDensity|(I)F Fog|_setColor|(II)V Fog|_getColor|(I)I Graphics3D|_ctor|(I)I Graphics3D|_addRef|(I)V Graphics3D|_addLight|(II[B)I Graphics3D|_bindGraphics|(ILjavax/microedition/lcdui/Graphics;ZI)V Graphics3D|_bindImage|(IIZI)V Graphics3D|_releaseGraphics|(I)V Graphics3D|_releaseImage|(I)V Graphics3D|_resetLights|(I)V Graphics3D|_clear|(II)V Graphics3D|_render|(IIII[BI)V Graphics3D|_renderNode|(II[B)V Graphics3D|_renderWorld|(II)V Graphics3D|_setCamera|(II[B)V Graphics3D|_setViewport|(IIIII)V Graphics3D|_setLight|(III[B)V Graphics3D|_setDepthRange|(IFF)V Graphics3D|_getViewTransform|(I[B)V Graphics3D|_getCamera|(I)I Graphics3D|_getLightTransform|(II[B)I Graphics3D|_getLightCount|(I)I Graphics3D|_getDepthRangeNear|(I)F Graphics3D|_getDepthRangeFar|(I)F Graphics3D|_getViewportX|(I)I Graphics3D|_getViewportY|(I)I Graphics3D|_getViewportWidth|(I)I Graphics3D|_getViewportHeight|(I)I Graphics3D|_isAASupported|(I)Z Graphics3D|_isProperRenderer|()Z Group|_ctor|(I)I Group|_addChild|(II)V Group|_removeChild|(II)V Group|_getChildCount|(I)I Group|_getChild|(II)I Group|_pick3D|(II[F[F)I Group|_pick2D|(IIFFI[F)I Image2D|_ctorSizePixels|(IIII[B)I Image2D|_ctorSizePixelsPalette|(IIII[B[B)I Image2D|_ctorRGB|(IIII[IZ)I Image2D|_ctorSize|(IIII)I Image2D|_set|(IIIII[B)V Image2D|_isMutable|(I)Z Image2D|_getFormat|(I)I Image2D|_getWidth|(I)I Image2D|_getHeight|(I)I Interface|_ctor|()I Interface|_getClassID|(I)I KeyframeSequence|_ctor|(IIII)I KeyframeSequence|_setValidRange|(III)V KeyframeSequence|_setKeyframe|(III[F)V KeyframeSequence|_setDuration|(II)V KeyframeSequence|_getDuration|(I)I KeyframeSequence|_setRepeatMode|(II)V KeyframeSequence|_getRepeatMode|(I)I KeyframeSequence|_getComponentCount|(I)I KeyframeSequence|_getInterpolationType|(I)I KeyframeSequence|_getKeyframe|(II[F)I KeyframeSequence|_getKeyframeCount|(I)I KeyframeSequence|_getValidRangeFirst|(I)I KeyframeSequence|_getValidRangeLast|(I)I Light|_ctor|(I)I Light|_setIntensity|(IF)V Light|_getIntensity|(I)F Light|_setColor|(II)V Light|_getColor|(I)I Light|_setMode|(II)V Light|_getMode|(I)I Light|_setSpotAngle|(IF)V Light|_getSpotAngle|(I)F Light|_setSpotExponent|(IF)V Light|_getSpotExponent|(I)F Light|_setAttenuation|(IFFF)V Light|_getAttenuation|(II)F Loader|_inflate|([B[B)Z Loader|_ctor|(I)I Loader|_decodeData|(II[B)I Loader|_setExternalReferences|(I[I)V Loader|_getLoadedObjects|(I[I)I Loader|_getObjectsWithUserParameters|(I[I)I Loader|_getNumUserParameters|(II)I Loader|_getUserParameter|(III[B)I Material|_ctor|(I)I Material|_setColor|(III)V Material|_getColor|(II)I Material|_setShininess|(IF)V Material|_getShininess|(I)F Material|_setVertexColorTrackingEnable|(IZ)V Material|_isVertexColorTrackingEnabled|(I)Z Mesh|_ctor|(II[I[I)I Mesh|_setAppearance|(III)V Mesh|_getAppearance|(II)I Mesh|_getIndexBuffer|(II)I Mesh|_getVertexBuffer|(I)I Mesh|_getSubmeshCount|(I)I MorphingMesh|_ctor|(II[I[I[I)I MorphingMesh|_setWeights|(I[F)V MorphingMesh|_getWeights|(I[F)V MorphingMesh|_getMorphTarget|(II)I MorphingMesh|_getMorphTargetCount|(I)I Node|_getTransformTo|(II[B)Z Node|_align|(II)V Node|_setAlignment|(IIIII)V Node|_setAlphaFactor|(IF)V Node|_getAlphaFactor|(I)F Node|_enable|(IIZ)V Node|_isEnabled|(II)Z Node|_setScope|(II)V Node|_getScope|(I)I Node|_getParent|(I)I Node|_getZRef|(I)I Node|_getYRef|(I)I Node|_getSubtreeSize|(I)I Node|_getAlignmentTarget|(II)I Object3D|_addAnimationTrack|(II)I Object3D|_removeAnimationTrack|(II)V Object3D|_getAnimationTrackCount|(I)I Object3D|_animate|(II)I Object3D|_setUserID|(II)V Object3D|_getUserID|(I)I Object3D|_addRef|(I)V Object3D|_getAnimationTrack|(II)I Object3D|_duplicate|(I[I)I Object3D|_getReferences|(I[I)I Object3D|_find|(II)I Platform|registerFinalizer|(Ljava/lang/Object;I)V Platform|finalizeInterface|(I)V Platform|_finalizeObject|(I)V PolygonMode|_ctor|(I)I PolygonMode|_setLocalCameraLightingEnable|(IZ)V PolygonMode|_setPerspectiveCorrectionEnable|(IZ)V PolygonMode|_setCulling|(II)V PolygonMode|_getCulling|(I)I PolygonMode|_setWinding|(II)V PolygonMode|_getWinding|(I)I PolygonMode|_setShading|(II)V PolygonMode|_getShading|(I)I PolygonMode|_setTwoSidedLightingEnable|(IZ)V PolygonMode|_isTwoSidedLightingEnabled|(I)Z PolygonMode|_isLocalCameraLightingEnabled|(I)Z PolygonMode|_isPerspectiveCorrectionEnabled|(I)Z SkinnedMesh|_ctor|(II[I[II)I SkinnedMesh|_addTransform|(IIIII)V SkinnedMesh|_getSkeleton|(I)I SkinnedMesh|_getBoneTransform|(II[B)V SkinnedMesh|_getBoneVertices|(II[I[F)I Sprite3D|_ctor|(IZII)I Sprite3D|_isScaled|(I)Z Sprite3D|_setAppearance|(II)V Sprite3D|_setImage|(II)V Sprite3D|_setCrop|(IIIII)V Sprite3D|_getCrop|(II)I Sprite3D|_getAppearance|(I)I Sprite3D|_getImage|(I)I Texture2D|_ctor|(II)I Texture2D|_setImage|(II)V Texture2D|_getImage|(I)I Texture2D|_setFiltering|(III)V Texture2D|_setWrapping|(III)V Texture2D|_getWrappingS|(I)I Texture2D|_getWrappingT|(I)I Texture2D|_setBlending|(II)V Texture2D|_getBlending|(I)I Texture2D|_setBlendColor|(II)V Texture2D|_getBlendColor|(I)I Texture2D|_getImageFilter|(I)I Texture2D|_getLevelFilter|(I)I Transform|_mul|([B[B[B)V Transform|_setIdentity|([B)V Transform|_setMatrix|([B[F)V Transform|_getMatrix|([B[F)V Transform|_invert|([B)V Transform|_transpose|([B)V Transform|_rotate|([BFFFF)V Transform|_rotateQuat|([BFFFF)V Transform|_scale|([BFFF)V Transform|_translate|([BFFF)V Transform|_transformTable|([B[F)V Transform|_transformArray|([BI[FZ)V Transformable|_setOrientation|(IFFFFZ)V Transformable|_preRotate|(IFFFF)V Transformable|_getOrientation|(I[F)V Transformable|_setScale|(IFFFZ)V Transformable|_getScale|(I[F)V Transformable|_setTranslation|(IFFFZ)V Transformable|_getTranslation|(I[F)V Transformable|_setTransform|(I[B)V Transformable|_getTransform|(I[B)V Transformable|_getComposite|(I[B)V TriangleStripArray|_createImplicit|(II[I)I TriangleStripArray|_createExplicit|(I[I[I)I TriangleStripArray|_getIndexCount|(I)I TriangleStripArray|_getIndices|(I[I)V VertexArray|_ctor|(IIII)I VertexArray|_setByte|(III[B)V VertexArray|_setShort|(III[S)V VertexArray|_getByte|(III[B)V VertexArray|_getShort|(III[S)V VertexArray|_getComponentCount|(I)I VertexArray|_getComponentType|(I)I VertexArray|_getVertexCount|(I)I VertexBuffer|_ctor|(I)I VertexBuffer|_setColors|(II)V VertexBuffer|_setNormals|(II)V VertexBuffer|_setTexCoords|(IIIF[F)V VertexBuffer|_setVertices|(IIF[F)V VertexBuffer|_setDefaultColor|(II)V VertexBuffer|_getDefaultColor|(I)I VertexBuffer|_getArray|(II[F)I VertexBuffer|_getVertexCount|(I)I World|_ctor|(I)I World|_setActiveCamera|(II)V World|_setBackground|(II)V World|_getActiveCamera|(I)I World|_getBackground|(I)I";

  var PKG = "javax/microedition/m3g/";
  var ENV = 8;
  var X = null, memBuf = null, u8 = null, i32 = null, f32 = null;
  var pendingEx = null;
  var fbits = new Float32Array(1), ibits = new Int32Array(fbits.buffer);

  function mem() {
    if (memBuf !== X.memory.buffer) {
      memBuf = X.memory.buffer;
      u8 = new Uint8Array(memBuf);
      i32 = new Int32Array(memBuf);
      f32 = new Float32Array(memBuf);
    }
  }

  function cstr(p) {
    mem();
    var s = "";
    while (u8[p]) s += String.fromCharCode(u8[p++]);
    return s;
  }

  function newCStr(s) {
    var p = X.malloc(s.length + 1);
    mem();
    for (var i = 0; i < s.length; i++) u8[p + i] = s.charCodeAt(i);
    u8[p + s.length] = 0;
    return p;
  }

  function javaBytes(addr) {
    var a = J2ME.getArrayFromAddr(addr);
    return new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  }

  function toFloat(bits) {
    ibits[0] = bits;
    return fbits[0];
  }

  function toBits(f) {
    fbits[0] = f;
    return ibits[0];
  }

  function check() {
    if (pendingEx) {
      var name = pendingEx;
      pendingEx = null;
      throw $.ctx.createException(name);
    }
  }

  var jni = {
    jni_get: function (arr, es) {
      var b = javaBytes(arr);
      var p = X.malloc(b.length || 1);
      mem();
      u8.set(b, p);
      return p;
    },
    jni_release: function (arr, p, mode) {
      if (mode !== 2) {
        mem();
        var b = javaBytes(arr);
        b.set(u8.subarray(p, p + b.length));
      }
      if (mode !== 1) {
        X.free(p);
      }
    },
    jni_len: function (arr) {
      return J2ME.getArrayFromAddr(arr).length;
    },
    jni_region: function (arr, start, len, buf, es) {
      mem();
      u8.set(javaBytes(arr).subarray(start * es, (start + len) * es), buf);
    },
    jni_throw: function (p) {
      if (!pendingEx) pendingEx = cstr(p);
    }
  };

  function wrap(fn, desc) {
    var params = desc.substring(1, desc.indexOf(")"));
    var ret = desc.charAt(desc.length - 1);
    var floats = [];
    var i = 0, n = 0;
    while (i < params.length) {
      var c = params.charAt(i);
      if (c === "F") floats.push(n);
      if (c === "[") {
        while (params.charAt(i) === "[") i++;
        c = params.charAt(i);
      }
      if (c === "L") i = params.indexOf(";", i);
      i++;
      n++;
    }
    var fret = ret === "F";
    return function () {
      var args = [ENV];
      for (var k = 0; k < arguments.length; k++) args.push(arguments[k]);
      for (k = 0; k < floats.length; k++) args[floats[k] + 2] = toFloat(args[floats[k] + 2]);
      var r = fn.apply(null, args);
      check();
      return fret ? toBits(r) : r;
    };
  }

  function exportName(cls, m) {
    return "Java_javax_microedition_m3g_" + cls.replace(/_/g, "_1") + "_" + m.replace(/_/g, "_1");
  }

  function installNatives() {
    NATIVES.split(" ").forEach(function (e) {
      if (!e) return;
      var p = e.split("|");
      var fn = X[exportName(p[0], p[1])];
      if (fn) Native[PKG + p[0] + "." + p[1] + "." + p[2]] = wrap(fn, p[2]);
    });

    var bind = X.Java_javax_microedition_m3g_Graphics3D__1bindGraphics;
    Native[PKG + "Graphics3D._bindGraphics.(ILjavax/microedition/lcdui/Graphics;ZI)V"] = function (addr, h, g, depth, hints) {
      var gi = NativeMap.get(g);
      var c = gi.contextInfo.context.canvas;
      target = gi.contextInfo;
      bind(ENV, 0, h, c.width, c.height, gi.clipX1, gi.clipY1, gi.clipX2 - gi.clipX1, gi.clipY2 - gi.clipY1, depth, hints);
      check();
    };

    Native[PKG + "Platform.registerFinalizer.(Ljava/lang/Object;I)V"] = function (addr, obj, h) {
      J2ME.setNative(obj, { m3gHandle: h });
    };

    var finalizeObject = X.Java_javax_microedition_m3g_Platform__1finalizeObject;
    var onFinalize = J2ME.onFinalize;
    J2ME.onFinalize = function (a) {
      var o = NativeMap.get(a);
      if (o && o.m3gHandle) {
        finalizeObject(ENV, 0, o.m3gHandle);
        pendingEx = null;
      }
      onFinalize(a);
    };
  }

  // ---------------------------------------------------------------- WebGL

  var canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  var gl = null;
  var target = null;

  function context() {
    if (!gl) {
      gl = canvas.getContext("webgl", { alpha: true, depth: true, stencil: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
      initGL();
    }
    return gl;
  }

  var GL_FIXED = 0x140C, GL_FLOAT = 0x1406, GL_BYTE = 0x1400, GL_UNSIGNED_BYTE = 0x1401, GL_SHORT = 0x1402, GL_UNSIGNED_SHORT = 0x1403;
  var GL_MODELVIEW = 0x1700, GL_PROJECTION = 0x1701, GL_TEXTURE = 0x1702;
  var GL_ALPHA = 0x1906, GL_RGB = 0x1907, GL_RGBA = 0x1908, GL_LUMINANCE = 0x1909, GL_LUMINANCE_ALPHA = 0x190A;
  var GL_MODULATE = 0x2100, GL_DECAL = 0x2101, GL_ADD = 0x0104, GL_BLEND = 0x0BE2, GL_REPLACE = 0x1E01;
  var GL_LINEAR = 0x2601, GL_EXP = 0x0800, GL_EXP2 = 0x0801;
  var TYPE_SIZE = {};
  TYPE_SIZE[GL_BYTE] = 1; TYPE_SIZE[GL_UNSIGNED_BYTE] = 1; TYPE_SIZE[GL_SHORT] = 2; TYPE_SIZE[GL_UNSIGNED_SHORT] = 2; TYPE_SIZE[GL_FIXED] = 4; TYPE_SIZE[GL_FLOAT] = 4;

  function ident() {
    var m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }

  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) {
      for (var r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  function v4(a, b, c, d) {
    return new Float32Array([a, b, c, d]);
  }

  var S = {
    mode: GL_MODELVIEW,
    stacks: null,
    lighting: false,
    lights: [],
    sceneAmb: v4(0.2, 0.2, 0.2, 1),
    twoSide: false,
    mat: { amb: v4(0.2, 0.2, 0.2, 1), dif: v4(0.8, 0.8, 0.8, 1), spec: v4(0, 0, 0, 1), emi: v4(0, 0, 0, 1), shin: 0 },
    colorMaterial: false,
    color: v4(1, 1, 1, 1),
    fog: false, fogMode: GL_EXP, fogDensity: 1, fogStart: 0, fogEnd: 1, fogColor: v4(0, 0, 0, 0),
    alphaTest: false, alphaFunc: 0x0207, alphaRef: 0,
    active: 0, clientActive: 0,
    units: [],
    arrays: { v: {}, n: {}, c: {}, t: [{}, {}] },
    caps: {}, viewport: [0, 0, 1, 1], scissor: [0, 0, 1, 1], colorMask: [true, true, true, true], depthMask: true, clearColor: [0, 0, 0, 0]
  };

  S.stacks = {};
  S.stacks[GL_MODELVIEW] = [ident()];
  S.stacks[GL_PROJECTION] = [ident()];
  S.texStacks = [[ident()], [ident()]];
  for (var li = 0; li < 8; li++) {
    S.lights.push({
      on: false,
      amb: v4(0, 0, 0, 1),
      dif: li ? v4(0, 0, 0, 1) : v4(1, 1, 1, 1),
      spec: li ? v4(0, 0, 0, 1) : v4(1, 1, 1, 1),
      pos: v4(0, 0, 1, 0),
      dir: v4(0, 0, -1, 0),
      k: v4(1, 0, 0, -2)
    });
  }
  for (var ui = 0; ui < 2; ui++) S.units.push({ on: false, bound: 0, env: GL_MODULATE, envColor: v4(0, 0, 0, 0) });

  function stack() {
    return S.mode === GL_TEXTURE ? S.texStacks[S.active] : S.stacks[S.mode];
  }

  function top() {
    var s = stack();
    return s[s.length - 1];
  }

  function setTop(m) {
    var s = stack();
    s[s.length - 1] = m;
  }

  var textures = [null];
  var freeTex = [];
  var bufs = {};
  var programs = {};
  var blit = null;
  var strings = {};

  function initGL() {
    ["v", "n", "c", "t0", "t1", "i"].forEach(function (k) {
      bufs[k] = gl.createBuffer();
    });
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  }

  function compile(vs, fs, attrs) {
    var p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (e) {
      var s = gl.createShader(e[0]);
      gl.shaderSource(s, e[1]);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("M3G shader:", gl.getShaderInfoLog(s), e[1]);
      gl.attachShader(p, s);
    });
    attrs.forEach(function (a, i) {
      gl.bindAttribLocation(p, i, a);
    });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error("M3G link:", gl.getProgramInfoLog(p));
    return p;
  }

  var ALPHA_OPS = { 512: "false", 513: "a < r", 514: "a == r", 515: "a <= r", 516: "a > r", 517: "a != r", 518: "a >= r" };

  function envCode(u, mode, fmt) {
    var s = "s" + u, e = "uEC" + u;
    var rgb = fmt !== GL_ALPHA;
    var alpha = fmt === GL_ALPHA || fmt === GL_LUMINANCE_ALPHA || fmt === GL_RGBA;
    var c = "";
    switch (mode) {
      case GL_REPLACE:
        if (rgb) c += "c.rgb = " + s + ".rgb;";
        if (alpha) c += "c.a = " + s + ".a;";
        break;
      case GL_DECAL:
        if (fmt === GL_RGB || fmt === GL_LUMINANCE) c += "c.rgb = " + s + ".rgb;";
        else if (rgb) c += "c.rgb = mix(c.rgb, " + s + ".rgb, " + s + ".a);";
        break;
      case GL_BLEND:
        if (rgb) c += "c.rgb = mix(c.rgb, " + e + ".rgb, " + s + ".rgb);";
        if (alpha) c += "c.a *= " + s + ".a;";
        break;
      case GL_ADD:
        if (rgb) c += "c.rgb = min(c.rgb + " + s + ".rgb, 1.0);";
        if (alpha) c += "c.a *= " + s + ".a;";
        break;
      default:
        if (rgb) c += "c.rgb *= " + s + ".rgb;";
        if (alpha) c += "c.a *= " + s + ".a;";
    }
    return c;
  }

  function program(key, cfg) {
    var p = programs[key];
    if (p) return p;
    var d = "";
    if (cfg.nl) d += "#define NL " + cfg.nl + "\n";
    if (cfg.twoSide) d += "#define TS\n";
    if (cfg.cm) d += "#define CM\n";
    if (cfg.tex[0]) d += "#define T0\n";
    if (cfg.tex[1]) d += "#define T1\n";
    if (cfg.fog) d += "#define FOG " + cfg.fog + "\n";
    var vs = d + [
      "precision highp float;",
      "attribute vec4 aPos; attribute vec3 aNrm; attribute vec4 aCol; attribute vec4 aT0; attribute vec4 aT1;",
      "uniform mat4 uMV; uniform mat4 uP; uniform mat3 uNM; uniform mat4 uTM0; uniform mat4 uTM1;",
      "varying vec4 vC; varying vec4 vB; varying vec4 vT0; varying vec4 vT1; varying float vZ;",
      "#ifdef NL",
      "uniform vec4 uMA; uniform vec4 uMD; uniform vec4 uMS; uniform vec4 uME; uniform float uSh; uniform vec4 uSA;",
      "uniform vec4 uLA[NL]; uniform vec4 uLD[NL]; uniform vec4 uLS[NL]; uniform vec4 uLP[NL]; uniform vec4 uLDir[NL]; uniform vec4 uLK[NL];",
      "vec4 lit(vec3 n, vec3 v, vec4 ma, vec4 md) {",
      "  vec3 c = uME.rgb + uSA.rgb * ma.rgb;",
      "  for (int i = 0; i < NL; i++) {",
      "    vec3 L; float att = 1.0;",
      "    if (uLP[i].w == 0.0) { L = normalize(uLP[i].xyz); }",
      "    else { vec3 dv = uLP[i].xyz / uLP[i].w - v; float dist = length(dv); L = dv / max(dist, 1e-6);",
      "      att = 1.0 / max(uLK[i].x + uLK[i].y * dist + uLK[i].z * dist * dist, 1e-6); }",
      "    if (uLK[i].w > -1.5) { float sd = dot(-L, normalize(uLDir[i].xyz));",
      "      att *= sd < uLK[i].w ? 0.0 : pow(max(sd, 1e-6), uLDir[i].w); }",
      "    float nl = dot(n, L);",
      "    vec3 t = uLA[i].rgb * ma.rgb;",
      "    if (nl > 0.0) {",
      "      t += nl * uLD[i].rgb * md.rgb;",
      "      float nh = max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0);",
      "      if (nh > 0.0) t += pow(nh, uSh) * uLS[i].rgb * uMS.rgb;",
      "    }",
      "    c += att * t;",
      "  }",
      "  return vec4(clamp(c, 0.0, 1.0), clamp(md.a, 0.0, 1.0));",
      "}",
      "#endif",
      "void main() {",
      "  vec4 ep = uMV * aPos;",
      "  gl_Position = uP * ep;",
      "#ifdef NL",
      "  vec3 n = normalize(uNM * aNrm);",
      "#ifdef CM",
      "  vec4 ma = aCol; vec4 md = aCol;",
      "#else",
      "  vec4 ma = uMA; vec4 md = uMD;",
      "#endif",
      "  vec3 v = ep.xyz / ep.w;",
      "  vC = lit(n, v, ma, md);",
      "#ifdef TS",
      "  vB = lit(-n, v, ma, md);",
      "#endif",
      "#else",
      "  vC = clamp(aCol, 0.0, 1.0);",
      "#endif",
      "#ifdef T0",
      "  vT0 = uTM0 * aT0;",
      "#endif",
      "#ifdef T1",
      "  vT1 = uTM1 * aT1;",
      "#endif",
      "  vZ = abs(ep.z / ep.w);",
      "}"
    ].join("\n");
    var fs = d + [
      "precision mediump float;",
      "varying vec4 vC; varying vec4 vB; varying vec4 vT0; varying vec4 vT1; varying float vZ;",
      "uniform sampler2D uS0; uniform sampler2D uS1; uniform vec4 uEC0; uniform vec4 uEC1;",
      "uniform float uAR; uniform vec4 uFC; uniform vec3 uFP;",
      "void main() {",
      "  vec4 c = vC;",
      "#ifdef TS",
      "  if (!gl_FrontFacing) c = vB;",
      "#endif",
      "#ifdef T0",
      "  vec4 s0 = texture2D(uS0, vT0.xy / vT0.w);",
      "  " + (cfg.tex[0] ? envCode(0, cfg.tex[0].env, cfg.tex[0].fmt) : ""),
      "#endif",
      "#ifdef T1",
      "  vec4 s1 = texture2D(uS1, vT1.xy / vT1.w);",
      "  " + (cfg.tex[1] ? envCode(1, cfg.tex[1].env, cfg.tex[1].fmt) : ""),
      "#endif",
      cfg.alpha ? "  { float a = c.a; float r = uAR; if (!(" + ALPHA_OPS[cfg.alpha] + ")) discard; }" : "",
      "#ifdef FOG",
      "#if FOG == 1",
      "  float f = (uFP.y - vZ) / (uFP.y - uFP.x);",
      "#elif FOG == 2",
      "  float f = exp(-uFP.z * vZ);",
      "#else",
      "  float f = exp(-(uFP.z * vZ) * (uFP.z * vZ));",
      "#endif",
      "  c.rgb = mix(uFC.rgb, c.rgb, clamp(f, 0.0, 1.0));",
      "#endif",
      "  gl_FragColor = c;",
      "}"
    ].join("\n");
    p = compile(vs, fs, ["aPos", "aNrm", "aCol", "aT0", "aT1"]);
    var u = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      var name = info.name.replace("[0]", "");
      u[name] = gl.getUniformLocation(p, info.name);
    }
    programs[key] = { p: p, u: u };
    gl.useProgram(p);
    if (u.uS0) gl.uniform1i(u.uS0, 0);
    if (u.uS1) gl.uniform1i(u.uS1, 1);
    return programs[key];
  }

  function normalMatrix(m) {
    var a00 = m[0], a01 = m[1], a02 = m[2], a10 = m[4], a11 = m[5], a12 = m[6], a20 = m[8], a21 = m[9], a22 = m[10];
    var b01 = a22 * a11 - a12 * a21, b11 = -a22 * a10 + a12 * a20, b21 = a21 * a10 - a11 * a20;
    var det = a00 * b01 + a01 * b11 + a02 * b21;
    var id = det ? 1 / det : 0;
    return new Float32Array([
      b01 * id, (-a22 * a01 + a02 * a21) * id, (a12 * a01 - a02 * a11) * id,
      b11 * id, (a22 * a00 - a02 * a20) * id, (-a12 * a00 + a02 * a10) * id,
      b21 * id, (-a21 * a00 + a01 * a20) * id, (a11 * a00 - a01 * a10) * id
    ]);
  }

  function uploadAttrib(loc, a, buf, normalized, count, def) {
    if (!a.on) {
      gl.disableVertexAttribArray(loc);
      gl.vertexAttrib4f(loc, def[0], def[1], def[2], def[3]);
      return;
    }
    var ts = TYPE_SIZE[a.type];
    var stride = a.stride || a.size * ts;
    var len = count * Math.max(stride, a.size * ts);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    if (a.type === GL_FIXED) {
      var out = new Float32Array(count * a.size);
      var base = a.ptr >> 2, st = stride >> 2;
      for (var i = 0; i < count; i++) {
        for (var k = 0; k < a.size; k++) out[i * a.size + k] = i32[base + i * st + k] / 65536;
      }
      gl.bufferData(gl.ARRAY_BUFFER, out, gl.STREAM_DRAW);
      gl.vertexAttribPointer(loc, a.size, gl.FLOAT, false, 0, 0);
    } else {
      gl.bufferData(gl.ARRAY_BUFFER, u8.subarray(a.ptr, a.ptr + len), gl.STREAM_DRAW);
      gl.vertexAttribPointer(loc, a.size, a.type, normalized, stride, 0);
    }
    gl.enableVertexAttribArray(loc);
  }

  var DEF_NORMAL = [0, 0, 1, 1], DEF_TEX = [0, 0, 0, 1];

  function draw(mode, first, count, itype, iptr) {
    if (count <= 0 || !S.arrays.v.on) return;
    mem();
    var n = first + count;
    var indices = null;
    if (itype) {
      indices = itype === GL_UNSIGNED_SHORT ? new Uint16Array(memBuf, iptr, count) : u8.subarray(iptr, iptr + count);
      n = 0;
      for (var i = 0; i < count; i++) if (indices[i] >= n) n = indices[i] + 1;
    }

    var cfg = { nl: 0, twoSide: false, cm: false, tex: [null, null], fog: 0, alpha: 0 };
    var key = "";
    var lights = [];
    if (S.lighting) {
      for (i = 0; i < 8; i++) if (S.lights[i].on) lights.push(S.lights[i]);
      cfg.nl = lights.length;
      cfg.twoSide = S.twoSide;
      cfg.cm = S.colorMaterial;
      key += "L" + cfg.nl + (cfg.twoSide ? "t" : "") + (cfg.cm ? "c" : "");
      if (!cfg.nl) {
        cfg.nl = 1;
        lights.push({ amb: v4(0, 0, 0, 0), dif: v4(0, 0, 0, 0), spec: v4(0, 0, 0, 0), pos: v4(0, 0, 1, 0), dir: v4(0, 0, -1, 0), k: v4(1, 0, 0, -2) });
      }
    }
    for (i = 0; i < 2; i++) {
      var un = S.units[i];
      var t = textures[un.bound];
      if (un.on && t) {
        cfg.tex[i] = { env: un.env, fmt: t.fmt };
        key += "T" + i + "_" + un.env + "_" + t.fmt;
      }
    }
    if (S.fog) {
      cfg.fog = S.fogMode === GL_LINEAR ? 1 : S.fogMode === GL_EXP2 ? 3 : 2;
      key += "F" + cfg.fog;
    }
    if (S.alphaTest && S.alphaFunc !== 0x0207) {
      cfg.alpha = S.alphaFunc;
      key += "A" + cfg.alpha;
    }

    var pr = program(key, cfg);
    var u = pr.u;
    gl.useProgram(pr.p);

    var mv = S.stacks[GL_MODELVIEW][S.stacks[GL_MODELVIEW].length - 1];
    gl.uniformMatrix4fv(u.uMV, false, mv);
    gl.uniformMatrix4fv(u.uP, false, S.stacks[GL_PROJECTION][S.stacks[GL_PROJECTION].length - 1]);
    if (u.uNM) gl.uniformMatrix3fv(u.uNM, false, normalMatrix(mv));
    if (u.uTM0) gl.uniformMatrix4fv(u.uTM0, false, S.texStacks[0][S.texStacks[0].length - 1]);
    if (u.uTM1) gl.uniformMatrix4fv(u.uTM1, false, S.texStacks[1][S.texStacks[1].length - 1]);
    if (u.uEC0) gl.uniform4fv(u.uEC0, S.units[0].envColor);
    if (u.uEC1) gl.uniform4fv(u.uEC1, S.units[1].envColor);
    if (u.uAR) gl.uniform1f(u.uAR, S.alphaRef);
    if (u.uFC) {
      gl.uniform4fv(u.uFC, S.fogColor);
      gl.uniform3f(u.uFP, S.fogStart, S.fogEnd, S.fogDensity);
    }
    if (u.uSA) {
      var m = S.mat;
      gl.uniform4fv(u.uMA, m.amb);
      gl.uniform4fv(u.uMD, m.dif);
      gl.uniform4fv(u.uMS, m.spec);
      gl.uniform4fv(u.uME, m.emi);
      gl.uniform1f(u.uSh, m.shin);
      gl.uniform4fv(u.uSA, S.sceneAmb);
      var nl = lights.length;
      var la = new Float32Array(nl * 4), ld = new Float32Array(nl * 4), ls = new Float32Array(nl * 4);
      var lp = new Float32Array(nl * 4), lr = new Float32Array(nl * 4), lk = new Float32Array(nl * 4);
      for (i = 0; i < nl; i++) {
        var L = lights[i];
        la.set(L.amb, i * 4);
        ld.set(L.dif, i * 4);
        ls.set(L.spec, i * 4);
        lp.set(L.pos, i * 4);
        lr.set(L.dir, i * 4);
        lk.set(L.k, i * 4);
      }
      gl.uniform4fv(u.uLA, la);
      gl.uniform4fv(u.uLD, ld);
      gl.uniform4fv(u.uLS, ls);
      gl.uniform4fv(u.uLP, lp);
      gl.uniform4fv(u.uLDir, lr);
      gl.uniform4fv(u.uLK, lk);
    }

    var A = S.arrays;
    uploadAttrib(0, A.v, bufs.v, false, n, DEF_TEX);
    uploadAttrib(1, A.n, bufs.n, true, n, DEF_NORMAL);
    uploadAttrib(2, A.c, bufs.c, true, n, S.color);
    uploadAttrib(3, A.t[0], bufs.t0, false, n, DEF_TEX);
    uploadAttrib(4, A.t[1], bufs.t1, false, n, DEF_TEX);

    if (indices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.i);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STREAM_DRAW);
      gl.drawElements(mode, count, itype, 0);
    } else {
      gl.drawArrays(mode, first, count);
    }
  }

  function texObj() {
    return textures[S.units[S.active].bound];
  }

  function afterUpload(t) {
    if (t && t.genMip) gl.generateMipmap(gl.TEXTURE_2D);
  }

  var BPP = {};
  BPP[GL_ALPHA] = 1; BPP[GL_LUMINANCE] = 1; BPP[GL_LUMINANCE_ALPHA] = 2; BPP[GL_RGB] = 3; BPP[GL_RGBA] = 4;

  function rgba(arr, off) {
    return [arr[off] / 65536, arr[off + 1] / 65536, arr[off + 2] / 65536, arr[off + 3] / 65536];
  }

  function fv(p, n) {
    mem();
    return new Float32Array(f32.buffer, p, n).slice();
  }

  function xform(m, v) {
    return v4(
      m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
      m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
      m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
      m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3]);
  }

  function setCap(cap, on) {
    var g = context();
    if (cap >= 0x4000 && cap < 0x4008) {
      S.lights[cap - 0x4000].on = on;
      return;
    }
    switch (cap) {
      case 0x0B50: S.lighting = on; break;
      case 0x0B60: S.fog = on; break;
      case 0x0BC0: S.alphaTest = on; break;
      case 0x0DE1: S.units[S.active].on = on; break;
      case 0x0B57: S.colorMaterial = on; break;
      case 0x0BA1: case 0x803A: case 0x809D: case 0x0BD0: break;
      default:
        S.caps[cap] = on;
        if (on) g.enable(cap);
        else g.disable(cap);
    }
  }

  function arrayFor(a) {
    switch (a) {
      case 0x8074: return S.arrays.v;
      case 0x8075: return S.arrays.n;
      case 0x8076: return S.arrays.c;
      default: return S.arrays.t[S.clientActive];
    }
  }

  function pointer(a, size, type, stride, ptr) {
    a.size = size;
    a.type = type;
    a.stride = stride;
    a.ptr = ptr;
  }

  function decodePalette(fmt, w, h, size, ptr) {
    var bpp = fmt === 0x8B96 ? 4 : 3;
    var palBytes = size - w * h;
    mem();
    var pal = u8.subarray(ptr, ptr + palBytes);
    var idx = u8.subarray(ptr + palBytes, ptr + palBytes + w * h);
    var out = new Uint8Array(w * h * bpp);
    for (var i = 0; i < w * h; i++) {
      var o = idx[i] * bpp;
      for (var k = 0; k < bpp; k++) out[i * bpp + k] = pal[o + k];
    }
    return { fmt: bpp === 4 ? GL_RGBA : GL_RGB, data: out };
  }

  var glImports = {
    glActiveTexture: function (t) { S.active = t - 0x84C0; context().activeTexture(t); },
    glAlphaFunc: function (f, r) { S.alphaFunc = f; S.alphaRef = r; },
    glBindTexture: function (target, name) {
      S.units[S.active].bound = name;
      var t = textures[name];
      context().bindTexture(gl.TEXTURE_2D, t ? t.t : null);
    },
    glBlendFunc: function (s, d) { context().blendFunc(s, d); },
    glClear: function (m) { context().clear(m); },
    glClearColorx: function (r, g, b, a) {
      S.clearColor = [r / 65536, g / 65536, b / 65536, a / 65536];
      context().clearColor(S.clearColor[0], S.clearColor[1], S.clearColor[2], S.clearColor[3]);
    },
    glClearDepthx: function (d) { context().clearDepth(d / 65536); },
    glClientActiveTexture: function (t) { S.clientActive = t - 0x84C0; },
    glColor4x: function (r, g, b, a) { S.color = v4(r / 65536, g / 65536, b / 65536, a / 65536); },
    glColorMask: function (r, g, b, a) {
      S.colorMask = [!!r, !!g, !!b, !!a];
      context().colorMask(!!r, !!g, !!b, !!a);
    },
    glColorMaterial: function () {},
    glColorPointer: function (size, type, stride, ptr) { pointer(S.arrays.c, size, type, stride, ptr); },
    glCompressedTexImage2D: function (target, level, fmt, w, h, border, size, ptr) {
      var d = decodePalette(fmt, w, h, size, ptr);
      var t = texObj();
      if (t) t.fmt = d.fmt;
      context().texImage2D(gl.TEXTURE_2D, 0, d.fmt, w, h, 0, d.fmt, gl.UNSIGNED_BYTE, d.data);
      afterUpload(t);
    },
    glCopyTexImage2D: function (target, level, fmt, x, y, w, h, border) {
      var t = texObj();
      if (t) t.fmt = fmt;
      context().copyTexImage2D(target, level, fmt, x, y, w, h, border);
      if (!level) afterUpload(t);
    },
    glCullFace: function (m) { context().cullFace(m); },
    glDeleteTextures: function (n, p) {
      mem();
      for (var i = 0; i < n; i++) {
        var name = i32[(p >> 2) + i];
        var t = textures[name];
        if (!t) continue;
        context().deleteTexture(t.t);
        textures[name] = null;
        freeTex.push(name);
        S.units.forEach(function (u) {
          if (u.bound === name) u.bound = 0;
        });
      }
    },
    glDepthFunc: function (f) { context().depthFunc(f); },
    glDepthMask: function (f) { S.depthMask = !!f; context().depthMask(!!f); },
    glDepthRangef: function (n, f) { context().depthRange(n, f); },
    glDisable: function (c) { setCap(c, false); },
    glDisableClientState: function (a) { arrayFor(a).on = false; },
    glDrawArrays: function (mode, first, count) { draw(mode, first, count, 0, 0); },
    glDrawElements: function (mode, count, type, ptr) { draw(mode, 0, count, type, ptr); },
    glEnable: function (c) { setCap(c, true); },
    glEnableClientState: function (a) { arrayFor(a).on = true; },
    glFinish: function () {},
    glFogf: function (p, v) {
      switch (p) {
        case 0x0B65: S.fogMode = v; break;
        case 0x0B62: S.fogDensity = v; break;
        case 0x0B63: S.fogStart = v; break;
        case 0x0B64: S.fogEnd = v; break;
      }
    },
    glFogxv: function (p, ptr) {
      mem();
      if (p === 0x0B66) S.fogColor = v4.apply(null, rgba(i32, ptr >> 2));
    },
    glFrontFace: function (m) { context().frontFace(m); },
    glGenTextures: function (n, p) {
      context();
      mem();
      for (var i = 0; i < n; i++) {
        var name = freeTex.length ? freeTex.pop() : textures.length;
        textures[name] = { t: gl.createTexture(), fmt: GL_RGBA, genMip: false };
        i32[(p >> 2) + i] = name;
      }
    },
    glGetError: function () { return context().getError(); },
    glGetIntegerv: function (pname, p) {
      var g = context();
      mem();
      var b = p >> 2;
      switch (pname) {
        case 0x0D33: i32[b] = Math.min(g.getParameter(g.MAX_TEXTURE_SIZE), 1024); break;
        case 0x0D3A: var d = g.getParameter(g.MAX_VIEWPORT_DIMS); i32[b] = d[0]; i32[b + 1] = d[1]; break;
        case 0x0D31: i32[b] = 8; break;
        case 0x84E2: i32[b] = 2; break;
        default:
          var v = g.getParameter(pname);
          if (v && v.length) for (var i = 0; i < v.length; i++) i32[b + i] = v[i] | 0;
          else i32[b] = v | 0;
      }
    },
    glGetString: function (name) {
      if (!strings[name]) {
        var s = { 0x1F00: "Anthropic", 0x1F01: "WebGL", 0x1F02: "OpenGL ES-CM 1.1", 0x1F03: "" }[name] || "";
        strings[name] = newCStr(s);
      }
      return strings[name];
    },
    glHint: function () {},
    glLightModelf: function (p, v) { if (p === 0x0B52) S.twoSide = v !== 0; },
    glLightModelfv: function (p, ptr) { if (p === 0x0B53) S.sceneAmb = fv(ptr, 4); },
    glLightf: function (light, p, v) {
      var L = S.lights[light - 0x4000];
      switch (p) {
        case 0x1205: L.dir[3] = v; break;
        case 0x1206: L.k[3] = v >= 180 ? -2 : Math.cos(v * Math.PI / 180); break;
        case 0x1207: L.k[0] = v; break;
        case 0x1208: L.k[1] = v; break;
        case 0x1209: L.k[2] = v; break;
      }
    },
    glLightfv: function (light, p, ptr) {
      var L = S.lights[light - 0x4000];
      var v = fv(ptr, 4);
      var mv = S.stacks[GL_MODELVIEW][S.stacks[GL_MODELVIEW].length - 1];
      switch (p) {
        case 0x1200: L.amb = v; break;
        case 0x1201: L.dif = v; break;
        case 0x1202: L.spec = v; break;
        case 0x1203: L.pos = xform(mv, v); break;
        case 0x1204:
          var d = xform(mv, v4(v[0], v[1], v[2], 0));
          L.dir = v4(d[0], d[1], d[2], L.dir[3]);
          break;
        default: glImports.glLightf(light, p, v[0]);
      }
    },
    glLoadIdentity: function () { setTop(ident()); },
    glLoadMatrixf: function (p) { setTop(fv(p, 16)); },
    glMaterialf: function (face, p, v) { if (p === 0x1601) S.mat.shin = v; },
    glMaterialfv: function (face, p, ptr) {
      var v = fv(ptr, 4);
      switch (p) {
        case 0x1200: S.mat.amb = v; break;
        case 0x1201: S.mat.dif = v; break;
        case 0x1202: S.mat.spec = v; break;
        case 0x1600: S.mat.emi = v; break;
        case 0x1602: S.mat.amb = v; S.mat.dif = v4(v[0], v[1], v[2], v[3]); break;
        case 0x1601: S.mat.shin = v[0]; break;
      }
    },
    glMatrixMode: function (m) { S.mode = m; },
    glMultMatrixf: function (p) { setTop(mul(top(), fv(p, 16))); },
    glNormalPointer: function (type, stride, ptr) { pointer(S.arrays.n, 3, type, stride, ptr); },
    glOrthox: function (l, r, b, t, n, f) {
      l /= 65536; r /= 65536; b /= 65536; t /= 65536; n /= 65536; f /= 65536;
      var m = ident();
      m[0] = 2 / (r - l);
      m[5] = 2 / (t - b);
      m[10] = -2 / (f - n);
      m[12] = -(r + l) / (r - l);
      m[13] = -(t + b) / (t - b);
      m[14] = -(f + n) / (f - n);
      setTop(mul(top(), m));
    },
    glPixelStorei: function (p, v) { context().pixelStorei(p, v); },
    glPolygonOffset: function (f, u) { context().polygonOffset(f, u); },
    glPopMatrix: function () {
      var s = stack();
      if (s.length > 1) s.pop();
    },
    glPushMatrix: function () {
      var s = stack();
      s.push(new Float32Array(s[s.length - 1]));
    },
    glReadPixels: function (x, y, w, h, fmt, type, p) {
      mem();
      context().readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(memBuf, p, w * h * 4));
    },
    glScalef: function (x, y, z) {
      var m = ident();
      m[0] = x; m[5] = y; m[10] = z;
      setTop(mul(top(), m));
    },
    glScissor: function (x, y, w, h) {
      S.scissor = [x, y, w, h];
      context().scissor(x, y, w, h);
    },
    glShadeModel: function () {},
    glTexCoordPointer: function (size, type, stride, ptr) { pointer(S.arrays.t[S.clientActive], size, type, stride, ptr); },
    glTexEnvfv: function (target, p, ptr) { if (p === 0x2201) S.units[S.active].envColor = fv(ptr, 4); },
    glTexEnvx: function (target, p, v) { if (p === 0x2200) S.units[S.active].env = v; },
    glTexImage2D: function (target, level, ifmt, w, h, border, fmt, type, ptr) {
      var g = context();
      var t = texObj();
      if (t && !level) t.fmt = fmt;
      mem();
      var data = ptr ? u8.subarray(ptr, ptr + w * h * BPP[fmt]) : null;
      g.texImage2D(gl.TEXTURE_2D, level, fmt, w, h, 0, fmt, gl.UNSIGNED_BYTE, data);
      if (!level) afterUpload(t);
    },
    glTexParameteri: function (target, p, v) {
      if (p === 0x8191) {
        var t = texObj();
        if (t) t.genMip = !!v;
        return;
      }
      context().texParameteri(gl.TEXTURE_2D, p, v);
    },
    glTexParameterx: function (target, p, v) { glImports.glTexParameteri(target, p, v); },
    glTexSubImage2D: function (target, level, x, y, w, h, fmt, type, ptr) {
      mem();
      context().texSubImage2D(gl.TEXTURE_2D, level, x, y, w, h, fmt, gl.UNSIGNED_BYTE, u8.subarray(ptr, ptr + w * h * BPP[fmt]));
      if (!level) afterUpload(texObj());
    },
    glTranslatef: function (x, y, z) {
      var m = ident();
      m[12] = x; m[13] = y; m[14] = z;
      setTop(mul(top(), m));
    },
    glVertexPointer: function (size, type, stride, ptr) { pointer(S.arrays.v, size, type, stride, ptr); },
    glViewport: function (x, y, w, h) {
      S.viewport = [x, y, w, h];
      context().viewport(x, y, w, h);
    }
  };

  // ------------------------------------------------------- 2D target bridge

  function restoreState() {
    var g = gl;
    [g.BLEND, g.DEPTH_TEST, g.CULL_FACE, g.SCISSOR_TEST].forEach(function (c) {
      if (S.caps[c]) g.enable(c);
      else g.disable(c);
    });
    g.viewport(S.viewport[0], S.viewport[1], S.viewport[2], S.viewport[3]);
    g.scissor(S.scissor[0], S.scissor[1], S.scissor[2], S.scissor[3]);
    g.colorMask(S.colorMask[0], S.colorMask[1], S.colorMask[2], S.colorMask[3]);
    g.depthMask(S.depthMask);
    g.clearColor(S.clearColor[0], S.clearColor[1], S.clearColor[2], S.clearColor[3]);
    g.activeTexture(g.TEXTURE0);
    var t = textures[S.units[0].bound];
    g.bindTexture(g.TEXTURE_2D, t ? t.t : null);
    g.activeTexture(g.TEXTURE0 + S.active);
  }

  function targetLoad(x, y, w, h) {
    if (!target || w <= 0 || h <= 0) return;
    var g = context();
    if (!blit) {
      blit = {
        p: compile(
          "attribute vec2 aPos; varying vec2 vT; void main() { gl_Position = vec4(aPos, 0.0, 1.0); vT = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); }",
          "precision mediump float; uniform sampler2D uS; varying vec2 vT; void main() { gl_FragColor = texture2D(uS, vT); }",
          ["aPos"]),
        t: g.createTexture(),
        b: g.createBuffer()
      };
      g.bindBuffer(g.ARRAY_BUFFER, blit.b);
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
    }
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, blit.t);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, target.context.canvas);
    g.useProgram(blit.p);
    g.bindBuffer(g.ARRAY_BUFFER, blit.b);
    g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
    g.enableVertexAttribArray(0);
    for (var a = 1; a < 5; a++) g.disableVertexAttribArray(a);
    g.disable(g.BLEND);
    g.disable(g.DEPTH_TEST);
    g.disable(g.CULL_FACE);
    g.enable(g.SCISSOR_TEST);
    g.scissor(x, y, w, h);
    g.viewport(0, 0, canvas.width, canvas.height);
    g.colorMask(true, true, true, true);
    g.depthMask(false);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
    restoreState();
  }

  function targetStore(x, y, w, h) {
    if (!target || w <= 0 || h <= 0) return;
    var g = context();
    g.enable(g.SCISSOR_TEST);
    g.scissor(x, y, w, h);
    g.colorMask(false, false, false, true);
    g.clearColor(0, 0, 0, 1);
    g.clear(g.COLOR_BUFFER_BIT);
    restoreState();
    var ctx = target.context;
    target.currentlyAppliedGraphicsInfo = null;
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, canvas.height - y - h, w, h);
    ctx.clip();
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    ctx.save();
  }

  // ----------------------------------------------------------------- boot

  var imports = {
    env: Object.assign({
      web_surface: function (w, h) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        context();
      },
      web_target_load: targetLoad,
      web_target_store: targetStore,
      web_log: function (p) { console.warn("M3G: " + cstr(p)); }
    }, jni, glImports),
    wasi_snapshot_preview1: {
      fd_write: function (fd, iov, iovcnt, nwritten) {
        mem();
        var n = 0;
        for (var i = 0; i < iovcnt; i++) n += i32[(iov >> 2) + i * 2 + 1];
        i32[nwritten >> 2] = n;
        return 0;
      },
      fd_seek: function () { return 0; },
      fd_close: function () { return 0; }
    }
  };

  var ready = fetch("bld/m3g.wasm").then(function (r) {
    return r.arrayBuffer();
  }).then(function (b) {
    return WebAssembly.instantiate(b, imports);
  }).then(function (r) {
    X = r.instance.exports;
    installNatives();
  }).catch(function (e) {
    console.error("M3G: wasm load failed", e);
  });

  if (typeof loadingPromises !== "undefined") loadingPromises.push(ready);
})();
