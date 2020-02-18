import crypto from "crypto";
import fs from "fs";
import https from "https";
import path from "path";
import { URL } from "url";
import util from "util";

import xml from "fast-xml-parser";

import * as core from "@actions/core";
import * as io from "@actions/io";
import * as ex from "@actions/exec";
import * as tc from "@actions/tool-cache";

import VersionNumber from "./versionnumber";
import { XmlRoot, XmlPackageUpdate } from "./updates-xml";
import Package from "./package";

class Downloader
{
    private readonly _version: VersionNumber;
    private readonly _platform: string;
    private readonly _pkgPlatform: string;
    private readonly _host: string;

    private _packages: Map<string, Package>;
    private _downloads: string[];

    public constructor(os: string, arch: string, version: VersionNumber, platform: string, instPlatform: string)
    {
        this._version = version;
        this._platform = platform;
        this._pkgPlatform = instPlatform;
        this._host = os + '_' + arch;
        this._packages = new Map<string, Package>();
        this._downloads = ["__default"];
    }

    public async addQtSource(): Promise<void> {
        const qtUrl = new URL("https://download.qt.io/online/qtsdkrepository/");
        // standard source
        await this.addSource(qtUrl, true);
        // add tool sources
        await this.addToolSource(qtUrl, "qtcreator");
        await this.addToolSource(qtUrl, "qtcreator_preview");
        await this.addToolSource(qtUrl, "openssl_x64");
        await this.addToolSource(qtUrl, "openssl_x86");
        await this.addToolSource(qtUrl, "openssl_src");
        await this.addToolSource(qtUrl, "ninja");
        await this.addToolSource(qtUrl, "maintenance");
        await this.addToolSource(qtUrl, "ifw");
        await this.addToolSource(qtUrl, "generic");
        await this.addToolSource(qtUrl, "cmake");
        await this.addToolSource(qtUrl, "vcredist");
        await this.addToolSource(qtUrl, "mingw");
    }

    public async addSource(url: URL, deep: boolean): Promise<void> {
        const subPath = [this._host];
        if (deep) {
            subPath.push(this.getTarget());
            subPath.push(this.getVersionPath());
        } else
            subPath.push("qt" + this._version.toString(""));

        const sourceUrl = new URL(subPath.join('/') + '/', url);
        core.debug(`Downloading Updates.xml for subPath ${subPath} from ${url}`);
        const reply = await this.get(new URL("Updates.xml", sourceUrl), "text/xml");
        const update: XmlRoot = xml.parse(reply);

        if (typeof update.Updates.PackageUpdate == 'undefined')
            return;
        if (!Array.isArray(update.Updates.PackageUpdate)) 
            update.Updates.PackageUpdate = [update.Updates.PackageUpdate];
        const filtered = update.Updates.PackageUpdate
            ?.filter(x => x.Name.endsWith("." + this._pkgPlatform));
        core.debug(`Downloaded ${filtered?.length} valid module configurations from ${url}`);
        filtered?.reduce((map, x) => map.set(this.stripPackageName(x.Name), new Package(x, sourceUrl)), this._packages);
    }

    public async addToolSource(url: URL, type: string): Promise<boolean> {
        try {
            const subPath = [
                this._host,
                "desktop",
                "tools_" + type
            ];
    
            const sourceUrl = new URL(subPath.join('/') + '/', url);
            core.debug(`Downloading Updates.xml for subPath ${subPath} from ${url}`);
            const reply = await this.get(new URL("Updates.xml", sourceUrl), "text/xml");
            const update: XmlRoot = xml.parse(reply);
            if (typeof update.Updates.PackageUpdate == 'undefined')
                return true;
            if (!Array.isArray(update.Updates.PackageUpdate)) 
                update.Updates.PackageUpdate = [update.Updates.PackageUpdate];
            core.debug(`Downloaded ${update.Updates.PackageUpdate?.length} valid module configurations from ${url}`);
            update.Updates.PackageUpdate?.reduce((map, x) => map.set(this.stripPackageName(x.Name), new Package(x, sourceUrl)), this._packages);
            return true;
        } catch (error) {
            core.warning(`Failed to get tool sources for tool type "${type}" with error: ${error.message}`);
            return false;
        }
    }

    public modules(): string[] {
        if (!this._packages)
            throw new Error("Must call initialize before accessing any other members of Downloader");
        return Array.from(this._packages.keys());
    }

