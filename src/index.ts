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

  const results = await Promise.all(tasks.map(async (task, idx) => {
    try {
      return await task
    } catch (err) {
      return {
        index: idx,
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
    const details = errList.map((i) => `[${i.fileName}] ${i.error?.message || "unknown error"}`)
    ctx.emit("notification", {
      title: "OCI Upload Error",
      body: `${errList.length}/${total} failed\n${details.join("\n")}`,
    })
    for (const item of errList) {
      ctx.log.error(`[OCI] ${item.fileName}: ${item.error?.message}`)
    }
    if (ctx.output.length === 0) {
      throw new Error(`OCI: ${errList.length}/${total} uploads failed`)
    }
  }
}

const config = (ctx: IPicGo): IPluginConfig[] => {
  return getPluginConfig(ctx)
}

const deleteImage = async (ctx: IPicGo, imgInfo: IImgInfo) => {
  const userConfig = loadUserConfig(ctx)
  const client = uploader.createS3Client(userConfig)

  let key = imgInfo.uploadPath
  if (!key && imgInfo.url) {
    const bucketPrefix = `/${userConfig.bucketName}/`
    const urlObj = new URL(imgInfo.url)
    const idx = urlObj.pathname.indexOf(bucketPrefix)
    if (idx !== -1) {
      key = urlObj.pathname.slice(idx + bucketPrefix.length)
    }
  }

  if (!key) {
    ctx.log.warn(`[OCI] Cannot determine object key for deletion: ${imgInfo.fileName || imgInfo.url}`)
    return
  }

  try {
    await uploader.createDeleteTask({
      client,
      bucketName: userConfig.bucketName,
      key,
    })
    ctx.log.info(`[OCI] Deleted: ${key}`)
  } catch (err) {
    ctx.log.error(`[OCI] Delete failed for "${key}": ${err instanceof Error ? err.message : String(err)}`)
  }
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
    ctx.on('remove', (files: IImgInfo[]) => {
      for (const file of files) {
        if (file.type === pluginName) {
          deleteImage(ctx, file)
        }
      }
    })
  }
  return {
    register,
    uploader: pluginName,
  }
}
