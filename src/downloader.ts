import https from "https";
import crypto from "crypto";
import fs from "fs";
import { URL } from "url";

import xml from "fast-xml-parser";

import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";

import VersionNumber from "./versionnumber";
import { XmlRoot } from "./updates-xml";
import Package from "./package";

class Downloader
{
    private readonly _version: VersionNumber;
    private readonly _platform: string;
    private readonly _host: string;

    private _packages: Map<string, Package>;
    private _downloads: string[];

    public constructor(os: string, arch: string, version: VersionNumber, platform: string)
    {
        this._version = version;
        this._platform = platform;
        this._host = os + '_' + arch;
        this._packages = new Map<string, Package>();
        this._downloads = ["__default"];
    }

    public async addQtSource(): Promise<void> {
        await this.addSource(new URL("https://download.qt.io/online/qtsdkrepository/"), true);
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
        const filtered = update.Updates.PackageUpdate
            .filter(x => x.Name.endsWith("." + this._platform));
        core.debug(`Downloaded ${filtered.length} valid module configurations from ${url}`);
        filtered.reduce((map, x) => map.set(this.stripPackageName(x.Name), new Package(x, sourceUrl)), this._packages);
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
        
        for (const dep of pkg.dependencies(this._platform)) {
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

    public async download(): Promise<string[]> {
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

        core.debug(`Completed download of ${result.length} packages`);
        return result;
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
        if (name == `qt.qt5.${this._version.toString("")}.${this._platform}`)
            return "__default";
        else {
            const match = name.match(`^qt\\.qt5\\.${this._version.toString("")}\\.(.+)\\.${this._platform}$`);
            return match ? match[1] : name;
        }
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
};

export default Downloader;