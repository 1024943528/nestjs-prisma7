import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmbedService } from './embed.service';

describe('EmbedService', () => {
  let service: EmbedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbedService],
    }).compile();

    service = module.get<EmbedService>(EmbedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should wrap Ollama connection errors with an internal server error', async () => {
    jest
      .spyOn((service as any).ollamaEmbeddings, 'embedQuery')
      .mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:11434'));

    await expect(service.createSingle('hello')).rejects.toThrow(InternalServerErrorException);
  });
});
