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
class Generator {
    constructor(date) {
        this.date = date || new Date();
    }
    year() {
        return this.date.getFullYear().toString();
    }
    month() {
        return (this.date.getMonth() + 1).toString().padStart(2, "0");
    }
    day() {
        return this.date.getDate().toString().padStart(2, "0");
    }
    hour() {
        return this.date.getHours().toString().padStart(2, "0");
    }
    minute() {
        return this.date.getMinutes().toString().padStart(2, "0");
    }
    second() {
        return this.date.getSeconds().toString().padStart(2, "0");
    }
    millisecond() {
        return this.date.getMilliseconds().toString().padStart(3, "0");
    }
    timestamp() {
        return Math.floor(this.date.getTime() / 1000).toString();
    }
    timestampMS() {
        return this.date.getTime().toString();
    }
    format(s) {
        if (!s)
            return "";
        const formatters = {
            year: () => this.year(),
            month: () => this.month(),
            day: () => this.day(),
            hour: () => this.hour(),
            minute: () => this.minute(),
            second: () => this.second(),
            millisecond: () => this.millisecond(),
            timestamp: () => this.timestamp(),
            timestampMS: () => this.timestampMS(),
        };
        return Object.entries(formatters).reduce((result, [key, formatter]) => result.replace(new RegExp(`{${key}}`, "g"), formatter()), s);
    }
}
class FileNameGenerator extends Generator {
    constructor(info) {
        super(info.uploadDate);
        this.info = info;
    }
    fullName() {
        return this.info.fileName || "";
    }
    fileName() {
        if (!this.info.fileName)
            return "";
        const ext = this.info.extname || "";
        return this.info.fileName.replace(new RegExp(`${ext}$`), "");
    }
    extName() {
        return (this.info.extname || "").replace(".", "");
    }
    md5() {
        return crypto_1.default.createHash("md5").update(this.imgBuffer()).digest("hex");
    }
    sha1() {
        return crypto_1.default.createHash("sha1").update(this.imgBuffer()).digest("hex");
    }
    sha256() {
        return crypto_1.default.createHash("sha256").update(this.imgBuffer()).digest("hex");
    }
    imgBuffer() {
        return this.info.base64Image || this.info.buffer || "";
    }
    format(s) {
        if (!s)
            return this.fullName();
        const formatters = {
            fullName: () => this.fullName(),
            fileName: () => this.fileName(),
            extName: () => this.extName(),
            md5: () => this.md5(),
            sha1: () => this.sha1(),
            sha256: () => this.sha256(),
        };
        return Object.entries(formatters).reduce((result, [key, formatter]) => {
            const rangePattern = new RegExp(`{${key}:(\\d+),(\\d+)}`, "g");
            const truncatePattern = new RegExp(`{${key}:(\\d+)}`, "g");
            const simplePattern = new RegExp(`{${key}}`, "g");
            result = result.replace(rangePattern, (_match, start, length) => {
                const value = formatter();
                return value.substring(parseInt(start, 10), parseInt(start, 10) + parseInt(length, 10));
            });
            result = result.replace(truncatePattern, (_match, length) => {
                return formatter().substring(0, parseInt(length, 10));
            });
            result = result.replace(simplePattern, formatter());
            return result;
        }, super.format(s));
    }
}
exports.FileNameGenerator = FileNameGenerator;
class OutputURLGenerator extends Generator {
    constructor(config, info) {
        super(info.uploadDate);
        this.config = config;
        this.info = info;
    }
    protocol() {
        return "https";
    }
    bucket() {
        return this.config.bucketName;
    }
    namespace() {
        return this.config.namespace;
    }
    region() {
        return this.config.region;
    }
    path() {
        return this.info.uploadPath || "";
    }
    fileName() {
        return this.info.fileName || path_1.default.basename(this.path());
    }
    extName() {
        if (this.info.extname) {
            return this.info.extname.replace(/^./, "");
        }
        return path_1.default.extname(this.path()).replace(/^./, "");
    }
    dir() {
        return path_1.default.dirname(this.path());
    }
    uploadedFileName() {
        return path_1.default.basename(this.path());
    }
    format() {
        if (this.config.outputURLPattern) {
            const formatters = {
                protocol: () => this.protocol(),
                bucket: () => this.bucket(),
                namespace: () => this.namespace(),
                region: () => this.region(),
                path: () => this.path(),
                dir: () => this.dir(),
                fileName: () => this.fileName(),
                uploadedFileName: () => this.uploadedFileName(),
                extName: () => this.extName(),
            };
            return Object.entries(formatters).reduce((result, [key, formatter]) => result.replace(new RegExp(`{${key}}`, "g"), formatter()), super.format(this.config.outputURLPattern));
        }
        const endpoint = this.config.endpoint || `https://${this.config.namespace}.compat.objectstorage.${this.config.region}.oraclecloud.com`;
        return `${endpoint}/${this.config.bucketName}/${this.path()}`;
    }
}
exports.OutputURLGenerator = OutputURLGenerator;
async function extractInfo(info) {
    var _a;
    const result = { body: Buffer.alloc(0) };
    if (info.base64Image) {
        const body = info.base64Image.replace(/^data:[/\w]+;base64,/, "");
        result.contentType = (_a = info.base64Image.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)) === null || _a === void 0 ? void 0 : _a[0];
        result.body = Buffer.from(body, "base64");
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
        const { protocol, hostname, port } = new URL(url);
        return `${protocol}//${hostname.replace("127.0.0.1", "localhost")}:${port}`;
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
