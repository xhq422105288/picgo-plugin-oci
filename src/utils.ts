import crypto from "crypto"
import path from "path"
import { fromBuffer } from "file-type"
import mime from "mime"
import { IImgInfo } from "picgo"
import { HttpsProxyAgent, HttpProxyAgent } from "hpagent"
import { IOciUserConfig } from "./config"

class Generator {
  readonly date: Date

  constructor(date?: Date) {
    this.date = date || new Date()
  }

  protected year(): string {
    return this.date.getFullYear().toString()
  }

  protected month(): string {
    return (this.date.getMonth() + 1).toString().padStart(2, "0")
  }

  protected day(): string {
    return this.date.getDate().toString().padStart(2, "0")
  }

  protected hour(): string {
    return this.date.getHours().toString().padStart(2, "0")
  }

  protected minute(): string {
    return this.date.getMinutes().toString().padStart(2, "0")
  }

  protected second(): string {
    return this.date.getSeconds().toString().padStart(2, "0")
  }

  protected millisecond(): string {
    return this.date.getMilliseconds().toString().padStart(3, "0")
  }

  protected timestamp(): string {
    return Math.floor(this.date.getTime() / 1000).toString()
  }

  protected timestampMS(): string {
    return this.date.getTime().toString()
  }

  public format(s?: string): string {
    if (!s) return ""
    const formatters: Record<string, () => string> = {
      year: () => this.year(),
      month: () => this.month(),
      day: () => this.day(),
      hour: () => this.hour(),
      minute: () => this.minute(),
      second: () => this.second(),
      millisecond: () => this.millisecond(),
      timestamp: () => this.timestamp(),
      timestampMS: () => this.timestampMS(),
    }
    return Object.entries(formatters).reduce(
      (result, [key, formatter]) =>
        result.replace(new RegExp(`{${key}}`, "g"), formatter()),
      s,
    )
  }
}

export class FileNameGenerator extends Generator {
  readonly info: IImgInfo

  constructor(info: IImgInfo) {
    super(info.uploadDate)
    this.info = info
  }

  public fullName(): string {
    return this.info.fileName || ""
  }

  public fileName(): string {
    if (!this.info.fileName) return ""
    const ext = this.info.extname || ""
    return this.info.fileName.replace(new RegExp(`${ext}$`), "")
  }

  public extName(): string {
    return (this.info.extname || "").replace(".", "")
  }

  public md5(): string {
    return crypto.createHash("md5").update(this.imgBuffer()).digest("hex")
  }

  public sha1(): string {
    return crypto.createHash("sha1").update(this.imgBuffer()).digest("hex")
  }

  public sha256(): string {
    return crypto.createHash("sha256").update(this.imgBuffer()).digest("hex")
  }

  public imgBuffer(): string | Buffer {
    return this.info.base64Image || this.info.buffer || ""
  }

  public format(s?: string): string {
    if (!s) return this.fullName()
    const formatters: Record<string, () => string> = {
      fullName: () => this.fullName(),
      fileName: () => this.fileName(),
      extName: () => this.extName(),
      md5: () => this.md5(),
      sha1: () => this.sha1(),
      sha256: () => this.sha256(),
    }
    return Object.entries(formatters).reduce(
      (result, [key, formatter]) => {
        const rangePattern = new RegExp(`{${key}:(\\d+),(\\d+)}`, "g")
        const truncatePattern = new RegExp(`{${key}:(\\d+)}`, "g")
        const simplePattern = new RegExp(`{${key}}`, "g")

        result = result.replace(rangePattern, (_match, start, length) => {
          const value = formatter()
          return value.substring(parseInt(start, 10), parseInt(start, 10) + parseInt(length, 10))
        })
        result = result.replace(truncatePattern, (_match, length) => {
          return formatter().substring(0, parseInt(length, 10))
        })
        result = result.replace(simplePattern, formatter())
        return result
      },
      super.format(s),
    )
  }
}

export class OutputURLGenerator extends Generator {
  readonly config: IOciUserConfig
  readonly info: IImgInfo

  constructor(config: IOciUserConfig, info: IImgInfo) {
    super(info.uploadDate)
    this.config = config
    this.info = info
  }

  public protocol(): string {
    return "https"
  }

  public bucket(): string {
    return this.config.bucketName
  }

  public namespace(): string {
    return this.config.namespace
  }

  public region(): string {
    return this.config.region
  }

  public path(): string {
    return this.info.uploadPath || ""
  }

  public fileName(): string {
    return this.info.fileName || path.basename(this.path())
  }

  public extName(): string {
    if (this.info.extname) {
      return this.info.extname.replace(/^./, "")
    }
    return path.extname(this.path()).replace(/^./, "")
  }

  public dir(): string {
    return path.dirname(this.path())
  }

  public uploadedFileName(): string {
    return path.basename(this.path())
  }

  public format(): string {
    if (this.config.outputURLPattern) {
      const formatters: Record<string, () => string> = {
        protocol: () => this.protocol(),
        bucket: () => this.bucket(),
        namespace: () => this.namespace(),
        region: () => this.region(),
        path: () => this.path(),
        dir: () => this.dir(),
        fileName: () => this.fileName(),
        uploadedFileName: () => this.uploadedFileName(),
        extName: () => this.extName(),
      }
      return Object.entries(formatters).reduce(
        (result, [key, formatter]) =>
          result.replace(new RegExp(`{${key}}`, "g"), formatter()),
        super.format(this.config.outputURLPattern),
      )
    }
    const endpoint = this.config.endpoint || `https://${this.config.namespace}.compat.objectstorage.${this.config.region}.oraclecloud.com`
    return `${endpoint}/${this.config.bucketName}/${this.path()}`
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
    const body = info.base64Image.replace(/^data:[/\w]+;base64,/, "")
    result.contentType = info.base64Image.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0]
    result.body = Buffer.from(body, "base64")
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
    const { protocol, hostname, port } = new URL(url)
    return `${protocol}//${hostname.replace("127.0.0.1", "localhost")}:${port}`
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
