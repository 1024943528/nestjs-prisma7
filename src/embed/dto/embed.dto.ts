export class EmbedSingleDTO {
    text!: string;
}

export class EmbedBatchDTO {
    texts!: string[];
}

export class EmbedQueryDTO {
    query!: string;
    documents!: string[];
}