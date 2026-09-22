import { Body, Controller, Post } from '@nestjs/common';
import { EmbedService } from './embed.service';
import { EmbedSingleDTO, EmbedBatchDTO, EmbedQueryDTO } from './dto/embed.dto';

@Controller('embed')
export class EmbedController {
    constructor(private readonly embedService: EmbedService) {}
    @Post('single')
    async createSingle(@Body() dto: EmbedSingleDTO) {
        return this.embedService.createSingle(dto.text);
    }
    @Post('batch')
    async createBatch(@Body() dto: EmbedBatchDTO) {
        return this.embedService.createBatch(dto.texts);
    }
    @Post('query')
    async createQuery(@Body() dto: EmbedQueryDTO) {
        return this.embedService.createQuery(dto.query, dto.documents);
    }
}
