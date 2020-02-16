import VersionNumber from "./versionnumber";

export interface XmlPackageUpdate {
    Name: string;
    Version: string;
    Dependencies: string;
    DownloadableArchives: string;
    SHA1: string;
}

export interface XmlUpdate {
    Checksum: boolean;
    PackageUpdate: XmlPackageUpdate[];
}

export interface XmlRoot {
    Updates: XmlUpdate;
}