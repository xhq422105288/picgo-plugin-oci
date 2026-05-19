"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const uploader_1 = __importDefault(require("./uploader"));
const utils_1 = require("./utils");
const config_1 = require("./config");
const pluginName = "oci";
const upload = async (ctx) => {
    const userConfig = (0, config_1.loadUserConfig)(ctx);
    const client = uploader_1.default.createS3Client(userConfig);
    const output = ctx.output;
    const endpoint = userConfig.endpoint;
    const bucketName = userConfig.bucketName;
    const tasks = output.map((item, idx) => {
        item.uploadDate = new Date();
        const fileNameGenerator = new utils_1.FileNameGenerator(item);
        return uploader_1.default.createUploadTask({
            client,
            index: idx,
            bucketName,
            path: fileNameGenerator.format(userConfig.uploadPath),
            item,
            acl: userConfig.acl || "public-read",
        });
    });
    const results = await Promise.all(tasks.map(async (task, idx) => {
        try {
            return await task;
        }
        catch (err) {
            return {
                index: idx,
                key: "",
                error: err instanceof Error ? err : new Error(String(err)),
            };
        }
    }));
    for (const result of results) {
        const { index, key, error } = result;
        const item = output[index];
        item.type = pluginName;
        item.uploadPath = key;
        delete item.buffer;
        delete item.base64Image;
        if (error) {
            item.error = error;
            ctx.log.error(`[OCI] Upload failed for "${item.fileName}": ${error.message}`);
        }
        else {
            const url = `${endpoint}/${bucketName}/${key}`;
            item.url = url;
            item.imgUrl = url;
        }
    }
    return ctx;
};
const afterUploadPlugins = (ctx) => {
    var _a;
    const userConfig = (0, config_1.loadUserConfig)(ctx);
    const errList = [];
    ctx.output = ctx.output.reduce((acc, item) => {
        if (item.type !== pluginName && item.type !== undefined) {
            return [...acc, item];
        }
        if (item.error || (!item.imgUrl && !item.url)) {
            errList.push(item);
            return acc;
        }
        const urlGenerator = new utils_1.OutputURLGenerator(userConfig, item);
        const url = urlGenerator.format();
        return [
            ...acc,
            Object.assign(Object.assign({}, item), { imgUrl: url, url }),
        ];
    }, []);
    if (errList.length > 0) {
        const total = ctx.output.length + errList.length;
        const details = errList.map((i) => { var _a; return `[${i.fileName}] ${((_a = i.error) === null || _a === void 0 ? void 0 : _a.message) || "unknown error"}`; });
        ctx.emit("notification", {
            title: "OCI Upload Error",
            body: `${errList.length}/${total} failed\n${details.join("\n")}`,
        });
        for (const item of errList) {
            ctx.log.error(`[OCI] ${item.fileName}: ${(_a = item.error) === null || _a === void 0 ? void 0 : _a.message}`);
        }
        if (ctx.output.length === 0) {
            throw new Error(`OCI: ${errList.length}/${total} uploads failed`);
        }
    }
};
const config = (ctx) => {
    return (0, config_1.getPluginConfig)(ctx);
};
module.exports = (ctx) => {
    const register = () => {
        ctx.helper.uploader.register(pluginName, {
            handle: upload,
            config,
            name: "OCI Object Storage",
        });
        ctx.helper.afterUploadPlugins.register(pluginName, {
            handle: afterUploadPlugins,
        });
    };
    return {
        register,
        uploader: pluginName,
    };
};
