// Usage: node render.mjs [--only name[,name]] [--concurrency N] [--keep-frames]
// Captures every planned animation frame by frame, then encodes the delivery formats. See README.md.
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { REPO_ROOT, captureSequence, frameName, launchBrowser } from "./lib/capture.mjs";
import { encodeGif, encodeMp4, encodeProres, encodeWebmAlpha, encodeWebp, optimizePng, zipSequence } from "./lib/encode.mjs";
import { buildPlan } from "./lib/jobs.mjs";

const DEFAULT_CONCURRENCY = 4;
const FRAME_ROOT = join(tmpdir(), "ixean-motion-frames");

const { values: opts } = parseArgs({
  options: {
    only: { type: "string" },
    concurrency: { type: "string", default: String(DEFAULT_CONCURRENCY) },
    "keep-frames": { type: "boolean", default: false },
  },
});

const rel = (p) => relative(REPO_ROOT, p).replaceAll("\\", "/");
const mb = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`;

function selectJobs(plan, only) {
  if (!only) return plan;
  const names = new Set(only.split(",").map((n) => n.trim()));
  const picked = plan.filter((j) => names.has(j.label) || names.has(j.key));
  if (picked.length === 0) {
    const known = [...new Set(plan.map((j) => j.label))].join(", ");
    throw new Error(`--only matched nothing: ${only}. Known names: ${known}`);
  }
  return picked;
}

function encodeOutput(job, dir, output) {
  switch (output.type) {
    case "mp4": return encodeMp4(dir, job.fps, output.file);
    case "webm": return encodeWebmAlpha(dir, job.fps, output.file);
    case "prores": return encodeProres(dir, job.fps, output.file, { step: output.step });
    case "gif": return encodeGif(dir, job.fps, output.file, output);
    case "webp": return encodeWebp(dir, job.fps, output.file, output);
    case "poster": return optimizePng(join(dir, frameName(output.frame === "last" ? job.frames - 1 : 0)), output.file);
    case "pngzip": return zipSequence(dir, output.prefix, output.file);
    default: throw new Error(`unknown output type ${output.type}`);
  }
}

async function runJob(browser, job) {
  const dir = join(FRAME_ROOT, job.id);
  const started = Date.now();
  await rm(dir, { recursive: true, force: true });
  const spec = { kind: job.kind, anim: job.key, art: job.art, mode: job.mode, width: job.width, height: job.height, dsf: job.dsf, fps: job.fps };
  await captureSequence(browser, spec, dir, job.frames);
  console.log(`captured ${job.id}: ${job.frames} frames in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  try {
    for (const output of job.outputs) {
      await mkdir(dirname(output.file), { recursive: true });
      await encodeOutput(job, dir, output);
      console.log(`  ${rel(output.file)}  ${mb((await stat(output.file)).size)}`);
    }
  } finally {
    if (!opts["keep-frames"]) await rm(dir, { recursive: true, force: true });
  }
}

async function runPool(browser, jobs, concurrency) {
  const queue = [...jobs];
  const failures = [];
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try { await runJob(browser, job); } catch (err) { failures.push({ id: job.id, err }); console.error(`FAILED ${job.id}\n${err.stack}`); }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return failures;
}

const jobs = selectJobs(buildPlan(), opts.only);
const concurrency = Number.parseInt(opts.concurrency, 10);
if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error(`--concurrency must be a positive integer, got ${opts.concurrency}`);
const browser = await launchBrowser();
try {
  const failures = await runPool(browser, jobs, concurrency);
  console.log(`${jobs.length - failures.length}/${jobs.length} jobs ok`);
  if (failures.length > 0) process.exitCode = 1;
} finally {
  await browser.close();
}
