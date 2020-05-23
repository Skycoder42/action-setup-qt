import { exec } from '@actions/exec';

import UnixPlatform from './unixplatform';

export default class LinuxPlatform extends UnixPlatform {
    public async runPreInstall(): Promise<void> {
        await super.runPreInstall();
        await exec("sudo", ["apt-get", "-qq", "update"]);
        await exec("sudo", ["apt-get", "-qq", "install", "libgl1-mesa-dev", "libxkbcommon-x11-0", "doxygen", "doxyqml"]);
    }
}
