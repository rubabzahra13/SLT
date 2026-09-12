"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradientWave = GradientWave;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
function normalizeColor(hexCode) {
    return [
        ((hexCode >> 16) & 255) / 255,
        ((hexCode >> 8) & 255) / 255,
        (255 & hexCode) / 255,
    ];
}
class MiniGl {
    canvas;
    gl;
    // WebGL internals — typed loosely to match upstream shader helper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meshes = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commonUniforms;
    width;
    height;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Uniform;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Material;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PlaneGeometry;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Mesh;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Attribute;
    constructor(canvas) {
        this.canvas = canvas;
        const gl = this.canvas.getContext("webgl", { antialias: true });
        if (!gl)
            throw new Error("WebGL not supported");
        this.gl = gl;
        const context = this.gl;
        const miniGl = this;
        this.Uniform = class Uniform {
            type = "float";
            value;
            typeFn = "1f";
            excludeFrom;
            transpose;
            constructor(options) {
                Object.assign(this, options);
                const typeMap = {
                    float: "1f",
                    int: "1i",
                    vec2: "2fv",
                    vec3: "3fv",
                    vec4: "4fv",
                    mat4: "Matrix4fv",
                };
                this.typeFn = typeMap[this.type] ?? "1f";
            }
            update(location) {
                if (this.value === undefined || location === null)
                    return;
                const isMatrix = this.typeFn.indexOf("Matrix") === 0;
                const fn = `uniform${this.typeFn}`;
                if (isMatrix) {
                    context[fn](location, this.transpose ?? false, this.value);
                }
                else {
                    context[fn](location, this.value);
                }
            }
            getDeclaration(name, type, length) {
                if (this.excludeFrom === type)
                    return "";
                if (this.type === "array") {
                    const arrayValue = this.value;
                    return (arrayValue[0].getDeclaration(name, type, arrayValue.length) +
                        `\nconst int ${name}_length = ${arrayValue.length};`);
                }
                if (this.type === "struct") {
                    let nameNoPrefix = name.replace("u_", "");
                    nameNoPrefix =
                        nameNoPrefix.charAt(0).toUpperCase() + nameNoPrefix.slice(1);
                    const structValue = this.value;
                    const fields = Object.entries(structValue)
                        .map(([fieldName, uniform]) => uniform.getDeclaration(fieldName, type).replace(/^uniform/, ""))
                        .join("");
                    return `uniform struct ${nameNoPrefix} 
{
${fields}
} ${name}${length ? `[${length}]` : ""};`;
                }
                return `uniform ${this.type} ${name}${length ? `[${length}]` : ""};`;
            }
        };
        this.Attribute = class Attribute {
            type = context.FLOAT;
            normalized = false;
            buffer;
            target;
            size;
            values;
            constructor(options) {
                this.buffer = context.createBuffer();
                Object.assign(this, options);
            }
            update() {
                if (this.values) {
                    context.bindBuffer(this.target, this.buffer);
                    context.bufferData(this.target, this.values, context.STATIC_DRAW);
                }
            }
            attach(name, program) {
                const location = context.getAttribLocation(program, name);
                if (this.target === context.ARRAY_BUFFER) {
                    context.bindBuffer(this.target, this.buffer);
                    context.enableVertexAttribArray(location);
                    context.vertexAttribPointer(location, this.size, this.type, this.normalized, 0, 0);
                }
                return location;
            }
            use(location) {
                context.bindBuffer(this.target, this.buffer);
                if (this.target === context.ARRAY_BUFFER) {
                    context.enableVertexAttribArray(location);
                    context.vertexAttribPointer(location, this.size, this.type, this.normalized, 0, 0);
                }
            }
        };
        this.Material = class Material {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            uniforms = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            uniformInstances = [];
            program;
            constructor(vertexShaders, fragments, 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            uniforms = {}) {
                const material = this;
                function getShader(type, source) {
                    const shader = context.createShader(type);
                    context.shaderSource(shader, source);
                    context.compileShader(shader);
                    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
                        console.error(context.getShaderInfoLog(shader));
                        throw new Error("Shader compilation error");
                    }
                    return shader;
                }
                function getUniformDeclarations(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                uniformMap, shaderType) {
                    return Object.entries(uniformMap)
                        .map(([uniform, value]) => value.getDeclaration(uniform, shaderType))
                        .join("\n");
                }
                material.uniforms = uniforms;
                const prefix = "precision highp float;";
                const vertexSource = `
          ${prefix}
          attribute vec4 position;
          attribute vec2 uv;
          attribute vec2 uvNorm;
          ${getUniformDeclarations(miniGl.commonUniforms, "vertex")}
          ${getUniformDeclarations(uniforms, "vertex")}
          ${vertexShaders}
        `;
                const fragmentSource = `
          ${prefix}
          ${getUniformDeclarations(miniGl.commonUniforms, "fragment")}
          ${getUniformDeclarations(uniforms, "fragment")}
          ${fragments}
        `;
                material.program = context.createProgram();
                context.attachShader(material.program, getShader(context.VERTEX_SHADER, vertexSource));
                context.attachShader(material.program, getShader(context.FRAGMENT_SHADER, fragmentSource));
                context.linkProgram(material.program);
                if (!context.getProgramParameter(material.program, context.LINK_STATUS)) {
                    console.error(context.getProgramInfoLog(material.program));
                    throw new Error("Program linking error");
                }
                context.useProgram(material.program);
                material.attachUniforms(undefined, miniGl.commonUniforms);
                material.attachUniforms(undefined, material.uniforms);
            }
            attachUniforms(name, 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            uniforms) {
                if (name === undefined) {
                    Object.entries(uniforms).forEach(([uniformName, uniform]) => this.attachUniforms(uniformName, uniform));
                }
                else if (uniforms.type === "array") {
                    uniforms.value.forEach((entry, index) => this.attachUniforms(`${name}[${index}]`, entry));
                }
                else if (uniforms.type === "struct") {
                    Object.entries(uniforms.value).forEach(([fieldName, fieldUniform]) => this.attachUniforms(`${name}.${fieldName}`, fieldUniform));
                }
                else {
                    this.uniformInstances.push({
                        uniform: uniforms,
                        location: context.getUniformLocation(this.program, name),
                    });
                }
            }
        };
        this.PlaneGeometry = class PlaneGeometry {
            width = 1;
            height = 1;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            attributes;
            vertexCount = 0;
            xSegCount = 0;
            ySegCount = 0;
            constructor() {
                this.attributes = {
                    position: new miniGl.Attribute({
                        target: context.ARRAY_BUFFER,
                        size: 3,
                    }),
                    uv: new miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 2 }),
                    uvNorm: new miniGl.Attribute({
                        target: context.ARRAY_BUFFER,
                        size: 2,
                    }),
                    index: new miniGl.Attribute({
                        target: context.ELEMENT_ARRAY_BUFFER,
                        size: 3,
                        type: context.UNSIGNED_SHORT,
                    }),
                };
            }
            setTopology(xSegs = 1, ySegs = 1) {
                this.xSegCount = xSegs;
                this.ySegCount = ySegs;
                this.vertexCount = (this.xSegCount + 1) * (this.ySegCount + 1);
                const quadCount = this.xSegCount * this.ySegCount * 2;
                this.attributes.uv.values = new Float32Array(2 * this.vertexCount);
                this.attributes.uvNorm.values = new Float32Array(2 * this.vertexCount);
                this.attributes.index.values = new Uint16Array(3 * quadCount);
                for (let y = 0; y <= this.ySegCount; y++) {
                    for (let x = 0; x <= this.xSegCount; x++) {
                        const i = y * (this.xSegCount + 1) + x;
                        this.attributes.uv.values[2 * i] = x / this.xSegCount;
                        this.attributes.uv.values[2 * i + 1] = 1 - y / this.ySegCount;
                        this.attributes.uvNorm.values[2 * i] = (x / this.xSegCount) * 2 - 1;
                        this.attributes.uvNorm.values[2 * i + 1] =
                            1 - (y / this.ySegCount) * 2;
                        if (x < this.xSegCount && y < this.ySegCount) {
                            const s = y * this.xSegCount + x;
                            this.attributes.index.values[6 * s] = i;
                            this.attributes.index.values[6 * s + 1] = i + 1 + this.xSegCount;
                            this.attributes.index.values[6 * s + 2] = i + 1;
                            this.attributes.index.values[6 * s + 3] = i + 1;
                            this.attributes.index.values[6 * s + 4] = i + 1 + this.xSegCount;
                            this.attributes.index.values[6 * s + 5] = i + 2 + this.xSegCount;
                        }
                    }
                }
                this.attributes.uv.update();
                this.attributes.uvNorm.update();
                this.attributes.index.update();
            }
            setSize(width = 1, height = 1) {
                this.width = width;
                this.height = height;
                this.attributes.position.values = new Float32Array(3 * this.vertexCount);
                const offsetX = width / -2;
                const offsetY = height / -2;
                const segWidth = width / this.xSegCount;
                const segHeight = height / this.ySegCount;
                for (let y = 0; y <= this.ySegCount; y++) {
                    const posY = offsetY + y * segHeight;
                    for (let x = 0; x <= this.xSegCount; x++) {
                        const posX = offsetX + x * segWidth;
                        const idx = y * (this.xSegCount + 1) + x;
                        this.attributes.position.values[3 * idx] = posX;
                        this.attributes.position.values[3 * idx + 1] = -posY;
                        this.attributes.position.values[3 * idx + 2] = 0;
                    }
                }
                this.attributes.position.update();
            }
        };
        this.Mesh = class Mesh {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            geometry;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            material;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            attributeInstances = [];
            constructor(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            geometry, 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            material) {
                this.geometry = geometry;
                this.material = material;
                Object.entries(this.geometry.attributes).forEach(([name, attribute]) => {
                    this.attributeInstances.push({
                        attribute,
                        location: attribute.attach(name, this.material.program),
                    });
                });
                miniGl.meshes.push(this);
            }
            draw() {
                context.useProgram(this.material.program);
                this.material.uniformInstances.forEach(({ uniform, location }) => uniform.update(location));
                this.attributeInstances.forEach(({ attribute, location }) => attribute.use(location));
                context.drawElements(context.TRIANGLES, this.geometry.attributes.index.values.length, context.UNSIGNED_SHORT, 0);
            }
        };
        const identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        this.commonUniforms = {
            projectionMatrix: new this.Uniform({
                type: "mat4",
                value: identityMatrix,
            }),
            modelViewMatrix: new this.Uniform({
                type: "mat4",
                value: identityMatrix,
            }),
            resolution: new this.Uniform({ type: "vec2", value: [1, 1] }),
            aspectRatio: new this.Uniform({ type: "float", value: 1 }),
        };
    }
    setSize(w = 640, h = 480) {
        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;
        this.gl.viewport(0, 0, w, h);
        this.commonUniforms.resolution.value = [w, h];
        this.commonUniforms.aspectRatio.value = w / h;
    }
    setOrthographicCamera() {
        this.commonUniforms.projectionMatrix.value = [
            2 / this.width,
            0,
            0,
            0,
            0,
            2 / this.height,
            0,
            0,
            0,
            0,
            -0.001,
            0,
            0,
            0,
            0,
            1,
        ];
    }
    render() {
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clearDepth(1);
        this.meshes.forEach((mesh) => mesh.draw());
    }
}
class Gradient {
    canvas;
    colors;
    minigl;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mesh;
    time = 0;
    last = 0;
    animationId;
    isPlaying = false;
    resizeHandler;
    constructor(canvas, colors) {
        this.canvas = canvas;
        this.colors = colors;
        this.minigl = new MiniGl(canvas);
        this.resizeHandler = () => this.resize();
        this.mesh = this.init();
    }
    init() {
        const sectionColors = this.colors.map((hex) => normalizeColor(parseInt(hex.replace("#", "0x"), 16)));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uniforms = {
            u_time: new this.minigl.Uniform({ value: 0 }),
            u_shadow_power: new this.minigl.Uniform({ value: 5 }),
            u_darken_top: new this.minigl.Uniform({ value: 0 }),
            u_active_colors: new this.minigl.Uniform({
                value: [1, 1, 1, 1],
                type: "vec4",
            }),
            u_global: new this.minigl.Uniform({
                value: {
                    noiseFreq: new this.minigl.Uniform({
                        value: [0.00014, 0.00029],
                        type: "vec2",
                    }),
                    noiseSpeed: new this.minigl.Uniform({ value: 0.000005 }),
                },
                type: "struct",
            }),
            u_vertDeform: new this.minigl.Uniform({
                value: {
                    incline: new this.minigl.Uniform({ value: 0 }),
                    offsetTop: new this.minigl.Uniform({ value: -0.5 }),
                    offsetBottom: new this.minigl.Uniform({ value: -0.5 }),
                    noiseFreq: new this.minigl.Uniform({ value: [3, 4], type: "vec2" }),
                    noiseAmp: new this.minigl.Uniform({ value: 320 }),
                    noiseSpeed: new this.minigl.Uniform({ value: 10 }),
                    noiseFlow: new this.minigl.Uniform({ value: 3 }),
                    noiseSeed: new this.minigl.Uniform({ value: 5 }),
                },
                type: "struct",
                excludeFrom: "fragment",
            }),
            u_baseColor: new this.minigl.Uniform({
                value: sectionColors[0],
                type: "vec3",
                excludeFrom: "fragment",
            }),
            u_waveLayers: new this.minigl.Uniform({
                value: [],
                excludeFrom: "fragment",
                type: "array",
            }),
        };
        for (let i = 1; i < sectionColors.length; i++) {
            uniforms.u_waveLayers.value.push(new this.minigl.Uniform({
                value: {
                    color: new this.minigl.Uniform({
                        value: sectionColors[i],
                        type: "vec3",
                    }),
                    noiseFreq: new this.minigl.Uniform({
                        value: [
                            2 + i / sectionColors.length,
                            3 + i / sectionColors.length,
                        ],
                        type: "vec2",
                    }),
                    noiseSpeed: new this.minigl.Uniform({ value: 11 + 0.3 * i }),
                    noiseFlow: new this.minigl.Uniform({ value: 6.5 + 0.3 * i }),
                    noiseSeed: new this.minigl.Uniform({ value: 5 + 10 * i }),
                    noiseFloor: new this.minigl.Uniform({ value: 0.1 }),
                    noiseCeil: new this.minigl.Uniform({ value: 0.63 + 0.07 * i }),
                },
                type: "struct",
            }));
        }
        const vertexShader = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 blendNormal(vec3 base, vec3 blend) { return blend; }
vec3 blendNormal(vec3 base, vec3 blend, float opacity) { return (blend * opacity + base * (1.0 - opacity)); }

varying vec3 v_color;

void main() {
  float time = u_time * u_global.noiseSpeed;
  vec2 noiseCoord = resolution * uvNorm * u_global.noiseFreq;
  float tilt = resolution.y / 2.0 * uvNorm.y;
  float incline = resolution.x * uvNorm.x / 2.0 * u_vertDeform.incline;
  float offset = resolution.x / 2.0 * u_vertDeform.incline * mix(u_vertDeform.offsetBottom, u_vertDeform.offsetTop, uv.y);
  
  float noise = snoise(vec3(
    noiseCoord.x * u_vertDeform.noiseFreq.x + time * u_vertDeform.noiseFlow,
    noiseCoord.y * u_vertDeform.noiseFreq.y,
    time * u_vertDeform.noiseSpeed + u_vertDeform.noiseSeed
  )) * u_vertDeform.noiseAmp;
  
  noise *= 1.0 - pow(abs(uvNorm.y), 2.0);
  noise = max(0.0, noise);
  
  vec3 pos = vec3(position.x, position.y + tilt + incline + noise - offset, position.z);
  
  v_color = u_baseColor;
  
  for (int i = 0; i < u_waveLayers_length; i++) {
    if (u_active_colors[i + 1] == 1.) {
      WaveLayers layer = u_waveLayers[i];
      float layerNoise = smoothstep(
        layer.noiseFloor,
        layer.noiseCeil,
        snoise(vec3(
          noiseCoord.x * layer.noiseFreq.x + time * layer.noiseFlow,
          noiseCoord.y * layer.noiseFreq.y,
          time * layer.noiseSpeed + layer.noiseSeed
        )) / 2.0 + 0.5
      );
      v_color = blendNormal(v_color, layer.color, pow(layerNoise, 4.));
    }
  }
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;
        const fragmentShader = `
varying vec3 v_color;

void main() {
  vec3 color = v_color;
  if (u_darken_top == 1.0) {
    vec2 st = gl_FragCoord.xy/resolution.xy;
    color.g -= pow(st.y + sin(-12.0) * st.x, u_shadow_power) * 0.4;
  }
  gl_FragColor = vec4(color, 1.0);
}`;
        const material = new this.minigl.Material(vertexShader, fragmentShader, uniforms);
        const geometry = new this.minigl.PlaneGeometry();
        // Assign before resize(): resize() reads this.mesh.geometry
        this.mesh = new this.minigl.Mesh(geometry, material);
        this.resize();
        window.addEventListener("resize", this.resizeHandler);
        return this.mesh;
    }
    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.minigl.setSize(width, height);
        this.minigl.setOrthographicCamera();
        const xSegCount = Math.ceil(width * 0.02);
        const ySegCount = Math.ceil(height * 0.05);
        this.mesh.geometry.setTopology(xSegCount, ySegCount);
        this.mesh.geometry.setSize(width, height);
        this.mesh.material.uniforms.u_shadow_power.value = width < 600 ? 5 : 6;
    }
    animate = (timestamp) => {
        if (!this.isPlaying)
            return;
        this.time += Math.min(timestamp - this.last, 1000 / 15);
        this.last = timestamp;
        this.mesh.material.uniforms.u_time.value = this.time;
        this.minigl.render();
        this.animationId = requestAnimationFrame(this.animate);
    };
    start() {
        this.isPlaying = true;
        this.last = performance.now();
        this.animationId = requestAnimationFrame(this.animate);
    }
    stop() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener("resize", this.resizeHandler);
    }
}
function applyDeform(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vertDeform, deform) {
    if (deform.incline !== undefined)
        vertDeform.incline.value = deform.incline;
    if (deform.offsetTop !== undefined)
        vertDeform.offsetTop.value = deform.offsetTop;
    if (deform.offsetBottom !== undefined) {
        vertDeform.offsetBottom.value = deform.offsetBottom;
    }
    if (deform.noiseFreq !== undefined)
        vertDeform.noiseFreq.value = deform.noiseFreq;
    if (deform.noiseAmp !== undefined)
        vertDeform.noiseAmp.value = deform.noiseAmp;
    if (deform.noiseSpeed !== undefined)
        vertDeform.noiseSpeed.value = deform.noiseSpeed;
    if (deform.noiseFlow !== undefined)
        vertDeform.noiseFlow.value = deform.noiseFlow;
    if (deform.noiseSeed !== undefined)
        vertDeform.noiseSeed.value = deform.noiseSeed;
}
const DEFAULT_COLORS = [
    "#38bdf8",
    "#ffffff",
    "#38bdf8",
    "#ffffff",
    "#38bdf8",
    "#ffffff",
];
const DEFAULT_DEFORM = {
    incline: 0.5,
    noiseAmp: 250,
    noiseFlow: 5,
};
const DEFAULT_NOISE_FREQUENCY = [0.0001, 0.0009];
function GradientWave({ colors = DEFAULT_COLORS, isPlaying = true, className, shadowPower = 8, darkenTop = false, noiseSpeed = 0.00001, noiseFrequency = DEFAULT_NOISE_FREQUENCY, deform = DEFAULT_DEFORM, }) {
    const containerRef = (0, react_1.useRef)(null);
    const gradientRef = (0, react_1.useRef)(null);
    const colorsKey = colors.join(",");
    (0, react_1.useEffect)(() => {
        const container = containerRef.current;
        if (!container)
            return;
        let cancelled = false;
        const canvas = document.createElement("canvas");
        Object.assign(canvas.style, {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            display: "block",
        });
        container.appendChild(canvas);
        let gradient = null;
        const init = () => {
            if (cancelled)
                return;
            try {
                gradient = new Gradient(canvas, colors);
                gradientRef.current = gradient;
                gradient.mesh.material.uniforms.u_shadow_power.value = shadowPower;
                gradient.mesh.material.uniforms.u_darken_top.value = darkenTop ? 1 : 0;
                gradient.mesh.material.uniforms.u_global.value.noiseFreq.value =
                    noiseFrequency;
                gradient.mesh.material.uniforms.u_global.value.noiseSpeed.value =
                    noiseSpeed;
                applyDeform(gradient.mesh.material.uniforms.u_vertDeform.value, deform);
                gradient.start();
            }
            catch (error) {
                console.error("Failed to initialize gradient:", error);
            }
        };
        // Wait for layout so the fixed viewport container has dimensions
        const frame = requestAnimationFrame(init);
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            gradient?.stop();
            gradientRef.current = null;
            if (container.contains(canvas)) {
                container.removeChild(canvas);
            }
        };
        // colorsKey stabilizes the palette; other props are fixed per login instance
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorsKey]);
    (0, react_1.useEffect)(() => {
        const gradient = gradientRef.current;
        if (!gradient)
            return;
        if (isPlaying) {
            gradient.start();
        }
        else {
            gradient.stop();
        }
    }, [isPlaying]);
    return ((0, jsx_runtime_1.jsx)("div", { ref: containerRef, "aria-hidden": "true", className: (0, clsx_1.default)("absolute inset-0 z-0 h-full w-full overflow-hidden", className) }));
}
