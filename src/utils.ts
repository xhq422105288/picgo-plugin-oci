import crypto from "crypto"
import path from "path"
import { fromBuffer } from "file-type"
import mime from "mime"
import { IImgInfo } from "picgo"
import { HttpsProxyAgent, HttpProxyAgent } from "hpagent"
import { IOciUserConfig } from "./config"

export class FileNameGenerator {
  readonly info: IImgInfo
  readonly date: Date

  constructor(info: IImgInfo) {
    this.info = info
    this.date = info.uploadDate || new Date()
  }

  private formatDate(format: string): string {
    const map: Record<string, string> = {
      year: this.date.getFullYear().toString(),
      month: (this.date.getMonth() + 1).toString().padStart(2, "0"),
      day: this.date.getDate().toString().padStart(2, "0"),
      hour: this.date.getHours().toString().padStart(2, "0"),
      minute: this.date.getMinutes().toString().padStart(2, "0"),
      second: this.date.getSeconds().toString().padStart(2, "0"),
      millisecond: this.date.getMilliseconds().toString().padStart(3, "0"),
      timestamp: Math.floor(this.date.getTime() / 1000).toString(),
      timestampMS: this.date.getTime().toString(),
    }
    return Object.entries(map).reduce(
      (r, [k, v]) => r.replace(new RegExp(`{${k}}`, "g"), v),
      format,
    )
  }

  public format(template?: string): string {
    if (!template) return this.info.fileName || ""

    const fileName = this.info.fileName || ""
    const extName = (this.info.extname || "").replace(".", "")
    const nameWithoutExt = extName
      ? fileName.replace(new RegExp(`${this.info.extname}$`), "")
      : fileName
    const buffer = this.info.base64Image || this.info.buffer || ""

    const generateHash = (alg: string) =>
      crypto.createHash(alg).update(buffer).digest("hex")

    const map: Record<string, string> = {
      fullName: fileName,
      fileName: nameWithoutExt,
      extName,
      md5: generateHash("md5"),
      sha1: generateHash("sha1"),
      sha256: generateHash("sha256"),
    }

    let result = this.formatDate(template)
    for (const [key, value] of Object.entries(map)) {
      result = result.replace(new RegExp(`{${key}}`, "g"), value)
    }
    return result
  }
}

export class OutputURLGenerator {
  readonly config: IOciUserConfig
  readonly info: IImgInfo

  constructor(config: IOciUserConfig, info: IImgInfo) {
    this.config = config
    this.info = info
  }

  public format(): string {
    const pattern = this.config.outputURLPattern
    if (pattern) {
      let result = pattern
      const map: Record<string, string> = {
        namespace: this.config.namespace,
        region: this.config.region,
        bucket: this.config.bucketName,
        path: this.info.uploadPath || "",
        fileName: this.info.fileName || path.basename(this.info.uploadPath || ""),
        extName: (this.info.extname || path.extname(this.info.uploadPath || "")).replace(".", ""),
      }
      for (const [key, value] of Object.entries(map)) {
        result = result.replace(new RegExp(`{${key}}`, "g"), value)
      }
      return result
    }

    const endpoint = this.config.endpoint ||
      `https://${this.config.namespace}.compat.objectstorage.${this.config.region}.oraclecloud.com`
    return `${endpoint}/${this.config.bucketName}/${this.info.uploadPath || ""}`
  }
}

export async function extractInfo(info: IImgInfo): Promise<{
  body: Buffer
  contentType?: string
  contentEncoding?: string
}> {
  const result: {
    body: Buffer
    contentType?: string
    contentEncoding?: string
  } = { body: Buffer.alloc(0) }

  if (info.base64Image) {
    const b64 = info.base64Image.replace(/^data:[/\w]+;base64,/, "")
    result.contentType = info.base64Image.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0]
    result.body = Buffer.from(b64, "base64")
    result.contentEncoding = "base64"
  } else if (info.buffer) {
    if (info.extname) {
      result.contentType = mime.getType(info.extname) || undefined
    }
    result.body = info.buffer
  }

  if (!result.contentType) {
    const fileType = await fromBuffer(result.body)
    result.contentType = fileType?.mime
  }

  return result
}

function formatHttpProxyURL(url = ""): string {
  if (!url) return ""
  if (!/^https?:\/\//.test(url)) {
    const [host, port] = url.split(":")
    return `http://${host.replace("127.0.0.1", "localhost")}:${port}`
  }
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname.replace("127.0.0.1", "localhost")}:${u.port || "80"}`
  } catch {
    return ""
  }
}

export function getProxyAgent(
  proxy: string | undefined,
  sslEnabled: boolean,
): HttpProxyAgent | HttpsProxyAgent | undefined {
  const formatted = formatHttpProxyURL(proxy)
  if (!formatted) return undefined
  const options = {
    keepAlive: true,
    keepAliveMsecs: 1000,
    scheduling: "lifo" as const,
    proxy: formatted,
  }
  return sslEnabled
    ? new HttpsProxyAgent(options)
    : new HttpProxyAgent(options)
}
