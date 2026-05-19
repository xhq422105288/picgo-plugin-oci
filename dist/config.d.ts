import { IPicGo, IPluginConfig } from "picgo";
export interface IOciUserConfig {
    accessKeyID: string;
    secretAccessKey: string;
    namespace: string;
    region: string;
    bucketName: string;
    uploadPath: string;
    endpoint?: string;
    proxy?: string;
    acl?: string;
    outputURLPattern?: string;
}
export declare function getPluginConfig(ctx: IPicGo): IPluginConfig[];
export declare function loadUserConfig(ctx: IPicGo): IOciUserConfig;
