import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so the frontend can call the backend from a different origin
  // in production deployments where static assets are served separately.
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(4000);
  console.log('Backend running on http://localhost:4000');
}
bootstrap();
