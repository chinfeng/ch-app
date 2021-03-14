# 仅学习用途，请勿商用 #

CH 的桌面版客户端，目前支持 Windows 版本（macOS 未进行适配）。由于 `agora-electron-sdk` 依赖只 built-in 了32位的二进制执行文件，建议使用 32bit nodejs 环境运行和打包。

纯粹个人业余堆砌，非官方支持可能会跟不上更新，因此没计划耗费太多精力，一切求快，开箱即用。

一些细节尚未补全，如有朋友愿意贡献代码，欢迎 PR。

# 用法 #

## 开发调测 ##

```sh
yarn start
```

## 打包 ##

```sh
yarn package
```

输出在 app/out 目录中

Reuirements:
```sh
- Nodejs 32bit
- Git and must be added to path
- npm install --global concurrently
- Go to the project folder and run the command yarn install
```

Starting the debug/development version
```sh
yarn start
```

Building the production version
```sh
yarn package
```

You will find the production version in app/out directory.
