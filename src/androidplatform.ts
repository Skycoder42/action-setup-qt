import * as path from 'path';

import * as core from '@actions/core';

import { UnixPlatform } from './unixplatform';

export class AndroidPlatform extends UnixPlatform
{
    public aqtArgs(): [string, string, string] {
        return ["linux", "android", this.platform];
    }

    public addExtraEnvVars(basePath: string): void {
        super.addExtraEnvVars(basePath);
        core.exportVariable("ANDROID_SDK_ROOT", String(process.env["ANDROID_HOME"]));
        core.exportVariable("ANDROID_NDK_ROOT", path.join(String(process.env["ANDROID_HOME"]), "ndk-bundle"));
    }
}