    public addDownload(name: string, required: boolean = true): boolean {
        const pkg = this._packages?.get(name);
        if (!pkg) {
            if (required)
                throw new Error(`Unable to download required Qt package "${name}"`);
            else {
                core.info(`Skipping optional module ${name} because it was not found in the module list`);
                return false;
            }
        }
        
        for (const dep of pkg.dependencies(this._pkgPlatform)) {
            if (!this.addDownload(this.stripPackageName(dep), required)) {
                core.info(`Skipping optional module ${name} because at least one of its dependencies was not found`);
                return false;
            }
        }

        if (!this._downloads.includes(name)) {
            this._downloads.push(name);
            core.info(`Added module ${name} to be installed`);
        } else 
            core.debug(`Module ${name} has already been added`);
        return true;
    }

    public async installTo(basePath: string): Promise<void> {
        const archives = await this.download();

        core.info(`Extracting archives to ${basePath}...`);
        for (const archive of archives)
            await this.extract(basePath, archive);
        await this.writeConfigs(basePath);
    }

    private getTarget(): string {
        if (this._platform.includes("android"))
            return "android";
        else if (this._platform.includes("winrt"))
            return "winrt";   
        else if (this._platform.includes("ios"))
            return "ios"; 
        else
            return "desktop";
    }

    private getVersionPath() {
        const basePath = "qt5_" + this._version.toString("");
        if (this._platform.includes("wasm"))
            return basePath + "_wasm";
        else
            return basePath;
    }

    private stripPackageName(name: string): string {
        if (name == `qt.qt5.${this._version.toString("")}.${this._pkgPlatform}`)
            return "__default";
        else {
            const match = name.match(`^qt\\.qt5\\.${this._version.toString("")}\\.(.+)\\.${this._pkgPlatform}$`);
            return match ? match[1] : name;
        }
    }

    private async download(): Promise<string[]> {
        const result: string[] = [];

        core.info(`Downloading install archives for ${this._downloads.length} modules...`);
        for (const name of this._downloads) {
            const pkg = this._packages?.get(name);
            if (!pkg)
                throw new Error(`Unable to download required Qt package "${name}"`);
            
            for (const archive of pkg.archives) {
                const sha1sum = await this.get(new URL(pkg.shaPath(archive), pkg.url));
                const archiveUrl = new URL(pkg.dlPath(archive), pkg.url);
                archiveUrl.protocol = "http";
                const archivePath = await tc.downloadTool(archiveUrl.toString());
                if (!await this.verifyHashsum(archivePath, sha1sum))
                    throw new Error(`Invalid sha1sum for archive ${archive}`);
                result.push(archivePath);
            }
        }

        core.debug(`Completed download of ${result.length} archives`);
        return result;
    }

    private async verifyHashsum(path: string, sha1sum: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            try {
                const hasher = crypto.createHash('sha1');
                const stream = fs.createReadStream(path);
                stream.on('error', e => reject(e));
                stream.on('data', chunk => hasher.update(chunk));
                stream.on('end', () => resolve(hasher.digest('hex').toLowerCase() == sha1sum));
            } catch(error) {
                reject(error);
            }
        });
    }

    private async extract(basePath: string, archive: string): Promise<void> {
        await io.mkdirP(basePath);
        const szPath = await io.which("7z", true);
        core.debug(`Extracting archive ${path.basename(archive)}...`);
        await ex.exec(szPath, ['x', '-bb1', '-bd', '-y', '-sccUTF-8', archive], {
            cwd: basePath,
            silent: true
        });
    }

    private async writeConfigs(basePath: string): Promise<void> {
        core.info("Writing configuration files...");
        const writeFile = util.promisify(fs.writeFile);
        const appendFile = util.promisify(fs.appendFile);

        const fullPath = path.join(basePath, this._version.toString(), this._platform);
        // write qt.conf
        core.debug("Writing bin/qt.conf...");
        await writeFile(path.join(fullPath, "bin", "qt.conf"), "[Paths]\nPrefix=..\n", "utf-8");
        // update qconfig.pri
        core.debug("Writing mkspecs/qconfig.pri...");
        await appendFile(path.join(fullPath, "mkspecs", "qconfig.pri"), "QT_EDITION = OpenSource\nQT_LICHECK = \n", "utf-8");
    }

    private async get(url: URL, contentType: string | null = null) : Promise<string> {
        core.debug(`Requesting GET ${url}`);
        return new Promise<string>((resolve, reject) => {
            https.get(url, res => {
                try {
                    if (!res.statusCode || res.statusCode >= 300)
                        throw new Error(`Request failed with status code ${res.statusCode}`);
                    if (contentType && res.headers['content-type'] != contentType)
                        throw new Error(`Request failed with invalid content type "${res.headers['content-type']}"`);
                    
                    res.setEncoding("utf-8");
                    let rawData: string = '';
                    res.on('error', e => reject(e));
                    res.on('data', (chunk) => { rawData += chunk; });
                    res.on('end', () => resolve(rawData));
                } catch (error) {
                    res.resume();
                    reject(error);
                }
            });
        });
    }
};

export default Downloader;