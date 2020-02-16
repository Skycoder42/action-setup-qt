import https from "https";
import crypto from "crypto";
import fs, { read } from "fs";

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
    private readonly _target: string;

    private _packages: Map<string, Package> | null = null;
    private _downloads: string[];

    public constructor(os: string, arch: string, version: VersionNumber, platform: string)
    {
        this._version = version;
        this._platform = platform;
        this._target = [
            os + '_' + arch,
            Downloader.getDevSystem(platform),
            Downloader.getVersionPath(platform, version)
        ].join('/');
        this._packages = new Map<string, Package>();
        this._downloads = [];
    }

    public async initialize() : Promise<void> {
        core.debug(`Downloading Updates.xml for target ${this._target}`);
        const reply = await this.get(this.downloadUrl("Updates.xml"), "text/xml");
        const update: XmlRoot = xml.parse(reply);
        this._packages = update.Updates.PackageUpdate
            .filter(x => x.Version.startsWith(this._version.toString()))
            .filter(x => x.Name.endsWith("." + this._platform))
            .reduce((map, x) => map.set(this.stripPackageName(x.Name), new Package(x)), new Map<string, Package>());
        this._downloads = ["__default"];
        core.debug(`Downloaded ${this._packages.size} module configurations`);
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
                const sha1sum = await this.get(this.downloadUrl(pkg.shaPath(archive)));
                const archivePath = await tc.downloadTool(this.downloadUrl(pkg.dlPath(archive), false));
                if (!await this.verifyHashsum(archivePath, sha1sum))
                    throw new Error(`Invalid sha1sum for archive ${archive}`);
                result.push(archivePath);
            }
        }

        core.debug(`Completed download of ${result.length} packages`);
        return result;
    }

    private static getDevSystem(platform: string): string {
        if (platform.includes("android"))
            return "android";
        else if (platform.includes("winrt"))
            return "winrt";   
        else if (platform.includes("ios"))
            return "ios"; 
        else
            return "desktop";
    }

    private static getVersionPath(platform: string, version: VersionNumber) {
        const basePath = "qt5_" + version.toString("");
        if (platform.includes("wasm"))
            return basePath + "_wasm";
        else
            return basePath;
    }

    private stripPackageName(name: string): string {
        if (name == `qt.qt5.${this._version.toString("")}.${this._platform}`)
            return "__default";
        else {
            const match = name.match(`qt\\.qt5\\.${this._version.toString("")}\\.(\\w+)\\.${this._platform}`);
            return match ? match[1] : name;
        }
    }

    private downloadUrl(path: string, https: boolean = true): string {
        return `${https ? "https" : "http"}://download.qt.io/online/qtsdkrepository/${this._target}/${path}`;
    }

    private async get(url: string, contentType: string | null = null) : Promise<string> {
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