import { getInput, error, setFailed } from "@actions/core";

import Installer from "./installer";
import { getParam, Options } from "./options";

async function run() {
  try {
    const installer = new Installer(
      getParam(Options.Version),
      getParam(Options.Platform)
    );
    await installer.getQt(
      getParam(Options.Packages),
      getParam(Options.DeepSources),
      getParam(Options.FlatSources),
      getParam(Options.Clean)
    );
  } catch (e) {
    console.error(e);
    error(e.message);
    setFailed(e.message);
  }
}

run();
