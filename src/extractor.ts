import util from "util";
import path from "path";
import fs from "fs";

import * as core from "@actions/core";
import * as io from "@actions/io";
import * as ex from "@actions/exec";

import VersionNumber from "./versionnumber";

export default class Extractor {
    private readonly _path: string;
    private readonly _version: VersionNumber;
    private readonly _platform: string;

    public constructor(path: string, version: VersionNumber, platform: string) {
        this._path = path;
        this._version = version;
        this._platform = platform;
        core.debug(`Installting Qt at path: ${this._path}`);
    }

    public async extractAll(archives: string[]): Promise<void> {
        core.info(`Extracting archives to ${this._path}...`);
        for (const archive of archives)
            await this.extract(archive);
        await this.writeConfigs();
    }

    private async writeConfigs(): Promise<void> {
        core.info("Writing configuration files...");
        const writeFile = util.promisify(fs.writeFile);
        const appendFile = util.promisify(fs.appendFile);
        // write qt.conf
        core.debug("Writing bin/qt.conf...");
        await writeFile(path.join(this.fullPath(), "bin", "qt.conf"), "[Paths]\nPrefix=..\n", "utf-8");
        // update qconfig.pri
        core.debug("Writing mkspecs/qconfig.pri...");
        await appendFile(path.join(this.fullPath(), "mkspecs", "qconfig.pri"), "QT_EDITION = OpenSource\nQT_LICHECK = \n", "utf-8");
    }

    private async extract(archive: string): Promise<void> {
        await io.mkdirP(this._path);
        const szPath = await io.which("7z");
        core.debug(`Extracting archive ${path.basename(archive)}...`);
        await ex.exec(szPath, ['x', '-bb1', '-bd', '-y', '-sccUTF-8', archive], {
            cwd: this._path,
            silent: true
        });
    }

    private fullPath(): string {
        return path.join(this._path, this._version.toString(), this._platform);
    }
}