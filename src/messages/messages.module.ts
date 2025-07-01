import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesResolver } from './messages.resolver';
import { PrismaService } from '../prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { RabbitmqConsumer } from '../rabbitmq/rabbitmq.consumer';

@Module({
    imports: [RabbitmqModule],
    controllers: [RabbitmqConsumer],
    providers: [
        MessagesService,
        MessagesResolver,
        PrismaService,
        ConversationsService,
    ],
    exports: [MessagesService],
})
export class MessagesModule {}
