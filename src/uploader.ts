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
import { HttpsProxyAgent, HttpProxyAgent } from "hpagent"
import { IImgInfo } from "picgo"
import { extractInfo, getProxyAgent } from "./utils"
import { IOciUserConfig } from "./config"

export interface IUploadResult {
  index: number
  key: string
  error?: Error
}

function createS3Client(opts: IOciUserConfig): S3Client {
  let sslEnabled = true
  if (opts.endpoint) {
    try {
      sslEnabled = new URL(opts.endpoint).protocol === "https:"
    } catch {
      sslEnabled = true
    }
  }

  const httpHandlerOpts: NodeHttpHandlerOptions = {}
  const proxyAgent = getProxyAgent(opts.proxy, sslEnabled)
  if (proxyAgent) {
    if (sslEnabled) {
      httpHandlerOpts.httpsAgent = proxyAgent as HttpsProxyAgent
    } else {
      httpHandlerOpts.httpAgent = proxyAgent as HttpProxyAgent
    }
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

  try {
    const { body, contentType, contentEncoding } = await extractInfo(opts.item)

    const command = new PutObjectCommand({
      Bucket: opts.bucketName,
      Key: opts.path,
      ACL: opts.acl as ObjectCannedACL,
      Body: body,
      ContentType: contentType,
      ContentEncoding: contentEncoding || undefined,
    })

    await opts.client.send(command)
  } catch (err) {
    result.error = err instanceof Error
      ? err
      : new Error(`Upload failed: ${String(err)}`)
  }

  return result
}

export default {
  createS3Client,
  createUploadTask,
}
