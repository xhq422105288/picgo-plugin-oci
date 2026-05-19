import { IImgInfo, IPicGo, IPluginConfig } from "picgo"
import uploader from "./uploader"
import { FileNameGenerator, OutputURLGenerator } from "./utils"
import { getPluginConfig, loadUserConfig } from "./config"

const pluginName = "oci"

const upload = async (ctx: IPicGo) => {
  const userConfig = loadUserConfig(ctx)
  const client = uploader.createS3Client(userConfig)
  const output = ctx.output
  const endpoint = userConfig.endpoint!
  const bucketName = userConfig.bucketName

  const tasks = output.map((item, idx) => {
    item.uploadDate = new Date()
    const fileNameGenerator = new FileNameGenerator(item)
    return uploader.createUploadTask({
      client,
      index: idx,
      bucketName,
      path: fileNameGenerator.format(userConfig.uploadPath),
      item,
      acl: userConfig.acl || "public-read",
    })
  })

  const results = await Promise.all(tasks.map(async (task) => {
    try {
      return await task
    } catch (err) {
      return {
        index: 0,
        key: "",
        error: err instanceof Error ? err : new Error(String(err)),
      }
    }
  }))

  for (const result of results) {
    const { index, key, error } = result
    const item = output[index]
    item.type = pluginName
    item.uploadPath = key

    delete item.buffer
    delete item.base64Image

    if (error) {
      item.error = error
      ctx.log.error(`[OCI] Upload failed for "${item.fileName}": ${error.message}`)
    } else {
      const url = `${endpoint}/${bucketName}/${key}`
      item.url = url
      item.imgUrl = url
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
      { ...item, imgUrl: url, url },
    ]
  }, [])

  if (errList.length > 0) {
    const total = ctx.output.length + errList.length
    const msg = `OCI: ${errList.length}/${total} uploads failed`
    for (const item of errList) {
      ctx.log.error(`[OCI] ${item.fileName}: ${item.error?.message}`)
    }
    ctx.emit("notification", {
      title: "OCI Upload Error",
      body: `${msg}\n${errList.map((i) => i.fileName).join(", ")}`,
    })
    if (ctx.output.length === 0) {
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
    })
  }
  return {
    register,
    uploader: pluginName,
  }
}
