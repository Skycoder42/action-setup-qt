import { join } from 'path';

import { exportVariable } from '@actions/core';

import LinuxPlatform from './linuxplatform';

export default class AndroidPlatform extends LinuxPlatform {
    public addExtraEnvVars(basePath: string): void {
        super.addExtraEnvVars(basePath);
        exportVariable("ANDROID_SDK_ROOT", process.env["ANDROID_HOME"]!);
        exportVariable("ANDROID_NDK_ROOT", join(process.env["ANDROID_HOME"]!, "ndk-bundle"));
    }
}
