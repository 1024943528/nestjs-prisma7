import { Injectable } from '@nestjs/common';
import { OllamaEmbeddings } from '@langchain/ollama';
@Injectable()
export class EmbedService {
    private ollamaEmbedings: OllamaEmbeddings
    constructor() {
        this.ollamaEmbedings = new OllamaEmbeddings({
            model: "mxbai-embed-large:latest",
            baseUrl: "http://localhost:11434",
        });
    }
    async createSingle(text: string) {
        // 调用ollama api 生成单条文本的向量
        const vector = await this.ollamaEmbedings.embedQuery(text);
        return {
            vector,
            text,
            dimension: vector.length,
        };
    }
    async createBatch(texts: string[]) {
        const vectors = await this.ollamaEmbedings.embedDocuments(texts);
        return vectors.map((text, index) => ({
            index,
            text,
            vector: vectors[index],
            dimension: vectors[index].length,
        }));
    }
    // 查询与文档直接的相似度 并返回相似度最高的文档
    async createQuery(query: string, documents: string[]) {
        // 查询向量 加上检索前缀
        const queryVector = await this.ollamaEmbedings.embedQuery(`Represent this sentence for searching relevant passgaes: ${query}`);
        // 文档向量 这里假设文档已经被处理并存储了向量 或者你可以在这里这几计算文档的向量
        const documentVectors = await this.ollamaEmbedings.embedDocuments(documents);
        // 计算查询向量与每个文档向量的相似度 这里可以使用余弦相似度 欧氏距离等方法进行计算
        const similarities = documentVectors.map((documentVector, i) => {
            // 这里使用余弦相似度进行计算
            const similarity = this.cosineSimilarity(queryVector, documentVector);
            return {
                index: i,
                similarity: parseFloat(similarity.toFixed(4)),
                text: documents[i],
            }
        });
        similarities.sort((a, b) => b.similarity - a.similarity);
        return {
            query,
            mostSimilarity: similarities,
            similarities: similarities[0]

        }
    }
    private cosineSimilarity(a: number[], b: number[]) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
