// The render plan. One job = one frame capture; every output derived from those frames hangs off it, so
// each animation is captured once per (art, background, size) and encoded many ways.
import { join } from "node:path";
import { REPO_ROOT } from "./capture.mjs";

const MOTION = join(REPO_ROOT, "assets", "motion");
export const DIRS = {
  video: join(MOTION, "video"),
  alpha: join(MOTION, "alpha"),
  gif: join(MOTION, "gif"),
  webp: join(MOTION, "webp"),
  poster: join(MOTION, "poster"),
  masters: join(REPO_ROOT, "dist", "motion-masters"),
};

const ARTS = ["dark", "light"];
const FPS = 60;
const MASTER_FPS = 30;

/* Stage runtimes: showcase durations (4.5 s, 3.6 s, 3.4 s) plus a 0.5 s hold on the end frame where one exists. */
const STAGE_MS = { ignition: 5000, formation: 4100, dispersal: 3400 };
/* Loader loop periods. L4 is FILL_MS + FILL_HOLD_MS (2800 + 900) in the showcase. */
const LOADER_MS = { circuit: 2400, rotor: 1200, handshake: 3000, progress: 3700 };

const HD = { width: 1920, height: 1080 };
const LOADER_SIZE = { width: 512, height: 512 };
const SQUARE = { width: 1080, height: 1080 };
const VERTICAL = { width: 1080, height: 1920 };

const GIF_STAGE_WIDTH = 480;
const GIF_STAGE_FPS = 30;
const GIF_LOADER_WIDTH = 320;
const GIF_LOADER_FPS = 20;
const WEBP_STAGE_WIDTH = 640;
const WEBP_LOADER_WIDTH = 256;
const WEBP_FPS = 30;
const WEBP_QUALITY = 75;

const frameCount = (ms, fps) => Math.round((ms / 1000) * fps);
const dims = (j) => `${j.width * j.dsf}x${j.height * j.dsf}`;
const stem = (j, size = dims(j)) => `ixean-${j.label}-on-${j.art}-${size}`;
const scaled = (j, width) => `${width}x${Math.round((width * j.height) / j.width)}`;

function job(label, key, kind, art, mode, size, extra) {
  const dsf = extra.dsf ?? 1;
  const fps = extra.fps ?? FPS;
  const ms = kind === "stage" ? STAGE_MS[key] : LOADER_MS[key];
  const base = { label, key, kind, art, mode, ...size, dsf, fps, frames: frameCount(ms, fps) };
  return { ...base, id: `${stem(base)}-${mode}-${fps}`, outputs: extra.outputs(base) };
}

function stageJobs(key) {
  const jobs = [];
  for (const art of ARTS) {
    const name = (j, ext, fps = j.fps) => `${stem(j)}-${fps}.${ext}`;
    const solid = key === "ignition"
      ? (j) => [
        { type: "mp4", file: join(DIRS.video, name(j, "mp4")) },
        { type: "poster", frame: "last", file: join(DIRS.poster, `${stem(j)}.png`) },
        { type: "gif", width: GIF_STAGE_WIDTH, outFps: GIF_STAGE_FPS, file: join(DIRS.gif, `${stem(j, scaled(j, GIF_STAGE_WIDTH))}-${GIF_STAGE_FPS}.gif`) },
      ]
      : (j) => [
        { type: "mp4", file: join(DIRS.video, name(j, "mp4")) },
        { type: "poster", frame: "last", file: join(DIRS.poster, `${stem(j)}.png`) },
      ];
    const alpha = (j) => [
      { type: "webm", file: join(DIRS.alpha, name(j, "webm")) },
      { type: "prores", step: FPS / MASTER_FPS, file: join(DIRS.masters, name(j, "mov", MASTER_FPS)) },
      ...(key === "ignition"
        ? [{ type: "webp", width: WEBP_STAGE_WIDTH, outFps: WEBP_FPS, quality: WEBP_QUALITY, file: join(DIRS.webp, `${stem(j, scaled(j, WEBP_STAGE_WIDTH))}-${WEBP_FPS}.webp`) }]
        : []),
    ];
    jobs.push(job(key, key, "stage", art, "solid", HD, { outputs: solid }));
    jobs.push(job(key, key, "stage", art, "alpha", HD, { outputs: alpha }));
  }
  return jobs;
}

/* Ignition only: social aspect ratios (logo already sits inside the 5% safe area) and the 4K masters. */
function ignitionExtraJobs() {
  const jobs = [];
  for (const art of ARTS) {
    for (const size of [SQUARE, VERTICAL]) {
      jobs.push(job("ignition", "ignition", "stage", art, "solid", size, {
        outputs: (j) => [
          { type: "mp4", file: join(DIRS.video, `${stem(j)}-${j.fps}.mp4`) },
          { type: "poster", frame: "last", file: join(DIRS.poster, `${stem(j)}.png`) },
        ],
      }));
    }
    jobs.push(job("ignition", "ignition", "stage", art, "solid", HD, {
      dsf: 2,
      outputs: (j) => [{ type: "mp4", file: join(DIRS.masters, `${stem(j)}-${j.fps}.mp4`) }],
    }));
    jobs.push(job("ignition", "ignition", "stage", art, "alpha", HD, {
      dsf: 2,
      fps: MASTER_FPS,
      outputs: (j) => [
        { type: "prores", step: 1, file: join(DIRS.masters, `${stem(j)}-${j.fps}.mov`) },
        ...(art === "dark" ? [{ type: "pngzip", prefix: stem(j), file: join(DIRS.masters, `${stem(j)}-${j.fps}-png-sequence.zip`) }] : []),
      ],
    }));
  }
  return jobs;
}

function loaderJobs(key) {
  const label = `loader-${key}`;
  const jobs = [];
  for (const art of ARTS) {
    jobs.push(job(label, key, "loader", art, "solid", LOADER_SIZE, {
      outputs: (j) => [
        { type: "mp4", file: join(DIRS.video, `${stem(j)}-${j.fps}.mp4`) },
        { type: "poster", frame: "first", file: join(DIRS.poster, `${stem(j)}.png`) },
        { type: "gif", width: GIF_LOADER_WIDTH, outFps: GIF_LOADER_FPS, file: join(DIRS.gif, `${stem(j, scaled(j, GIF_LOADER_WIDTH))}-${GIF_LOADER_FPS}.gif`) },
      ],
    }));
    jobs.push(job(label, key, "loader", art, "alpha", LOADER_SIZE, {
      outputs: (j) => [
        { type: "webm", file: join(DIRS.alpha, `${stem(j)}-${j.fps}.webm`) },
        { type: "webp", width: WEBP_LOADER_WIDTH, outFps: WEBP_FPS, quality: WEBP_QUALITY, file: join(DIRS.webp, `${stem(j, scaled(j, WEBP_LOADER_WIDTH))}-${WEBP_FPS}.webp`) },
      ],
    }));
  }
  return jobs;
}

export function buildPlan() {
  return [
    ...Object.keys(STAGE_MS).flatMap(stageJobs),
    ...ignitionExtraJobs(),
    ...Object.keys(LOADER_MS).flatMap(loaderJobs),
  ];
}
