#!/usr/bin/env node
// @ts-check

import * as fs from "node:fs";
import { get } from "node:http";

/**
 * @param {string} npmRegistryUrl
 */
function queryForServerStatus(npmRegistryUrl) {
  get(npmRegistryUrl, res => {
    console.log(`Verdaccio server status: ${res.statusCode}`);
    if (res.statusCode != 200) {
      setTimeout(queryForServerStatus, 2000);
    }
  }).on("error", err => {
    console.log(err.message);
    const logUrl = new URL("../verdaccio/console.log", import.meta.url);
    try {
      const logFile = fs.readFileSync(logUrl, { encoding: "utf-8" });
      console.log("Verdaccio console output: " + logFile);
    } catch (error) {
      console.log("No Verdaccio console output yet.");
    }
    setTimeout(queryForServerStatus, 2000);
  });
}

console.log("Waiting for Verdaccio instance to respond...");

queryForServerStatus(process.argv[2]);
