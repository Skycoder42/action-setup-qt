import { getInput, error, setFailed } from "@actions/core";

import Installer from "./installer";
import { getParam, Options } from "./options";

async function run() {
  try {
    const installer = new Installer(
      getParam(Options.Version, true),
      getParam(Options.Platform, true)
    );
    await installer.getQt(
      getParam(Options.Packages, false),
      getParam(Options.DeepSources, false),
      getParam(Options.FlatSources, false),
      getParam(Options.Clean, false)
    );
  } catch (e) {
    console.error(e);
    error(e.message);
    setFailed(e.message);
  }
}

run();
