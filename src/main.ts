import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule }   from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors()
  await app.listen(3001)
  console.log('🚀 服务启动：http://localhost:3001/api')
}
bootstrap()