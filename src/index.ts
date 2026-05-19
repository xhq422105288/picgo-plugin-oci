import { IImgInfo, IPicGo, IPluginConfig } from "picgo"
import uploader, { IUploadResult } from "./uploader"
import { FileNameGenerator, OutputURLGenerator } from "./utils"
import { getPluginConfig, loadUserConfig } from "./config"

const pluginName = "oci"

const upload = async (ctx: IPicGo) => {
  const userConfig = loadUserConfig(ctx)
  const client = uploader.createS3Client(userConfig)
  const output = ctx.output

  const tasks = output.map((item, idx) => {
    item.uploadDate = new Date()
    const fileNameGenerator = new FileNameGenerator(item)
    return uploader.createUploadTask({
      client,
      index: idx,
      bucketName: userConfig.bucketName,
      path: fileNameGenerator.format(userConfig.uploadPath),
      item,
      acl: userConfig.acl || "public-read",
    })
  })

  let results: IUploadResult[]

  try {
    results = await Promise.all(tasks)
  } catch (err) {
    ctx.log.error("Upload to OCI Object Storage failed, please check your network and configuration")
    throw err
  }

  for (const result of results) {
    const { index, url, key, error } = result
    delete output[index].buffer
    delete output[index].base64Image
    output[index].uploadPath = key
    if (error) {
      output[index].error = error
    } else {
      output[index].url = url
      output[index].imgUrl = url
    }
  }

  return ctx
}

const afterUploadPlugins = (ctx: IPicGo) => {
  const userConfig = loadUserConfig(ctx)
  const errList: IImgInfo[] = []

  ctx.output = ctx.output.reduce((acc: IImgInfo[], item) => {
    if (item.type !== pluginName && item.type !== undefined) {
      return [...acc, item]
    }
    if (item.error || (!item.imgUrl && !item.url)) {
      errList.push(item)
      return acc
    }
    const urlGenerator = new OutputURLGenerator(userConfig, item)
    const url = urlGenerator.format()
    return [
      ...acc,
      {
        ...item,
        imgUrl: url,
        url,
      },
    ]
  }, [])

  if (errList.length > 0) {
    const msg = `OCI Plugin: ${errList.length} of ${ctx.output.length + errList.length} uploads failed.`
    for (const item of errList) {
      ctx.log.error(`Item ${item.fileName}:`, item.error?.message)
    }
    ctx.emit("notification", {
      title: "OCI Upload Error",
      body: msg + " Failed: " + errList.map((item) => item.fileName).join(", "),
    })
    if (ctx.output.length > 0) {
      ctx.log.error(msg)
    } else {
      throw new Error(msg)
    }
  }
}

const config = (ctx: IPicGo): IPluginConfig[] => {
  return getPluginConfig(ctx)
}

export = (ctx: IPicGo) => {
  const register = () => {
    ctx.helper.uploader.register(pluginName, {
      handle: upload,
      config,
      name: "OCI Object Storage",
    })
    ctx.helper.afterUploadPlugins.register(pluginName, {
      handle: afterUploadPlugins,
      config,
    })
  }
  return {
    register,
    uploader: pluginName,
  }
}
