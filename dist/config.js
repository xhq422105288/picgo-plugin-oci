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
            message: "OCI Object Storage Namespace (find in OCI Console: Tenancy > Object Storage Settings)",
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
            message: "Bucket Name",
            alias: "Bucket Name",
        },
        {
            name: "uploadPath",
            type: "input",
            default: userConfig.uploadPath,
            required: true,
            message: "Upload path template (e.g. {year}/{month}/{md5}.{extName})",
            alias: "Upload Path",
        },
        {
            name: "endpoint",
            type: "input",
            default: userConfig.endpoint,
            required: false,
            message: "Custom endpoint (leave empty to auto-construct from namespace and region)",
            alias: "Endpoint",
        },
        {
            name: "proxy",
            type: "input",
            default: userConfig.proxy,
            required: false,
            message: "Proxy URL (e.g. http://127.0.0.1:1080)",
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
            message: "Custom output URL template (optional)",
            alias: "Output URL Pattern",
        },
    ];
}
function getPluginConfig(ctx) {
    const defaultConfig = {
        accessKeyID: "",
        secretAccessKey: "",
        namespace: "",
        region: "",
        bucketName: "",
        uploadPath: "{year}/{month}/{md5}.{extName}",
        acl: "public-read",
    };
    let userConfig = ctx.getConfig("picBed.oci");
    if (!userConfig) {
        userConfig = Object.assign({}, defaultConfig);
    }
    else {
        userConfig = Object.assign(Object.assign({}, defaultConfig), userConfig);
    }
    return mergePluginConfig(userConfig);
}
function loadUserConfig(ctx) {
    const userConfig = ctx.getConfig("picBed.oci");
    if (!userConfig) {
        throw new Error("Cannot find OCI Object Storage uploader config");
    }
    if (!userConfig.endpoint) {
        userConfig.endpoint = `https://${userConfig.namespace}.compat.objectstorage.${userConfig.region}.oraclecloud.com`;
    }
    userConfig.acl = userConfig.acl || "public-read";
    userConfig.uploadPath = userConfig.uploadPath || "{year}/{month}/{md5}.{extName}";
    return userConfig;
}
