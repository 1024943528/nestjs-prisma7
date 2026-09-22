import { Body, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AddDocumentsDto, QueryDto, SearchDto } from './dto/rag.dto';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Document } from '@langchain/core/documents';
import { Pool } from 'pg';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import type { DistanceStrategy } from '@langchain/community/vectorstores/pgvector'
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
@Injectable()
export class RagService implements OnModuleInit, OnModuleDestroy {
    private readonly logger: Logger = new Logger(RagService.name);
    private embeddings: OllamaEmbeddings;
    private chatOllama: ChatOllama;
    private pool: Pool;
    private getPgConfig(collectionName: string) {
        return {
            pool: this.pool,
            collectionName,
            embeddings: this.embeddings,
            tableName: 'langchain_pg_embeddings',
            collectionTableName: 'langchain_pg_collection',
            // ✅ columns 字段名必须和建表时的列名完全对应
            //   @langchain/community@1.1.x 内部用这些 key 拼 INSERT SQL
            //    任何一个对不上都会导致插入时对应列为 null
            columns: {
                idColumnName: 'id',             // TEXT PRIMARY KEY
                vectorColumnName: 'embedding',      // VECTOR(1024)
                contentColumnName: 'document',       // TEXT
                metadataColumnName: 'cmetadata',      // JSONB
            },
            // ✅ 距离策略：cosine（余弦相似度），和 HNSW 索引的 vector_cosine_ops 对应
            distanceStrategy: 'cosine' as DistanceStrategy,
        };
    }
    onModuleInit() {
        // 初始化逻辑
        this.embeddings = new OllamaEmbeddings({
            model: "mxbai-embed-large:latest",
            baseUrl: "http://localhost:11434",
        });
        this.chatOllama = new ChatOllama({
            model: "qwen3.5:0.8b",
            baseUrl: "http://localhost:11434",
        });
        this.pool = new Pool({
            user: 'postgres',
            password: 'zcw1996!',
            host: 'localhost',
            port: 5434,
            database: 'ragdb',
        });
        this.logger.log('init pool');
    }
    async onModuleDestroy() {
        await this.pool.end();
        this.logger.log('pool closed');
    }
    async addDocuments(dto: AddDocumentsDto) {
        const chunkSize = dto.chunkSize ?? 500
        const chunkOverlap = dto.chunkOverlap ?? 50

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize,
            chunkOverlap,
            separators: ['\n\n', '\n', '。', '！', '？', '；', ' ', ''],
        })
        const allDocs: Document[] = []
        const allIds: string[] = []
        for (const doc of dto.documents) {
            const chunks = await splitter.createDocuments(
                [doc.content],
                [{ ...doc.metadata, sourceId: doc.id }],
            )
            chunks.forEach((chunk, i) => {
                chunk.metadata.chunkIndex = i
                chunk.metadata.totalChunks = chunks.length
                allDocs.push(chunk)
                // ✅ id 必须是非空字符串，格式自定义即可
                allIds.push(`${doc.id}-chunk-${i}`)
            })
            this.logger.log(`[PGVector] 文档 ${doc.id} 分块完成：共 ${chunks.length} 块`)
        }
        // ✅ fromDocuments 第四个参数传 ids，确保每条记录有明确的 id
        //    不传 ids 时，1.1.x 内部生成 uuid，但部分环境下会出现 null 问题
        await PGVectorStore.fromDocuments(
            allDocs,
            this.embeddings,
            this.getPgConfig(dto.collectionName),
        )

        return {
            success: true,
            backend: 'pgvector',
            collectionName: dto.collectionName,
            originalDocCount: dto.documents.length,
            totalChunks: allDocs.length,
            chunkSize,
            chunkOverlap,
        }
    }
    async query(@Body() dto: QueryDto) {
        const topK = dto.topK ?? 3
        const vectorStore = await PGVectorStore.initialize(
            this.embeddings,
            this.getPgConfig(dto.collectionName),
        )
        const queryWithPrefix = `${dto.question}`
        const retrieved = await vectorStore.similaritySearchWithScore(queryWithPrefix, topK)
        if (retrieved.length === 0) {
            return {
                success: false,
                message: '没有找到匹配的文档',
                results: [],
            }
        }
        const context = retrieved
            .map(([doc], i) => `[${i + 1}] ${doc.pageContent}`)
            .join('\n\n')
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', `你是专业的知识库问答助手。严格根据参考资料回答问题，无相关内容时直接回答"知识库中暂无相关内容"，不要编造。
                参考资料：
                {context}`],
            ['human', '{question}'],
        ])
        this.logger.log(`[PGVector] 检索到 ${retrieved.length} 条结果`);
        const chain = prompt.pipe(this.chatOllama).pipe(new StringOutputParser())
        const answer = await chain.invoke({ context, question: dto.question })
        this.logger.log(`[PGVector] 回答：${answer}`);
        return {
            question: dto.question,
            backend: 'pgvector',
            answer,
            sources: retrieved.map(([doc, score]) => ({
                content: doc.pageContent,
                score: parseFloat(score.toFixed(6)),
                metadata: doc.metadata,
            })),
        }
    }
    async search(@Body() dto: SearchDto) {
        const topK = dto.topK ?? 3
        const vectorStore = await PGVectorStore.initialize(
            this.embeddings,
            this.getPgConfig(dto.collectionName),
        )
        const results = await vectorStore.similaritySearch(dto.query, topK)
        return results.map((result) => {
            return {
                id: result.metadata.sourceId,
                content: result.pageContent,
                metadata: result.metadata,
            }
        })
    }

}
