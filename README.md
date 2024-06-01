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

続いて Cloudflare 側にも環境変数を反映するため、次のコマンドを実行します。
入力が求められるので、上と同じ値を入力してください。

```bash
npx wrangler secret put PRISMA_ACCELERATE_SECRET
```

`your_prisma_accelerate_secret` は、[API_kEY を生成する](#api_key-を生成する)で使用します。

## Cloudflare KV を作成する

Cloudflare のダッシュボードに移動します。
左メニューから `Workers & Pages` を選択し、配下の `KV` を選択します。

このような画面に遷移するので、右側の `Create Namespace` をクリックします。
![Cloudflare KVのダッシュボード画面](https://storage.googleapis.com/zenn-user-upload/21eafe761175-20240601.png)

`Namespace Name` には識別しやすい名前を設定します。ここでは、`prisma-accelerate-pg-workers` とします。入力したら `Add` をクリックします。
作成された KV の ID を控えておきます。

![](https://storage.googleapis.com/zenn-user-upload/22c9497ddb36-20240601.png)

つづいて`wrangler.toml` を開き、次の箇所の `id` を先ほど控えた KV の ID に書き換えます。

```
[[kv_namespaces]]
binding = "KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

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

URL のスキーマが `prisma` であること、ホストが `xxxx.workers.dev` であること、クエリパラメータに `api_key`

# デプロイ

Cloudflare にログインした状態で、以下のコマンドを実行します。

```bash
npm run deploy
```

### 参考

https://github.com/SoraKumo001/prisma-accelerate-workers

https://github.com/node-libraries/prisma-accelerate-local
