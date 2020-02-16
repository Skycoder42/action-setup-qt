import path from 'path';

import * as core from '@actions/core';

import LinuxPlatform from './linuxplatform';

export default class AndroidPlatform extends LinuxPlatform {
    public addExtraEnvVars(basePath: string): void {
        super.addExtraEnvVars(basePath);
        core.exportVariable("ANDROID_SDK_ROOT", process.env["ANDROID_HOME"]!);
        core.exportVariable("ANDROID_NDK_ROOT", path.join(process.env["ANDROID_HOME"]!, "ndk-bundle"));
    }
}
