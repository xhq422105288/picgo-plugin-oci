import { IPicGo, IPluginConfig } from "picgo"

export interface IOciUserConfig {
  accessKeyID: string
  secretAccessKey: string
  namespace: string
  region: string
  bucketName: string
  uploadPath: string
  endpoint?: string
  proxy?: string
  acl?: string
  outputURLPattern?: string
}

function mergePluginConfig(userConfig: IOciUserConfig): IPluginConfig[] {
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
  ]
}

export function getPluginConfig(ctx: IPicGo): IPluginConfig[] {
  const defaultConfig: IOciUserConfig = {
    accessKeyID: "",
    secretAccessKey: "",
    namespace: "",
    region: "",
    bucketName: "",
    uploadPath: "{year}/{month}/{md5}.{extName}",
    acl: "public-read",
  }
  let userConfig = ctx.getConfig<IOciUserConfig>("picBed.oci")
  if (!userConfig) {
    userConfig = { ...defaultConfig }
  } else {
    userConfig = { ...defaultConfig, ...userConfig }
  }
  return mergePluginConfig(userConfig)
}

export function loadUserConfig(ctx: IPicGo): IOciUserConfig {
  const userConfig: IOciUserConfig = ctx.getConfig("picBed.oci")
  if (!userConfig) {
    throw new Error("Cannot find OCI Object Storage uploader config")
  }
  if (!userConfig.endpoint) {
    userConfig.endpoint = `https://${userConfig.namespace}.compat.objectstorage.${userConfig.region}.oraclecloud.com`
  }
  userConfig.acl = userConfig.acl || "public-read"
  userConfig.uploadPath = userConfig.uploadPath || "{year}/{month}/{md5}.{extName}"
  return userConfig
}
