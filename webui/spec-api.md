# ani-rss REST 接口清单（test 分支，从源码实抽 + 自校验）

- 全局前缀 `/api`：WebMvcConfig 用 addPathPrefix 给所有 @RestController 统一加上
- 响应恒为 `Result<T> = {code, message, data, t}`，code 是业务码（非 HTTP 状态码），200~299 成功
- 「鉴权」列 ✓ = 方法上有 @Auth，需要 `Authorization: <token>` 头（无 Bearer 前缀）
- 共 **72** 个端点 / 24 个 controller
- 免鉴权：`/api/testIpWhitelist`、`/api/custom.css`、`/api/custom.js`、`/api/ping`、`/api/login`


## AboutController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/about` | ✓ | `Result<About>` | `无` | 查看关于信息 |
| POST | `/api/stop` | ✓ | `Result<Void>` | `@RequestParam("status"` | 停止服务 |
| POST | `/api/testIpWhitelist` | — | `Result<Void>` | `无` | IP白名单测试 |
| POST | `/api/update` | ✓ | `Result<Void>` | `无` | 更新 |

## AfdianController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/verifyNo` | ✓ | `Result<Void>` | `@RequestBody Config config` |  |

## AniBTController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/aniBT` | ✓ | `Result<AniBT>` | `@RequestBody AniBTQueryDTO dto` | AniBT 番剧列表 |
| POST | `/api/aniBTGroup` | ✓ | `Result<List<AniBT.Group>>` | `@RequestParam("bgmId"` |  |

## AniController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/addAni` | ✓ | `Result<Void>` | `@RequestBody Ani ani` | 添加订阅 |
| POST | `/api/batchEnable` | ✓ | `Result<Void>` | `@RequestParam("value"` | 批量 启用/禁用 订阅 |
| POST | `/api/deleteAni` | ✓ | `Result<Void>` | `@RequestBody List<String> ids, @RequestParam("deleteFiles"` | 删除订阅 |
| POST | `/api/downloadPath` | ✓ | `Result<Map<String, Object>>` | `@RequestBody Ani ani` | 获取订阅的下载位置 |
| POST | `/api/importAni` | ✓ | `Result<Void>` | `@RequestBody ImportAniDataDTO dto` | 导入订阅 |
| POST | `/api/listAni` | ✓ | `Result<ListAni>` | `无` | 订阅列表 |
| POST | `/api/previewAni` | ✓ | `Result<Map<String, Object>>` | `@RequestBody Ani ani` | 预览订阅 |
| POST | `/api/refreshAll` | ✓ | `Result<Void>` | `无` | 刷新全部订阅 |
| POST | `/api/refreshAni` | ✓ | `Result<Void>` | `@RequestBody IdDTO dto` | 刷新订阅 |
| POST | `/api/refreshCover` | ✓ | `Result<String>` | `@RequestBody Ani ani` | 刷新封面 |
| POST | `/api/rssToAni` | ✓ | `Result<Ani>` | `@RequestBody RssToAniDTO dto` | 将RSS转换为订阅 |
| POST | `/api/setAni` | ✓ | `Result<Void>` | `@RequestBody Ani ani` | 修改订阅 |
| POST | `/api/updateTotalEpisodeNumber` | ✓ | `Result<Void>` | `@RequestParam("force"` | 更新总集数 |

## AnimeGardenController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/animeGardenGroup` | ✓ | `Result<List<AnimeGarden.Group>>` | `@RequestParam("bgmId"` | AnimeGarden 番剧字幕组列表 |
| POST | `/api/animeGardenList` | ✓ | `Result<List<AnimeGarden.Week>>` | `HttpServletRequest request` | AnimeGarden 番剧列表 |

## BackupController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| GET | `/api/exportBackup` | ✓ | `void` | `无` | 导出备份 |
| POST | `/api/importBackup` | ✓ | `Result<Void>` | `@RequestParam("file"` | 导入备份 |

## BgmController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/bgm/oauth/callback` | ✓ | `Result<Void>` | `@RequestParam("code"` | BGM授权回调 |
| POST | `/api/getAniBySubjectId` | ✓ | `Result<Ani>` | `@RequestParam("id"` | 将指定id的BGM番剧转换为订阅 |
| POST | `/api/getBgmTitle` | ✓ | `Result<String>` | `@RequestBody Ani ani` | 获取BGM标题 |
| POST | `/api/meBgm` | ✓ | `Result<BgmMe>` | `无` | 获取当前BGM账号信息 |
| POST | `/api/rate` | ✓ | `Result<Integer>` | `@RequestBody Ani ani` | 获取评分 |
| POST | `/api/searchBgm` | ✓ | `Result<List<BgmInfo>>` | `@RequestParam("name"` | 搜索BGM条目 |
| POST | `/api/setRate` | ✓ | `Result<Integer>` | `@RequestBody Ani ani` | 进行评分 |

## CollectionController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/getCollectionSubgroup` | ✓ | `Result<String>` | `@RequestBody CollectionInfo collectionInfo` | 获取合集字幕组 |
| POST | `/api/previewCollection` | ✓ | `Result<List<Item>>` | `@RequestBody CollectionInfo collectionInfo` | 合集预览 |
| POST | `/api/startCollection` | ✓ | `Result<Void>` | `@RequestBody CollectionInfo collectionInfo` | 开始下载合集 |

