"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputURLGenerator = exports.FileNameGenerator = void 0;
exports.extractInfo = extractInfo;
exports.getProxyAgent = getProxyAgent;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const file_type_1 = require("file-type");
const mime_1 = __importDefault(require("mime"));
const hpagent_1 = require("hpagent");
class FileNameGenerator {
    constructor(info) {
        this.info = info;
        this.date = info.uploadDate || new Date();
    }
    formatDate(format) {
        const map = {
            year: this.date.getFullYear().toString(),
            month: (this.date.getMonth() + 1).toString().padStart(2, "0"),
            day: this.date.getDate().toString().padStart(2, "0"),
            hour: this.date.getHours().toString().padStart(2, "0"),
            minute: this.date.getMinutes().toString().padStart(2, "0"),
            second: this.date.getSeconds().toString().padStart(2, "0"),
            millisecond: this.date.getMilliseconds().toString().padStart(3, "0"),
            timestamp: Math.floor(this.date.getTime() / 1000).toString(),
            timestampMS: this.date.getTime().toString(),
        };
        return Object.entries(map).reduce((r, [k, v]) => r.replace(new RegExp(`{${k}}`, "g"), v), format);
    }
    format(template) {
        if (!template)
            return this.info.fileName || "";
        const fileName = this.info.fileName || "";
        const extName = (this.info.extname || "").replace(".", "");
        const nameWithoutExt = extName
            ? fileName.replace(new RegExp(`${this.info.extname}$`), "")
            : fileName;
        const buffer = this.info.base64Image || this.info.buffer || "";
        const generateHash = (alg) => crypto_1.default.createHash(alg).update(buffer).digest("hex");
        const map = {
            fullName: fileName,
            fileName: nameWithoutExt,
            extName,
            md5: generateHash("md5"),
            sha1: generateHash("sha1"),
            sha256: generateHash("sha256"),
        };
        let result = this.formatDate(template);
        for (const [key, value] of Object.entries(map)) {
            result = result.replace(new RegExp(`{${key}}`, "g"), value);
        }
        return result;
    }
}
exports.FileNameGenerator = FileNameGenerator;
class OutputURLGenerator {
    constructor(config, info) {
        this.config = config;
        this.info = info;
    }
    format() {
        const pattern = this.config.outputURLPattern;
        if (pattern) {
            let result = pattern;
            const map = {
                namespace: this.config.namespace,
                region: this.config.region,
                bucket: this.config.bucketName,
                path: this.info.uploadPath || "",
                fileName: this.info.fileName || path_1.default.basename(this.info.uploadPath || ""),
                extName: (this.info.extname || path_1.default.extname(this.info.uploadPath || "")).replace(".", ""),
            };
            for (const [key, value] of Object.entries(map)) {
                result = result.replace(new RegExp(`{${key}}`, "g"), value);
            }
            return result;
        }
        const endpoint = this.config.endpoint ||
            `https://${this.config.namespace}.compat.objectstorage.${this.config.region}.oraclecloud.com`;
        return `${endpoint}/${this.config.bucketName}/${this.info.uploadPath || ""}`;
    }
}
exports.OutputURLGenerator = OutputURLGenerator;
async function extractInfo(info) {
    var _a;
    const result = { body: Buffer.alloc(0) };
    if (info.base64Image) {
        const b64 = info.base64Image.replace(/^data:[/\w]+;base64,/, "");
        result.contentType = (_a = info.base64Image.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)) === null || _a === void 0 ? void 0 : _a[0];
        result.body = Buffer.from(b64, "base64");
        result.contentEncoding = "base64";
    }
    else if (info.buffer) {
        if (info.extname) {
            result.contentType = mime_1.default.getType(info.extname) || undefined;
        }
        result.body = info.buffer;
    }
    if (!result.contentType) {
        const fileType = await (0, file_type_1.fromBuffer)(result.body);
        result.contentType = fileType === null || fileType === void 0 ? void 0 : fileType.mime;
    }
    return result;
}
function formatHttpProxyURL(url = "") {
    if (!url)
        return "";
    if (!/^https?:\/\//.test(url)) {
        const [host, port] = url.split(":");
        return `http://${host.replace("127.0.0.1", "localhost")}:${port}`;
    }
    try {
        const u = new URL(url);
        return `${u.protocol}//${u.hostname.replace("127.0.0.1", "localhost")}:${u.port || "80"}`;
    }
    catch (_a) {
        return "";
    }
}
function getProxyAgent(proxy, sslEnabled) {
    const formatted = formatHttpProxyURL(proxy);
    if (!formatted)
        return undefined;
    const options = {
        keepAlive: true,
        keepAliveMsecs: 1000,
        scheduling: "lifo",
        proxy: formatted,
    };
    return sslEnabled
        ? new hpagent_1.HttpsProxyAgent(options)
        : new hpagent_1.HttpProxyAgent(options);
}
