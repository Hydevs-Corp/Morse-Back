import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
dotenv.config();

execSync('npx prisma migrate deploy', { stdio: 'inherit' });

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'messages_queue',
            queueOptions: {
                durable: true,
            },
        },
    });

    app.enableCors({
        origin: [process.env.CORS_ORIGIN, 'http://localhost:5173'],
        credentials: true,
    });

    await app.startAllMicroservices();
    await app.listen(process.env.PORT ?? 3001);

    console.log('Application is running on: http://localhost:3001');
    console.log('RabbitMQ consumer is ready');
}
bootstrap();
