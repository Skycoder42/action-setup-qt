import { error, setFailed } from "@actions/core";

import Installer from "./installer";
import { loadConfig } from "./config";

async function run() {
  try {
    const installer = new Installer(loadConfig());
    await installer.post();
  } catch (e) {
    console.error(e);
    error(e.message);
    setFailed(e.message);
  }
}

run();
