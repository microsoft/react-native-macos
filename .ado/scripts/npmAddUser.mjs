#!/usr/bin/env node
// @ts-check

import { exec } from "node:child_process";

/**
 * @template T
 * @param {T} arg
 * @param {string} message
 * @returns {asserts arg is NonNullable<T>}
 */
function assert(arg, message) {
  if (!arg) {
    throw new Error(message);
  }
}

const { [2]: username, [3]: password, [4]: email, [5]: registry } = process.argv;
assert(username, "Please specify username");
assert(password, "Please specify password");
assert(email, "Please specify email");

const child = exec(`npm adduser${registry ? ` --registry ${registry}` : ""}`);
assert(child.stdout, "Missing stdout on child process");

child.stdout.on("data", d => {
  assert(child.stdin, "Missing stdin on child process");

  process.stdout.write(d);
  process.stdout.write("\n");

  const data = d.toString();
  if (data.match(/username/i)) {
    child.stdin.write(username + "\n");
  } else if (data.match(/password/i)) {
    child.stdin.write(password + "\n");
  } else if (data.match(/email/i)) {
    child.stdin.write(email + "\n");
  } else if (data.match(/logged in as/i)) {
    child.stdin.end();
  }
});
