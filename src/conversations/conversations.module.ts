import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsResolver } from './conversations.resolver';
import { PrismaService } from '../prisma.service';

@Module({
    providers: [ConversationsService, ConversationsResolver, PrismaService],
    exports: [ConversationsService],
})
export class ConversationsModule {}
