# BiliFetch 网站发布包

这个文件夹可以直接发布成公网网站。项目重心是脚本猫脚本，网站负责安装入口、教程、更新说明和可选本地助手下载。

## 推荐发布方式

最省事的是 GitHub Pages：

1. 新建一个公开仓库，例如 `BiliFetch`。
2. 把 `BiliFetch-网站发布包` 文件夹里的所有内容上传到仓库根目录。
3. 打开仓库 `Settings`。
4. 进入 `Pages`。
5. `Build and deployment` 选择 `Deploy from a branch`。
6. 分支选择 `main`，目录选择 `/root`。
7. 保存后等待 1 到 3 分钟。
8. 网站地址通常是 `https://你的GitHub用户名.github.io/BiliFetch/`。

也可以用 Cloudflare Pages：

1. 新建 Pages 项目。
2. 上传这个文件夹。
3. 构建命令留空。
4. 输出目录填 `/`。

## 发布后要做的一步

拿到公网网站地址后，运行根目录里的：

`SET_WEBSITE_URL.bat`

把网站地址粘进去，它会自动把脚本里的：

- `@homepageURL`
- `@supportURL`
- `@downloadURL`
- `@updateURL`

改成你的真实网站地址。

它也会同步刷新：

- `downloads/BiliFetch-脚本猫版.zip`
- `downloads/BiliFetch-小白软件版.zip`

然后重新上传 `scriptcat/BiliFetch-ScriptCat.user.js` 到脚本猫即可。

## 目录说明

- `index.html`：网站首页。
- `assets/`：首页图片。
- `scriptcat/BiliFetch-ScriptCat.user.js`：核心脚本猫脚本，也是网站的主入口。
- `downloads/`：可选增强组件下载，主要用于本地助手和备份 zip。
- `SET_WEBSITE_URL.bat`：把脚本猫里的官网链接改成你的真实网站地址。
- `.nojekyll`：让 GitHub Pages 原样发布文件。
