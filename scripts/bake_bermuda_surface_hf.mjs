import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const [inputPath, kind, yawText = "0", out = ".local/bermuda_surface_bake"] =
  process.argv.slice(2);
if (!inputPath || !/^[a-z_]+$/.test(kind))
  throw Error(
    "Usage: node scripts/bake_bermuda_surface_hf.mjs INPUT_GLB KIND YAW OUTPUT_DIR",
  );
const relative = path.relative(process.cwd(), path.resolve(inputPath));
if (relative.startsWith("..") || path.isAbsolute(relative))
  throw Error("Input must remain inside the local repository");
const yaw = Number(yawText);
if (!Number.isFinite(yaw)) throw Error("Invalid yaw");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
try {
  const page = await browser.newPage();
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188");
  const result = await page.evaluate(
    async ({ input, yaw }) => {
      const T = await import("/node_modules/.vite/deps/three.js"),
        { GLTFLoader } = await import(
          "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"
        );
      const model = (await new GLTFLoader().loadAsync(input)).scene;
      model.rotation.y = yaw;
      const box = new T.Box3().setFromObject(model),
        center = box.getCenter(new T.Vector3()),
        size = box.getSize(new T.Vector3()),
        scene = new T.Scene();
      scene.add(model);
      model.position.sub(center);
      model.updateMatrixWorld(true);
      const renderer = new T.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true,
      });
      renderer.setSize(1024, 1024);
      renderer.setClearColor(0, 0);
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.NoToneMapping;
      const extent = Math.min(size.x, size.y) * 0.84,
        camera = new T.OrthographicCamera(
          -extent / 2,
          extent / 2,
          extent / 2,
          -extent / 2,
          0.001,
          10,
        );
      camera.position.set(0, 0, 3);
      camera.lookAt(0, 0, 0);
      const originals = new Map();
      model.traverse((o) => {
        if (o.isMesh) originals.set(o, o.material);
      });
      const bake = {
        bounds: box.min.toArray().concat(box.max.toArray()),
        size: size.toArray(),
        cropExtent: extent,
        render(mode) {
          for (const [o, m] of originals) {
            if (mode === "color")
              o.material = new T.MeshBasicMaterial({
                map: m.map,
                color: m.color,
                side: T.DoubleSide,
              });
            else
              o.material = new T.ShaderMaterial({
                side: T.DoubleSide,
                uniforms: {
                  minZ: { value: -size.z / 2 },
                  span: { value: size.z },
                },
                vertexShader:
                  "varying float h; void main(){vec4 p=modelMatrix*vec4(position,1.); h=p.z; gl_Position=projectionMatrix*viewMatrix*p;}",
                fragmentShader:
                  "varying float h; uniform float minZ; uniform float span; void main(){float v=clamp((h-minZ)/span,0.,1.);gl_FragColor=vec4(vec3(v),1.);}",
              });
          }
          renderer.outputColorSpace =
            mode === "color" ? T.SRGBColorSpace : T.LinearSRGBColorSpace;
          renderer.render(scene, camera);
          const data = renderer.domElement.toDataURL("image/png");
          for (const [o, m] of originals) {
            o.material.dispose();
            o.material = m;
          }
          return data;
        },
      };
      return {
        color: bake.render("color"),
        height: bake.render("height"),
        bounds: bake.bounds,
        size: bake.size,
        cropExtent: bake.cropExtent,
      };
    },
    { input: "/" + relative, yaw },
  );
  for (const channel of ["color", "height"]) {
    await writeFile(
      `${out}/${kind}_${channel}.png`,
      Buffer.from(result[channel].split(",")[1], "base64"),
    );
    delete result[channel];
  }
  await writeFile(
    `${out}/${kind}_bake.json`,
    JSON.stringify({ input: relative, kind, yaw, ...result }, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
