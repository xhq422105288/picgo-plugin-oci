import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3"
import {
  NodeHttpHandler,
  NodeHttpHandlerOptions,
} from "@smithy/node-http-handler"
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent"
import { IImgInfo } from "picgo"
import { extractInfo, getProxyAgent } from "./utils"
import { IOciUserConfig } from "./config"

export interface IUploadResult {
  index: number
  key: string
  url?: string
  error?: Error
}

function createS3Client(opts: IOciUserConfig): S3Client {
  let sslEnabled = true
  if (opts.endpoint) {
    try {
      const u = new URL(opts.endpoint)
      sslEnabled = u.protocol === "https:"
    } catch (_) {
      sslEnabled = true
    }
  }

  const httpHandlerOpts: NodeHttpHandlerOptions = {}
  const proxyAgent = getProxyAgent(opts.proxy, sslEnabled)
  if (sslEnabled) {
    httpHandlerOpts.httpsAgent = proxyAgent as HttpsProxyAgent
  } else {
    httpHandlerOpts.httpAgent = proxyAgent as HttpProxyAgent
  }

  const clientOptions: S3ClientConfig = {
    region: opts.region,
    endpoint: opts.endpoint,
    credentials: {
      accessKeyId: opts.accessKeyID,
      secretAccessKey: opts.secretAccessKey,
    },
    tls: sslEnabled,
    forcePathStyle: true,
    requestHandler: new NodeHttpHandler(httpHandlerOpts),
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  }

  return new S3Client(clientOptions)
}

interface CreateUploadTaskOpts {
  client: S3Client
  bucketName: string
  path: string
  item: IImgInfo
  index: number
  acl: string
}

async function createUploadTask(
  opts: CreateUploadTaskOpts,
): Promise<IUploadResult> {
  const result: IUploadResult = {
    index: opts.index,
    key: opts.path,
  }

  if (!opts.item.buffer && !opts.item.base64Image) {
    result.error = new Error(`"${opts.item.fileName}" No image data provided`)
    return result
  }

  let body: Buffer
  let contentType: string
  let contentEncoding: string

  try {
    ({ body, contentType, contentEncoding } = await extractInfo(opts.item))
  } catch (err) {
    result.error = new Error(
      `Failed to extract "${opts.item.fileName}" image info: ${err instanceof Error ? err.message : String(err)}`,
    )
    return result
  }

  const acl = opts.acl as ObjectCannedACL
  const command = new PutObjectCommand({
    Bucket: opts.bucketName,
    Key: opts.path,
    ACL: acl,
    Body: body,
    ContentType: contentType,
    ContentEncoding: contentEncoding || undefined,
  })

  try {
    await opts.client.send(command)
    result.url = `https://${opts.bucketName}.${opts.path}`
  } catch (err) {
    result.error = new Error(
      `Failed to upload "${opts.item.fileName}" to OCI: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  return result
}

export default {
  createS3Client,
  createUploadTask,
}
