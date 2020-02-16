export default class VersionNumber {
    private _segments: number[];
    public get segments() : number[] {
        return this._segments;
    }
    public set segments(v : number[]) {
        this._segments = v;
    }

    public get length() : number {
        return this._segments.length;
    }

    public get major(): number {
        return this._segments.length > 0 ? this._segments[0] : 0;
    }
    public set major(v: number) {
        this._segments = [v, ...this._segments.slice(1)];
    }
     
    public get minor(): number {
        return this._segments.length > 1 ? this._segments[1] : 0;
    }
    public set minor(v: number) {
        this._segments = [...this._segments.slice(0, 1), v, ...this._segments.slice(2)];
    }

    public get patch(): number {
        return this._segments.length > 2 ? this._segments[2] : 0;
    }
    public set patch(v: number) {
        this._segments = [...this._segments.slice(0, 2), v, ...this._segments.slice(3)];
    }
    
    public constructor(...segments: number[]) {
        this._segments = [...segments];
    }

    public toString(seperator: string = '.'): string {
        return this._segments.join(seperator)
    }

    public static fromString(vString: string, seperator: string = '.'): VersionNumber {
        return new VersionNumber(...vString.split(seperator).map(s => Number(s)));
    }
}