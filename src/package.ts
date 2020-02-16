import { URL } from "url";
import { XmlPackageUpdate } from "./updates-xml";

export default class Package {
    private _xmlData: XmlPackageUpdate;
    
    private _url : URL;
    public get url() : URL {
        return this._url;
    }
    public set url(v : URL) {
        this._url = v;
    }    

    public constructor(data: XmlPackageUpdate, baseUrl: URL) {
        this._xmlData = data;
        this._url = baseUrl;
    }

    public get name(): string {
        return this._xmlData.Name;
    }

    public get archives(): string[] {
        if (!this._xmlData.DownloadableArchives)
            return [];
        else {
            return this._xmlData.DownloadableArchives
                .split(',')
                .map(d => d.trim());
        }
    }

    public dependencies(platform: string): string[] {
        if (!this._xmlData.Dependencies)
            return [];
        else {
            return this._xmlData.Dependencies
                .split(',')
                .map(d => d.trim())
                .filter(d => d.includes(platform));
        }
    }

    public dlPath(archive: string): string {
        return this._xmlData.Name + '/' + this._xmlData.Version + archive;
    }

    public shaPath(archive: string): string {
        return this.dlPath(archive + ".sha1");
    }
}