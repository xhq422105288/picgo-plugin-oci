"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const node_http_handler_1 = require("@smithy/node-http-handler");
const utils_1 = require("./utils");
function createS3Client(opts) {
    let sslEnabled = true;
    if (opts.endpoint) {
        try {
            sslEnabled = new URL(opts.endpoint).protocol === "https:";
        }
        catch (_a) {
            sslEnabled = true;
        }
    }
    const httpHandlerOpts = {};
    const proxyAgent = (0, utils_1.getProxyAgent)(opts.proxy, sslEnabled);
    if (proxyAgent) {
        if (sslEnabled) {
            httpHandlerOpts.httpsAgent = proxyAgent;
        }
        else {
            httpHandlerOpts.httpAgent = proxyAgent;
        }
    }
    const clientOptions = {
        region: opts.region,
        endpoint: opts.endpoint,
        credentials: {
            accessKeyId: opts.accessKeyID,
            secretAccessKey: opts.secretAccessKey,
        },
        tls: sslEnabled,
        forcePathStyle: true,
        requestHandler: new node_http_handler_1.NodeHttpHandler(httpHandlerOpts),
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    };
    return new client_s3_1.S3Client(clientOptions);
}
async function createUploadTask(opts) {
    const result = {
        index: opts.index,
        key: opts.path,
    };
    if (!opts.item.buffer && !opts.item.base64Image) {
        result.error = new Error(`"${opts.item.fileName}" No image data provided`);
        return result;
    }
    try {
        const { body, contentType, contentEncoding } = await (0, utils_1.extractInfo)(opts.item);
        const command = new client_s3_1.PutObjectCommand({
            Bucket: opts.bucketName,
            Key: opts.path,
            ACL: opts.acl,
            Body: body,
            ContentType: contentType,
            ContentEncoding: contentEncoding || undefined,
        });
        await opts.client.send(command);
    }
    catch (err) {
        result.error = err instanceof Error
            ? err
            : new Error(`Upload failed: ${String(err)}`);
    }
    return result;
}
exports.default = {
    createS3Client,
    createUploadTask,
};
