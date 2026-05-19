"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const node_http_handler_1 = require("@smithy/node-http-handler");
const utils_1 = require("./utils");
function createS3Client(opts) {
    let sslEnabled = true;
    if (opts.endpoint) {
        try {
            const u = new URL(opts.endpoint);
            sslEnabled = u.protocol === "https:";
        }
        catch (_) {
            sslEnabled = true;
        }
    }
    const httpHandlerOpts = {};
    const proxyAgent = (0, utils_1.getProxyAgent)(opts.proxy, sslEnabled);
    if (sslEnabled) {
        httpHandlerOpts.httpsAgent = proxyAgent;
    }
    else {
        httpHandlerOpts.httpAgent = proxyAgent;
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
    let body;
    let contentType;
    let contentEncoding;
    try {
        ({ body, contentType, contentEncoding } = await (0, utils_1.extractInfo)(opts.item));
    }
    catch (err) {
        result.error = new Error(`Failed to extract "${opts.item.fileName}" image info: ${err instanceof Error ? err.message : String(err)}`);
        return result;
    }
    const acl = opts.acl;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: opts.bucketName,
        Key: opts.path,
        ACL: acl,
        Body: body,
        ContentType: contentType,
        ContentEncoding: contentEncoding || undefined,
    });
    try {
        await opts.client.send(command);
        result.url = `https://${opts.bucketName}.${opts.path}`;
    }
    catch (err) {
        result.error = new Error(`Failed to upload "${opts.item.fileName}" to OCI: ${err instanceof Error ? err.message : String(err)}`);
    }
    return result;
}
exports.default = {
    createS3Client,
    createUploadTask,
};
