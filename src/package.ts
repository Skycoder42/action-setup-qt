import { XmlPackageUpdate } from "./updates-xml";

export default class Package {
    private _xmlData: XmlPackageUpdate;

    public constructor(data: XmlPackageUpdate) {
        this._xmlData = data;
    }

    public get name(): string {
        return this._xmlData.Name;
    }

    public get archives(): string[] {
        return this._xmlData.DownloadableArchives
            .split(',')
            .map(d => d.trim());
    }

    public dependencies(platform: string): string[] {
        return this._xmlData.Dependencies
            .split(',')
            .map(d => d.trim())
            .filter(d => d.includes(platform));
    }

    public dlPath(archive: string): string {
        return this._xmlData.Name + '/' + this._xmlData.Version + archive;
    }

    public shaPath(archive: string): string {
        return this.dlPath(archive + ".sha1");
    }
}