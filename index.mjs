#!/usr/bin/env zx
/// <reference path="/usr/local/lib/node_modules/zx/src/globals.d.ts" />
/**
 * Setup:
 * Create .env with CLOCKIFY_API_KEY
 */
require("dotenv").config({ path: `${__dirname}/.env` });
import inquirer from "inquirer";
import { DateTime } from "luxon";

$.verbose = false;

const baseUrl = "https://api.clockify.me/api/v1";
const apiKey = process.env.CLOCKIFY_API_KEY;

const workspaces = JSON.parse(
  (
    await $`curl -H "content-type: application/json" -H "X-Api-Key: ${apiKey}" -X GET ${baseUrl}/workspaces`
  ).stdout
);

const { workspaceName } = await inquirer.prompt({
  type: "list",
  name: "workspaceName",
  message: "Please choose a workspace",
  choices: workspaces.map(({ name }) => name),
});

const workspaceId = workspaces.find((item) => item.name === workspaceName)?.id;
if (!workspaceId) {
  throw new Error("Invalid workspace");
}

const { id: userId } = JSON.parse(
  (
    await $`curl -H "content-type: application/json" -H "X-Api-Key: ${apiKey}" -X GET ${baseUrl}/user`
  ).stdout
);

const time = DateTime.local().minus({ day: 1 });
const start = time.startOf("day").toUTC().toISO();
const end = time.endOf("day").toUTC().toISO();

const entries = JSON.parse(
  (
    await $`curl -G -H "X-Api-Key: ${apiKey}" -X GET ${baseUrl}/workspaces/${workspaceId}/user/${userId}/time-entries -d start=${start} -d end=${end} -d hydrated=1 -d in-progress=0 -d page-size=5`
  ).stdout
);

const processedEntries = entries
  .filter(({ billable }) => billable)
  .filter(({ description }) => description !== "General")
  .filter(({ tags }) => tags.every(({ name }) => name !== "Meeting"));

console.log(
  Array.from(
    new Set(processedEntries.map(({ description }) => description))
  ).join("\n")
);
