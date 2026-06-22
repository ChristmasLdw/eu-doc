# eu-doc 密钥与权限使用说明

本文件只记录使用方式，不记录任何真实密钥、token、私钥内容。

## 基本原则

- AI 不应要求用户在对话中提供 GitHub token、服务器密码、SSH 私钥或 `.env` 内容。
- AI 不应读取、打印或提交 `.env`、私钥、token、数据库文件。
- 权限应由本机 Git、SSH 和服务器环境自行保存，AI 只运行固定命令。

## GitHub 备份

当前仓库使用 SSH remote：

```text
git@github.com:ChristmasLdw/eu-doc.git
```

AI 需要备份代码时，只执行常规 Git 流程：

```bash
git status
git add ...
git commit -m "..."
git push
```

如果 `git push` 失败，只报告失败原因，不要求用户提供 token。

## 腾讯云部署

当前服务器可通过 SSH 免密连接：

```bash
ssh root@124.221.160.46
```

日常部署优先使用：

```bash
./deploy-to-tencent.sh
```

不要优先使用 `deploy.sh`，因为它偏初始化部署，包含数据库和上传文件复制逻辑，日常部署风险更高。

## 禁止提交或打印

- `.env`
- `.env.*`
- SSH 私钥
- GitHub token
- 腾讯云密钥
- `server/data/*.db`
- `server/uploads/`
- `node_modules/`

## 每日收尾建议

用户要求“每日收尾”时，AI 应按顺序执行：

1. 构建验证。
2. 检查 Git 状态。
3. 更新必要版本、TODO、CURRENT_STATUS、WORK_LOG。
4. 创建 Git commit。
5. 推送 GitHub。
6. 用户明确要求部署时，才运行 `./deploy-to-tencent.sh`。

如果权限失败，只说明失败在哪一步，不读取或打印密钥。
