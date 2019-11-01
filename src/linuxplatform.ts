import * as os from 'os'
import { promises as fs } from 'fs';
import * as path from 'path';

import * as ex from '@actions/exec';

import { UnixPlatform } from './unixplatform';

export class LinuxPlatform extends UnixPlatform
{
    public installerName(): string {
        return `qt-unified-linux-${os.arch()}-online.run`;
    }

    public async runInstaller(tool: string, args: string[], instDir: string): Promise<void> {
		await fs.chmod(tool, 0o755);
		const options: any = {};
		options.env = {
			"QT_QPA_PLATFORM": "minimal",
			"HOME": path.join(instDir, "..", 'home')
		};
		await ex.exec(tool, args, options);
    }
}