export interface XmlPackageUpdate {
    Name: string;
    Version: string;
    Dependencies: string | undefined;
    DownloadableArchives: string | undefined;
    SHA1: string;
}

export interface XmlUpdate {
    Checksum: boolean;
    PackageUpdate: XmlPackageUpdate | XmlPackageUpdate[] | undefined;
}

export interface XmlRoot {
    Updates: XmlUpdate;
}