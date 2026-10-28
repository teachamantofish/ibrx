// Header animation: a 3D DNA double helix that unwinds, left to right, into a price line and
// its moving average. Base pairs fade as the strands separate and drift off as A/T/G/C letters.
// Plain canvas 2D with a hand-rolled perspective projection, so there is no library to load.
(function () {
    const canvas = document.querySelector('.hero canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const SAMPLES = 220;
    const TURNS = 3.4;
    const FOCAL = 1100;
    const TEAL = [94, 234, 212];
    const VIOLET = [167, 139, 250];
    const BASES = 'IBRX';

    let width = 0;
    let height = 0;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let visible = true;
    let lastTime = 0;
    let clock = 0;
    let sparkTimer = 0;
    let textClear = 0;

    // Background cells, positioned as fractions of the header so they survive resizes.
    const cells = Array.from({ length: 15 }, function (_, index) {
        const seed = Math.sin(index * 91.7) * 43758.5453;
        const rand = function (k) {
            const v = Math.sin(seed + k * 12.9898) * 43758.5453;
            return v - Math.floor(v);
        };
        return {
            x: rand(1),
            y: rand(2),
            r: 10 + rand(3) * 38,
            depth: 0.25 + rand(4) * 0.75,
            phase: rand(5) * Math.PI * 2,
            speed: 0.05 + rand(6) * 0.08
        };
    });

    const sparks = [];

    function clamp01(value) {
        return Math.max(0, Math.min(1, value));
    }

    function smoothstep(edge0, edge1, value) {
        const t = clamp01((value - edge0) / (edge1 - edge0));
        return t * t * (3 - 2 * t);
    }

    function rgba(color, alpha) {
        return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + alpha.toFixed(3) + ')';
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        textClear = textRight();
    }

    // A slow-scrolling, gently rising "price" built from a few sines; the second strand
    // becomes a smoother, lagging average of it.
    function price(u, t) {
        const s = u * 6 + t * 0.12;
        return 0.42 * Math.sin(s * 1.7) + 0.24 * Math.sin(s * 3.1 + 1.3) +
            0.12 * Math.sin(s * 7.3 + 0.4) + 0.06 * Math.sin(s * 13.1) + (u - 0.75) * 1.1;
    }

    function average(u, t) {
        const s = u * 6 + t * 0.12 - 0.25;
        return 0.38 * Math.sin(s * 1.7) + 0.16 * Math.sin(s * 3.1 + 1.3) + (u - 0.75) * 1.1;
    }

    function buildStrands(t) {
        const narrow = width < 640;
        const xStart = width * (narrow ? 0.05 : 0.2);
        const xEnd = width * 0.965;
        const centerX = width * 0.58;
        const radius = height * 0.24;
        const amplitude = height * 0.2;
        const yaw = -0.38 + mouseX * 0.14;
        const tilt = 0.1 + mouseY * 0.08;
        const cosYaw = Math.cos(yaw);
        const sinYaw = Math.sin(yaw);
        const cosTilt = Math.cos(tilt);
        const sinTilt = Math.sin(tilt);
        const unwindAt = 0.6 + 0.03 * Math.sin(t * 0.35);

        function project(x, y, z) {
            const x1 = x * cosYaw + z * sinYaw;
            const z1 = -x * sinYaw + z * cosYaw;
            const y1 = y * cosTilt - z1 * sinTilt;
            const z2 = y * sinTilt + z1 * cosTilt;
            const scale = FOCAL / (FOCAL + z2);
            return { x: centerX + x1 * scale, y: height / 2 + y1 * scale, z: z2, scale: scale };
        }

        const strandA = [];
        const strandB = [];
        for (let i = 0; i < SAMPLES; i++) {
            const u = i / (SAMPLES - 1);
            const unwind = smoothstep(unwindAt - 0.12, unwindAt + 0.16, u);
            const theta = u * TURNS * Math.PI * 2 - t * 0.55;
            // Radius pinches slightly at the far left so the helix emerges rather than starts.
            const r = radius * (0.55 + 0.45 * smoothstep(0, 0.18, u));
            const x = xStart + u * (xEnd - xStart) - centerX;

            const ay = r * Math.cos(theta);
            const az = r * Math.sin(theta);
            const by = -ay;
            const bz = -az;
            const pa = -price(u, t) * amplitude;
            const pb = -average(u, t) * amplitude;

            const a = project(x, ay + (pa - ay) * unwind, az * (1 - unwind));
            const b = project(x, by + (pb - by) * unwind, bz * (1 - unwind));
            a.unwind = b.unwind = unwind;
            a.u = b.u = u;
            // Depth cue: 1 nearest the viewer, 0 at the back of the helix.
            a.near = clamp01(0.5 - (a.z / (radius * 2)));
            b.near = clamp01(0.5 - (b.z / (radius * 2)));
            strandA.push(a);
            strandB.push(b);
        }
        return { a: strandA, b: strandB, unwindAt: unwindAt };
    }

    function drawCells(t) {
        cells.forEach(function (cell) {
            const drift = Math.sin(t * cell.speed + cell.phase);
            const x = cell.x * width + drift * 18 * cell.depth - mouseX * 22 * cell.depth;
            const y = cell.y * height + Math.cos(t * cell.speed * 0.8 + cell.phase) * 10 * cell.depth - mouseY * 10 * cell.depth;
            const r = cell.r * (0.6 + cell.depth * 0.6);
            const glow = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
            glow.addColorStop(0, 'rgba(94,234,212,' + (0.05 * cell.depth).toFixed(3) + ')');
            glow.addColorStop(1, 'rgba(94,234,212,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(147,197,253,' + (0.1 * cell.depth).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(167,139,250,' + (0.08 * cell.depth).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(x + r * 0.22 * Math.cos(cell.phase), y + r * 0.18 * Math.sin(cell.phase), r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawStrandLine(points, color) {
        for (let i = 1; i < points.length; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const solid = p1.unwind;
            const alpha = 0.12 + 0.25 * p1.near * (1 - solid) + 0.75 * solid;
            ctx.strokeStyle = rgba(color, alpha);
            ctx.lineWidth = 0.8 + 1.2 * solid;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
        }
    }

    function drawHelix(strands, t) {
        const drawables = [];

        for (let i = 0; i < SAMPLES; i += 4) {
            const a = strands.a[i];
            const b = strands.b[i];
            if (a.unwind < 0.92) drawables.push({ kind: 'rung', a: a, b: b, z: (a.z + b.z) / 2 });
        }
        for (let i = 0; i < SAMPLES; i += 2) {
            drawables.push({ kind: 'bead', p: strands.a[i], color: TEAL, z: strands.a[i].z });
            drawables.push({ kind: 'bead', p: strands.b[i], color: VIOLET, z: strands.b[i].z });
        }
        drawables.sort(function (first, second) {
            return second.z - first.z;
        });

        // Price line glow, under everything else.
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(TEAL, 0.08);
        ctx.lineWidth = 7;
        ctx.beginPath();
        strands.a.forEach(function (p, index) {
            if (p.unwind < 0.3) return;
            if (index === 0 || strands.a[index - 1].unwind < 0.3) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        drawStrandLine(strands.b, VIOLET);
        drawStrandLine(strands.a, TEAL);

        drawables.forEach(function (item) {
            if (item.kind === 'rung') {
                const fade = (1 - item.a.unwind) * (0.12 + 0.3 * (item.a.near + item.b.near) / 2);
                const gradient = ctx.createLinearGradient(item.a.x, item.a.y, item.b.x, item.b.y);
                gradient.addColorStop(0, rgba(TEAL, fade));
                gradient.addColorStop(1, rgba(VIOLET, fade));
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 1.2 * item.a.scale;
                ctx.beginPath();
                ctx.moveTo(item.a.x, item.a.y);
                ctx.lineTo(item.b.x, item.b.y);
                ctx.stroke();
                return;
            }

            const p = item.p;
            const helixWeight = 1 - p.unwind;
            const radius = (0.9 + 2.1 * helixWeight * (0.4 + 0.6 * p.near)) * p.scale;
            const alpha = 0.25 + 0.65 * (helixWeight * p.near + p.unwind * 0.5);
            if (helixWeight > 0.3 && p.near > 0.55) {
                ctx.fillStyle = rgba(item.color, 0.08 * p.near);
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius * 3.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = rgba(item.color, alpha);
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // The latest "tick": a pulsing point at the end of the price line.
        const tip = strands.a[SAMPLES - 1];
        const pulse = (t * 0.6) % 1;
        ctx.strokeStyle = rgba(TEAL, 0.6 * (1 - pulse));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 3 + pulse * 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }

    // Freed bases drift off the unwinding point as tiny letters.
    function updateSparks(strands, dt) {
        sparkTimer -= dt;
        if (sparkTimer <= 0 && sparks.length < 28) {
            sparkTimer = 0.18 + Math.random() * 0.25;
            const index = Math.round(strands.unwindAt * (SAMPLES - 1) + (Math.random() - 0.5) * 18);
            const fromA = Math.random() < 0.5;
            const source = (fromA ? strands.a : strands.b)[Math.max(0, Math.min(SAMPLES - 1, index))];
            sparks.push({
                x: source.x,
                y: source.y,
                vx: 6 + Math.random() * 14,
                vy: (Math.random() - 0.5) * 22,
                life: 0,
                span: 2.2 + Math.random() * 2,
                letter: BASES[Math.floor(Math.random() * 4)],
                color: fromA ? TEAL : VIOLET
            });
        }

        ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = sparks.length - 1; i >= 0; i--) {
            const spark = sparks[i];
            spark.life += dt;
            if (spark.life >= spark.span) {
                sparks.splice(i, 1);
                continue;
            }
            spark.x += spark.vx * dt;
            spark.y += spark.vy * dt;
            const k = spark.life / spark.span;
            ctx.fillStyle = rgba(spark.color, 0.7 * Math.sin(Math.PI * k));
            ctx.fillText(spark.letter, spark.x, spark.y);
        }
    }

    // Right edge of the stacked header text, so the fade below clears titles of any length.
    // The one-line .hero-meta row runs along the top, above the helix, so it is not counted.
    function textRight() {
        const text = document.querySelector('.hero-text');
        if (!text) return 0;
        const origin = canvas.getBoundingClientRect().left;
        return Array.from(text.children).filter(function (child) {
            return !child.classList.contains('hero-meta');
        }).reduce(function (right, child) {
            const range = document.createRange();
            range.selectNodeContents(child);
            return Math.max(right, range.getBoundingClientRect().right - origin);
        }, 0);
    }

    // Erase the left side so the title sits on the plain background.
    function fadeLeftEdge() {
        // Nearly solid to just past the text, then a 240px ramp back to the full helix.
        const solidTo = Math.min(width * 0.6, textClear + 24);
        const fadeTo = Math.min(width * 0.9, Math.max(width * 0.36, solidTo + 240));
        const gradient = ctx.createLinearGradient(0, 0, fadeTo, 0);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(solidTo / fadeTo, 'rgba(0,0,0,0.88)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, fadeTo, height);
        ctx.globalCompositeOperation = 'source-over';
    }

    function render(dt) {
        mouseX += (targetX - mouseX) * Math.min(1, dt * 3);
        mouseY += (targetY - mouseY) * Math.min(1, dt * 3);

        ctx.clearRect(0, 0, width, height);
        drawCells(clock);
        const strands = buildStrands(clock);
        drawHelix(strands, clock);
        if (!reduceMotion) updateSparks(strands, dt);
        fadeLeftEdge();
    }

    function frame(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
        lastTime = now;
        if (visible && !document.hidden) {
            clock += dt;
            render(dt);
        }
        requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', function () {
        resize();
        if (reduceMotion) render(0);
    });

    if (reduceMotion) {
        clock = 6;
        render(0);
        return;
    }

    window.addEventListener('mousemove', function (event) {
        const rect = canvas.getBoundingClientRect();
        targetX = clamp01((event.clientX - rect.left) / rect.width) * 2 - 1;
        targetY = clamp01((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
    });

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
        }).observe(canvas);
    }

    requestAnimationFrame(frame);
})();
