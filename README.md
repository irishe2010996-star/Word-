# Word🤓☝️

一个 Chrome / Edge 扩展，为网页阅读提供英英查词。通过 [Free Dictionary API](https://github.com/meetDeveloper/freeDictionaryAPI) 查询 Wiktionary 词条，无需账号或密钥。也可在扩展设置里切换到 Merriam-Webster's Learner's Dictionary。

## 安装

1. 下载或克隆本仓库。
2. 打开 `chrome://extensions` 或 `edge://extensions`，开启开发者模式。
3. 点「加载已解压的扩展程序」，选中包含 `manifest.json` 的目录。

## 阅读时使用

- 进入已支持的 Z-Library 网页后，右上角会询问是否开启。选择开启后会显示透明虚线小窗。再点「启动点词」开始自动查询。
- 在正文里单击一个英文词。词内允许连字符或撇号。点空白、链接和输入框时不会查词。
- 如果受排版影响点不准，点右上角 🤪，手动输入完整的词。手动查词也可以在点词暂停时使用。
- 点 × 或按 Escape 收起释义。选择「稍后」会关闭询问，刷新页面或通过扩展菜单可再次打开。
- 如果你的 Z-Library 域名没有自动弹出询问，在阅读页点扩展图标，选择「在当前站点开启查词」，只授权当前域名。以后访问该域名也会询问。浏览器内置 PDF 查看器、图片文字和未获授权的跨域嵌入阅读器可能无法被扩展读取，届时可在支持的网页上用 🤪 手动查词。

## 启用韦氏学习词典

1. [注册韦氏开发者账号](https://dictionaryapi.com/register/index)，在 API 选项里选择 **Learners Dictionary**，完成邮箱验证后在 My Keys 领取密钥。
2. 点击扩展图标，把密钥填入「韦氏学习词典 API 密钥」并保存。清空后保存即可切回免密词典。

韦氏密钥保存在本机浏览器的扩展存储中，仅用于请求韦氏官方 API。请勿把密钥提交到仓库。非商业使用的免费额度和标识要求见 [韦氏 API FAQ](https://dictionaryapi.com/info/frequently-asked-questions)。

## 数据与项目

查词时向当前词典发送所查单词。小窗显示最多三条英文释义和词性。免密词典的词条数据来自 Wiktionary，遵循 API 标注的 CC BY-SA 3.0。

本项目无需构建，推送到 GitHub 后可直接按上面的步骤安装。
