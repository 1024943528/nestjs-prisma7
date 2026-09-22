import { Body, Controller, Post } from '@nestjs/common';
import { AddDocumentsDto, QueryDto, SearchDto } from './dto/rag.dto';
import { RagService } from './rag.service';
@Controller('rag')
export class RagController {
    constructor(private readonly ragService: RagService) {}
    @Post('add-documents')
    async addDocuments(@Body() dto: AddDocumentsDto) {
        return await this.ragService.addDocuments(dto);
    }
    @Post('query')
    async query(@Body() dto: QueryDto) {
        return await this.ragService.query(dto);
    }
    @Post('search')
    async search(@Body() dto: SearchDto) {
        return await this.ragService.search(dto);
    }
}
