// Hero shader — a WebGL2 fragment shader rendered behind the hero copy.
// Season-aware color palette (Halloween: orange + purple; Christmas:
// holly-red + pine-green). Pauses on hidden tabs and when the hero is
// out of view. Falls back to the CSS hero background if WebGL2 isn't
// available OR the user prefers reduced motion — in that case we do
// nothing and .sky-wash / stars / moon carry the whole background.

(function initHeroShader() {
    const hero = document.querySelector(".hero");
    const bg   = hero && hero.querySelector(".hero-bg");
    if (!bg) return;

    // Reduced-motion visitors get the static CSS background.
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.className = "hero-shader";
    canvas.setAttribute("aria-hidden", "true");

    const gl = canvas.getContext("webgl2", {
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        powerPreference: "low-power",
    });
    if (!gl) return;

    const VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

    // Three drifting bulb layers over a bottom-anchored glow, tinted with
    // the season's primary + secondary colors. Kept intentionally cheap so
    // it holds 60 FPS on mobile.
    const FS = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;

out vec4 fragColor;

float hash21(vec2 p) {
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
}

float bulbLayer(vec2 uv, float scale, float speed, float t) {
    uv *= scale;
    uv.y -= t * speed;
    vec2 gi = floor(uv);
    vec2 gf = fract(uv) - 0.5;
    float d = 0.0;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 o = vec2(float(i), float(j));
            vec2 cellId = gi + o;
            vec2 pos = o + vec2(hash21(cellId) - 0.5, hash21(cellId + 5.7) - 0.5) * 0.8;
            float alive = step(0.82, hash21(cellId + 3.1));
            float phase = hash21(cellId + 7.1);
            float tw = 0.55 + 0.45 * sin(t * (0.8 + 3.0 * phase) + 6.2831 * phase);
            vec2 dv = gf - pos;
            d += alive * tw * exp(-45.0 * dot(dv, dv));
        }
    }
    return d;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes.xy;
    vec2 p  = (gl_FragCoord.xy - 0.5 * uRes.xy) / uRes.y;

    // Base wash: near-black with a soft season-primary glow anchored
    // at the bottom-center (where the "show" would live in the frame).
    float bottomGlow = smoothstep(1.4, 0.0, distance(p, vec2(0.0, -0.55)));
    vec3 col = mix(vec3(0.025, 0.015, 0.055), uColorA * 0.28, bottomGlow * 0.85);

    // Three parallax layers — different scales + drift speeds fake depth.
    float b1 = bulbLayer(uv,                    5.0,  0.008, uTime);
    float b2 = bulbLayer(uv + vec2(0.31, 0.72), 9.0,  0.014, uTime);
    float b3 = bulbLayer(uv + vec2(0.63, 0.17), 14.0, 0.020, uTime);

    col += uColorA * b1 * 0.95;
    col += uColorB * b2 * 0.70;
    col += mix(uColorA, uColorB, 0.5) * b3 * 0.50;

    // Gentle vignette to keep the copy area readable.
    float vig = smoothstep(1.55, 0.4, length(p));
    col *= vig;

    fragColor = vec4(col, 1.0);
}`;

    function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            gl.deleteShader(s);
            return null;
        }
        return s;
    }

    const v = compile(gl.VERTEX_SHADER, VS);
    const f = compile(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,  1,-1,  -1,1,  1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes    = gl.getUniformLocation(prog, "uRes");
    const uTime   = gl.getUniformLocation(prog, "uTime");
    const uColorA = gl.getUniformLocation(prog, "uColorA");
    const uColorB = gl.getUniformLocation(prog, "uColorB");

    const PALETTES = {
        halloween: { a: [1.00, 0.42, 0.10], b: [0.62, 0.13, 0.94] },
        christmas: { a: [1.00, 0.18, 0.29], b: [0.12, 0.54, 0.29] },
    };

    // Insert as the first child of .hero-bg so the CSS decorations
    // (stars, moon, bats, glows, particles, skyline) paint over the
    // shader. The `--shader-on` class hides .sky-wash so the shader
    // takes over the base atmospheric layer.
    bg.insertBefore(canvas, bg.firstChild);
    bg.classList.add("hero-bg--shader-on");

    function currentPalette() {
        const s = document.documentElement.getAttribute("data-theme") || "halloween";
        return PALETTES[s] || PALETTES.halloween;
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const w = Math.max(1, Math.floor(canvas.clientWidth  * dpr));
        const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
            gl.uniform2f(uRes, w, h);
        }
    }

    let rafId = 0;
    let visible = document.visibilityState === "visible";
    let inView  = true;
    const start = performance.now();

    function frame(now) {
        rafId = 0;
        if (!visible || !inView) return;
        resize();
        const pal = currentPalette();
        gl.uniform3f(uColorA, pal.a[0], pal.a[1], pal.a[2]);
        gl.uniform3f(uColorB, pal.b[0], pal.b[1], pal.b[2]);
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        rafId = requestAnimationFrame(frame);
    }

    function play() {
        if (rafId || !visible || !inView) return;
        rafId = requestAnimationFrame(frame);
    }
    function stop() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    document.addEventListener("visibilitychange", () => {
        visible = document.visibilityState === "visible";
        if (visible) play(); else stop();
    });

    if ("IntersectionObserver" in window) {
        new IntersectionObserver(entries => {
            inView = entries[0].isIntersecting;
            if (inView) play(); else stop();
        }, { rootMargin: "10% 0%" }).observe(hero);
    }

    // Kick it off. resize() runs once inside the first frame.
    play();
})();
