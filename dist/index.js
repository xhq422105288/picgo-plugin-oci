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
    const tasks = output.map((item, idx) => {
        item.uploadDate = new Date();
        const fileNameGenerator = new utils_1.FileNameGenerator(item);
        return uploader_1.default.createUploadTask({
            client,
            index: idx,
            bucketName: userConfig.bucketName,
            path: fileNameGenerator.format(userConfig.uploadPath),
            item,
            acl: userConfig.acl || "public-read",
        });
    });
    let results;
    try {
        results = await Promise.all(tasks);
    }
    catch (err) {
        ctx.log.error("Upload to OCI Object Storage failed, please check your network and configuration");
        throw err;
    }
    for (const result of results) {
        const { index, url, key, error } = result;
        delete output[index].buffer;
        delete output[index].base64Image;
        output[index].uploadPath = key;
        if (error) {
            output[index].error = error;
        }
        else {
            output[index].url = url;
            output[index].imgUrl = url;
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
        const msg = `OCI Plugin: ${errList.length} of ${ctx.output.length + errList.length} uploads failed.`;
        for (const item of errList) {
            ctx.log.error(`Item ${item.fileName}:`, (_a = item.error) === null || _a === void 0 ? void 0 : _a.message);
        }
        ctx.emit("notification", {
            title: "OCI Upload Error",
            body: msg + " Failed: " + errList.map((item) => item.fileName).join(", "),
        });
        if (ctx.output.length > 0) {
            ctx.log.error(msg);
        }
        else {
            throw new Error(msg);
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
            config,
        });
    };
    return {
        register,
        uploader: pluginName,
    };
};
