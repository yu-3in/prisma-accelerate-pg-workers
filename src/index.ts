import { Pool } from '@prisma/pg-worker';
import { PrismaPg } from '@prisma/adapter-pg-worker';
import WASM from '@prisma/client/runtime/query_engine_bg.postgresql.wasm';
import { PrismaAccelerate, PrismaAccelerateConfig, ResultError } from 'prisma-accelerate-local/lib';
import { getPrismaClient } from '@prisma/client/runtime/wasm.js';

const getAdapter = (datasourceUrl: string) => {
	const url = new URL(datasourceUrl);
	const schema = url.searchParams.get('schema') ?? undefined;
	const pool = new Pool({
		connectionString: url.toString() ?? undefined,
	});
	return new PrismaPg(pool, { schema });
};

let prismaAccelerate: PrismaAccelerate;

const getPrismaAccelerate = async ({
	secret,
	onRequestSchema,
	onChangeSchema,
}: {
	secret: string;
	onRequestSchema: PrismaAccelerateConfig['onRequestSchema'];
	onChangeSchema: PrismaAccelerateConfig['onChangeSchema'];
}) => {
	if (prismaAccelerate) {
		return prismaAccelerate;
	}
	prismaAccelerate = new PrismaAccelerate({
		singleInstance: true,
		secret,
		adapter: getAdapter,
		getRuntime: () => require('@prisma/client/runtime/query_engine_bg.postgresql.js'),
		getQueryEngineWasmModule: async () => WASM,
		getPrismaClient,
		onRequestSchema,
		onChangeSchema,
	});
	return prismaAccelerate;
};

const createResponse = async (result: Promise<unknown>) => {
	try {
		const response = await result;
		return new Response(JSON.stringify(response), {
			headers: { 'content-type': 'application/json' },
		});
	} catch (e) {
		if (e instanceof ResultError) {
			console.error(e.value);
			return new Response(JSON.stringify(e.value), {
				status: e.code,
				headers: { 'content-type': 'application/json' },
			});
		}
		return new Response(JSON.stringify(e), {
			status: 500,
			headers: { 'content-type': 'application/json' },
		});
	}
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const prismaAccelerate = await getPrismaAccelerate({
			secret: env.PRISMA_ACCELERATE_SECRET,
			onRequestSchema: ({ engineVersion, hash, datasourceUrl }) => env.KV.get(`schema-${engineVersion}:${hash}:${datasourceUrl}`),
			onChangeSchema: ({ inlineSchema, engineVersion, hash, datasourceUrl }) =>
				env.KV.put(`schema-${engineVersion}:${hash}:${datasourceUrl}`, inlineSchema, { expirationTtl: 60 * 60 * 24 * 7 }),
		});

		const url = new URL(request.url);
		const paths = url.pathname.split('/');
		const command = paths[3];
		const headers = Object.fromEntries(request.headers.entries());

		if (request.method === 'POST') {
			const body = await request.text();
			if (command === 'graphql') {
				return createResponse(prismaAccelerate.query({ body, hash: paths[2], headers }));
			}
			if (command === 'transaction') {
				return createResponse(prismaAccelerate.startTransaction({ body, hash: paths[2], headers, version: paths[1] }));
			}
			if (command === 'itx') {
				const id = paths[4];
				const subCommand = paths[5];
				if (subCommand === 'commit') {
					return createResponse(prismaAccelerate.commitTransaction({ id, hash: paths[2], headers }));
				}
				if (subCommand === 'rollback') {
					return createResponse(prismaAccelerate.rollbackTransaction({ id, hash: paths[2], headers }));
				}
			}
		} else if (request.method === 'PUT' && command === 'schema') {
			const body = await request.text();
			return createResponse(prismaAccelerate.updateSchema({ body, hash: paths[2], headers }));
		}

		return new Response('Not Found', { status: 404 });
	},
};
