"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPluginConfig = getPluginConfig;
exports.loadUserConfig = loadUserConfig;
function mergePluginConfig(userConfig) {
    return [
        {
            name: "accessKeyID",
            type: "input",
            default: userConfig.accessKeyID,
            required: true,
            message: "OCI Customer Secret Key ID",
            alias: "Access Key ID",
        },
        {
            name: "secretAccessKey",
            type: "password",
            default: userConfig.secretAccessKey,
            required: true,
            message: "OCI Customer Secret Key",
            alias: "Secret Access Key",
        },
        {
            name: "namespace",
            type: "input",
            default: userConfig.namespace,
            required: true,
            message: "OCI Object Storage Namespace\n(OCI Console > Tenancy > Object Storage Settings)",
            alias: "Namespace",
        },
        {
            name: "region",
            type: "input",
            default: userConfig.region,
            required: true,
            message: "OCI Region (e.g. us-ashburn-1, eu-frankfurt-1, ap-singapore-1)",
            alias: "Region",
        },
        {
            name: "bucketName",
            type: "input",
            default: userConfig.bucketName,
            required: true,
            message: "OCI Object Storage Bucket Name",
            alias: "Bucket Name",
        },
        {
            name: "uploadPath",
            type: "input",
            default: userConfig.uploadPath || "{year}/{month}/{md5}.{extName}",
            required: true,
            message: "Upload path template\nAvailable: {year} {month} {day} {fullName} {fileName} {extName} {md5} {sha1} {sha256}",
            alias: "Upload Path",
        },
        {
            name: "endpoint",
            type: "input",
            default: userConfig.endpoint,
            required: false,
            message: "Custom endpoint (leave empty to auto-build from namespace + region)",
            alias: "Endpoint",
        },
        {
            name: "proxy",
            type: "input",
            default: userConfig.proxy,
            required: false,
            message: "HTTP Proxy (e.g. http://127.0.0.1:1080)",
            alias: "Proxy",
        },
        {
            name: "acl",
            type: "input",
            default: userConfig.acl || "public-read",
            required: false,
            message: "Canned ACL (private, public-read, public-read-write, authenticated-read)",
            alias: "ACL",
        },
        {
            name: "outputURLPattern",
            type: "input",
            default: userConfig.outputURLPattern || "",
            required: false,
            message: "Custom output URL (e.g. https://cdn.example.com/{path})\nAvailable: {namespace} {region} {bucket} {path} {fileName} {extName}",
            alias: "Output URL Pattern",
        },
    ];
}
function getPluginConfig(ctx) {
    const defaults = {
        accessKeyID: "",
        secretAccessKey: "",
        namespace: "",
        region: "",
        bucketName: "",
        uploadPath: "{year}/{month}/{md5}.{extName}",
        acl: "public-read",
    };
    const userConfig = Object.assign(Object.assign({}, defaults), (ctx.getConfig("picBed.oci") || {}));
    return mergePluginConfig(userConfig);
}
function loadUserConfig(ctx) {
    const userConfig = ctx.getConfig("picBed.oci");
    if (!userConfig) {
        throw new Error("OCI config not found. Please run: picgo set uploader oci");
    }
    if (!userConfig.accessKeyID || !userConfig.secretAccessKey) {
        throw new Error("OCI accessKeyID and secretAccessKey are required");
    }
    if (!userConfig.namespace || !userConfig.region || !userConfig.bucketName) {
        throw new Error("OCI namespace, region, and bucketName are required");
    }
    return {
        accessKeyID: userConfig.accessKeyID,
        secretAccessKey: userConfig.secretAccessKey,
        namespace: userConfig.namespace,
        region: userConfig.region,
        bucketName: userConfig.bucketName,
        uploadPath: userConfig.uploadPath || "{year}/{month}/{md5}.{extName}",
        endpoint: userConfig.endpoint || `https://${userConfig.namespace}.compat.objectstorage.${userConfig.region}.oraclecloud.com`,
        proxy: userConfig.proxy,
        acl: userConfig.acl || "public-read",
        outputURLPattern: userConfig.outputURLPattern,
    };
}
