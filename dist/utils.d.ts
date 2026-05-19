import { IImgInfo } from "picgo";
import { HttpsProxyAgent, HttpProxyAgent } from "hpagent";
import { IOciUserConfig } from "./config";
export declare class FileNameGenerator {
    readonly info: IImgInfo;
    readonly date: Date;
    constructor(info: IImgInfo);
    private formatDate;
    format(template?: string): string;
}
export declare class OutputURLGenerator {
    readonly config: IOciUserConfig;
    readonly info: IImgInfo;
    constructor(config: IOciUserConfig, info: IImgInfo);
    format(): string;
}
export declare function extractInfo(info: IImgInfo): Promise<{
    body: Buffer;
    contentType?: string;
    contentEncoding?: string;
}>;
export declare function getProxyAgent(proxy: string | undefined, sslEnabled: boolean): HttpProxyAgent | HttpsProxyAgent | undefined;
