import * as path from 'path';
import * as glob from 'glob'

import * as ex from '@actions/exec';

import { UnixPlatform } from './unixplatform';

export class MacosPlatform extends UnixPlatform
{
    public installerName(): string {
        return "qt-unified-mac-x64-online.dmg";
    }

    public async runInstaller(tool: string, args: string[], instDir: string): Promise<void> {
		await ex.exec("hdiutil",  ["attach", tool]);
		const options: any = {};
		options.env = {
			"QT_QPA_PLATFORM": "minimal",
			"HOME": path.join(instDir, "..", 'home')
		};
		const vPath: string = glob.sync("/Volumes/qt-unified-mac-x64-*-online/qt-unified-mac-x64-*-online.app/Contents/MacOS/qt-unified-mac-x64-*-online")[0];
		await ex.exec(vPath, args, options);
    } 
}