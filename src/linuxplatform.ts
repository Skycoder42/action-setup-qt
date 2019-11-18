import * as ex from '@actions/exec';

import { UnixPlatform } from './unixplatform';

export class LinuxPlatform extends UnixPlatform
{
    public async runPreInstaller(_cacheHit: boolean): Promise<void> {
        await ex.exec("sudo", ["apt-get", "-qq", "install", "libgl1-mesa-dev", "doxygen", "doxyqml"]);
    }

    public aqtArgs(): [string, string, string] {
        return ["linux", "desktop", this.platform];
    }
}