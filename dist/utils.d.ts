import { IImgInfo } from "picgo";
import { HttpsProxyAgent, HttpProxyAgent } from "hpagent";
import { IOciUserConfig } from "./config";
declare class Generator {
    readonly date: Date;
    constructor(date?: Date);
    protected year(): string;
    protected month(): string;
    protected day(): string;
    protected hour(): string;
    protected minute(): string;
    protected second(): string;
    protected millisecond(): string;
    protected timestamp(): string;
    protected timestampMS(): string;
    format(s?: string): string;
}
export declare class FileNameGenerator extends Generator {
    readonly info: IImgInfo;
    constructor(info: IImgInfo);
    fullName(): string;
    fileName(): string;
    extName(): string;
    md5(): string;
    sha1(): string;
    sha256(): string;
    imgBuffer(): string | Buffer;
    format(s?: string): string;
}
export declare class OutputURLGenerator extends Generator {
    readonly config: IOciUserConfig;
    readonly info: IImgInfo;
    constructor(config: IOciUserConfig, info: IImgInfo);
    protocol(): string;
    bucket(): string;
    namespace(): string;
    region(): string;
    path(): string;
    fileName(): string;
    extName(): string;
    dir(): string;
    uploadedFileName(): string;
    format(): string;
}
export declare function extractInfo(info: IImgInfo): Promise<{
    body: Buffer;
    contentType?: string;
    contentEncoding?: string;
}>;
export declare function getProxyAgent(proxy: string | undefined, sslEnabled: boolean): HttpProxyAgent | HttpsProxyAgent | undefined;
export {};
