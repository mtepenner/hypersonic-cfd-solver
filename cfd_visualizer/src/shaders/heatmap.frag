varying vec2 vUv;
uniform sampler2D uScalar;
uniform sampler2D uBodyMask;

vec3 palette(float t) {
    vec3 cold = vec3(0.03, 0.11, 0.22);
    vec3 warm = vec3(0.16, 0.72, 0.71);
    vec3 hot = vec3(0.98, 0.76, 0.24);
    vec3 critical = vec3(0.92, 0.24, 0.14);
    if (t < 0.35) {
        return mix(cold, warm, smoothstep(0.0, 0.35, t));
    }
    if (t < 0.75) {
        return mix(warm, hot, smoothstep(0.35, 0.75, t));
    }
    return mix(hot, critical, smoothstep(0.75, 1.0, t));
}

void main() {
    float body = texture2D(uBodyMask, vec2(vUv.x, 1.0 - vUv.y)).r;
    float scalar = texture2D(uScalar, vec2(vUv.x, 1.0 - vUv.y)).r;
    vec3 color = palette(scalar);
    if (body > 0.4) {
        color = mix(color, vec3(0.94, 0.94, 0.98), 0.78);
    }
    gl_FragColor = vec4(color, 1.0);
}
