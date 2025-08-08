#!/usr/bin/env node
// @ts-check

import * as fs from "node:fs";
import { get } from "node:http";

const REGISTRY_URL = process.argv[2] || "http://localhost:4873";
const TIMEOUT_MS = Number(process.env.VERDACCIO_WAIT_TIMEOUT_MS || 60_000);
const POLL_MS = Number(process.env.VERDACCIO_WAIT_POLL_MS || 1_000);

// Construct a ping URL that's supported by Verdaccio
const pingUrl = new URL(REGISTRY_URL);
// Ensure we hit the ping endpoint regardless of trailing slash
pingUrl.pathname = (pingUrl.pathname?.replace(/\/*$/, "") || "") + "/-/ping";

const deadline = Date.now() + TIMEOUT_MS;

function dumpLogs() {
  try {
    // Verdaccio config logs to .ado/verdaccio/verdaccio.log
    const logUrl = new URL("../verdaccio/verdaccio.log", import.meta.url);
    const logFile = fs.readFileSync(logUrl, { encoding: "utf-8" });
    console.log("\n--- Verdaccio log ---\n" + logFile + "\n--- end log ---\n");
  } catch {
    console.log("No Verdaccio log output yet.");
  }
}

function check() {
  if (Date.now() > deadline) {
    console.error(`Timed out waiting for Verdaccio at ${pingUrl.href}`);
    dumpLogs();
    process.exit(1);
  }

  get(pingUrl, res => {
    if (res.statusCode === 200) {
      console.log("Verdaccio is ready: " + pingUrl.href);
      process.exit(0);
    } else {
      console.log(`Verdaccio status: ${res.statusCode}; retrying in ${POLL_MS}ms`);
      setTimeout(check, POLL_MS);
    }
  }).on("error", err => {
    console.log(`Verdaccio not ready (${err.message}); retrying in ${POLL_MS}ms`);
    setTimeout(check, POLL_MS);
  });
}

console.log(`Waiting for Verdaccio to respond at ${pingUrl.href} (timeout ${TIMEOUT_MS}ms)...`);
check();
