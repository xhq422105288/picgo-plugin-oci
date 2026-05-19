import { S3Client } from "@aws-sdk/client-s3";
import { IImgInfo } from "picgo";
import { IOciUserConfig } from "./config";
export interface IUploadResult {
    index: number;
    key: string;
    url?: string;
    error?: Error;
}
declare function createS3Client(opts: IOciUserConfig): S3Client;
interface CreateUploadTaskOpts {
    client: S3Client;
    bucketName: string;
    path: string;
    item: IImgInfo;
    index: number;
    acl: string;
}
declare function createUploadTask(opts: CreateUploadTaskOpts): Promise<IUploadResult>;
declare const _default: {
    createS3Client: typeof createS3Client;
    createUploadTask: typeof createUploadTask;
};
export default _default;
