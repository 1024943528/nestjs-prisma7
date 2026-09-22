import { Module } from '@nestjs/common'
import { RagController }      from './rag.controller'
// import { RagChromaService }   from './rag-chroma.service'
import { RagService } from './rag.service'

@Module({
  controllers: [RagController],
  providers:   [RagService],
})
  export class RagModule {}