## ConfigController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/clearCache` | ✓ | `Result<Void>` | `无` | 清理缓存 |
| POST | `/api/config` | ✓ | `Result<Config>` | `无` | 获取设置 |
| GET | `/api/custom.css` | — | `void` | `无` | 自定义CSS |
| GET | `/api/custom.js` | — | `void` | `无` | 自定义JS |
| POST | `/api/downloadLoginTest` | ✓ | `Result<Void>` | `@RequestBody Config config` | 下载器测试 |
| ANY | `/api/ping` | — | `Result<Void>` | `无` | 存活测试 |
| POST | `/api/setConfig` | ✓ | `Result<Void>` | `@RequestBody Config newConfig` | 修改设置 |
| POST | `/api/testProxy` | ✓ | `Result<ProxyTest>` | `@RequestParam("url"` | 代理测试 |
| POST | `/api/trackersUpdate` | ✓ | `Result<Void>` | `@RequestBody Config config` | 更新trackers |

## EmbyController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/embyWebHook` | ✓ | `Result<Void>` | `@RequestBody EmbyWebHook embyWebHook` | BGM自动点格子 |
| POST | `/api/getEmbyViews` | ✓ | `Result<List<EmbyViews>>` | `@RequestBody NotificationConfig notificationConfig` | 获取媒体库 |

## FileController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| GET | `/api/file` | ✓ | `void` | `@RequestParam("filename"` | 获取文件 |

## IcsController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| GET | `/api/calendar.ics` | ✓ | `void` | `HttpServletResponse response` | 获取ICS日历 |

## LoginController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/login` | — | `Result<String>` | `@RequestBody Login myLogin` | 登录 |

## LogsController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/clearLogs` | ✓ | `Result<Void>` | `无` | 清理日志 |
| GET | `/api/downloadLogs` | ✓ | `void` | `无` | 下载日志 |
| POST | `/api/logs` | ✓ | `Result<List<Log>>` | `无` | 日志 |

## MikanController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/mikan` | ✓ | `Result<Mikan>` | `@RequestParam("text"` | 获取Mikan番剧列表 |
| POST | `/api/mikanGroup` | ✓ | `Result<List<Mikan.Group>>` | `@RequestParam("url"` | 获取Mikan番剧的字幕组列表 |

## NotificationController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/getTgUpdates` | ✓ | `Result<List<TelegramNotification.Message.Chat>>` | `@RequestBody NotificationConfig notificationConfig` | 获取TG最近消息 |
| POST | `/api/newNotification` | ✓ | `Result<NotificationConfig>` | `无` | 新的通知 |
| POST | `/api/testNotification` | ✓ | `Result<Void>` | `@RequestBody NotificationConfig notificationConfig` | 测试通知 |

## PlayController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/getSubtitles` | ✓ | `Result<List<PlayItem.Subtitles>>` | `@RequestParam("filename"` | 获取内封字幕 |
| POST | `/api/playList` | ✓ | `Result<List<PlayItem>>` | `@RequestBody Ani ani` | 获取视频列表 |

## ProxyImageController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| GET | `/api/proxyImage` | ✓ | `void` | `@RequestParam("imgUrl"` | 下载并缓存图片 |

## ScrapeController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/batchScrape` | ✓ | `Result<Void>` | `@RequestParam("force"` | 批量刮削 |
| POST | `/api/scrape` | ✓ | `Result<Void>` | `@RequestParam("force"` | 刮削 |

## ThemoviedbController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/getThemoviedbGroup` | ✓ | `Result<List<TmdbGroup>>` | `@RequestBody Ani ani` | 获取TMDB剧集组 |
| POST | `/api/getThemoviedbName` | ✓ | `Result<ThemoviedbVO>` | `@RequestBody ThemoviedbDTO dto` | 获取TMDB标题 |

## TorrentController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/deleteTorrent` | ✓ | `Result<Void>` | `@RequestParam("id"` | 删除缓存种子 |

## TorrentsInfosController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/torrentsInfos` | ✓ | `Result<List<TorrentsInfo>>` | `无` | 下载列表 |

## UploadController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/upload` | ✓ | `Result<Object>` | `@RequestParam("file"` | 上传文件 |
| POST | `/api/uploadAndRead` | ✓ | `Result<String>` | `@RequestParam("file"` | 上传并读取 |
| POST | `/api/uploadAndReadToBase64` | ✓ | `Result<String>` | `@RequestParam("file"` | 上传并读取为 base64 |

## WebUIController

| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |
|---|---|---|---|---|---|
| POST | `/api/webui/delete` | ✓ | `Result<Void>` | `无` | 删除 WebUI |
| POST | `/api/webui/getUpdate` | ✓ | `Result<UpdateInfo>` | `无` | 获取 WebUI 更新 |
| POST | `/api/webui/update` | ✓ | `Result<Void>` | `无` | 更新 WebUI |
| POST | `/api/webui/upload` | ✓ | `Result<Void>` | `@RequestParam("file"` | 上传 WebUI |
