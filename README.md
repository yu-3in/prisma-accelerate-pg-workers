# prisma-accelerate-workers

このリポジトリは、Cloudflare Workers 上で動作する [Prisma Accelerate](https://www.prisma.io/data-platform/accelerate) 互換のサービスです。

PostgreSQL に対応しています。

# 使い方

## `.dev.vars` ファイルを作成する

`.dev.vars` ファイルを作成し、以下の内容を記述します。

`your_prisma_accelerate_secret` には、任意のランダムな値を設定してください。

```bash
PRISMA_ACCELERATE_SECRET=your_prisma_accelerate_secret
```

`your_prisma_accelerate_secret` は、次項の `npx prisma-accelerate-local` の `--secret` オプションで指定します。

## API_KEY を生成する

`--secret` には、 `.dev.vars` で指定した `PRISMA_ACCELERATE_SECRET` と同じ値を指定します。
`--make` には、supabase などの `DATABASE_URL` を指定します。

```bash
npx prisma-accelerate-local --secret enter_your_secret --make postgres://xxx
```

生成した API_KEY はクライアントサイドで使用します。
クライアントサイドの `.env.local` に以下のように記述します。

```bash
DATABASE_URL=prisma://xxxx.workers.dev?api_key=your_api_key
```

URL のスキーマが `prisma` であること、ホストが `xxxx.workers.dev` であること、クエリパラメータに `api_key` が含まれていることを確認してください。

# デプロイ

Cloudflare にログインした状態で、以下のコマンドを実行します。

```bash
npm run deploy
```

### 参考

https://github.com/SoraKumo001/prisma-accelerate-workers

https://github.com/node-libraries/prisma-accelerate-local
