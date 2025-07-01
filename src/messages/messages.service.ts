import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Message, Prisma } from '@prisma/client';

@Injectable()
export class MessagesService {
    constructor(private prisma: PrismaService) {}

    async message(
        messageWhereUniqueInput: Prisma.MessageWhereUniqueInput
    ): Promise<Message | null> {
        return this.prisma.message.findUnique({
            where: messageWhereUniqueInput,
            include: { conversation: true, user: true },
        });
    }

    async messages(params: {
        skip?: number;
        take?: number;
        cursor?: Prisma.MessageWhereUniqueInput;
        where?: Prisma.MessageWhereInput;
        orderBy?: Prisma.MessageOrderByWithRelationInput;
    }): Promise<Message[]> {
        const { skip, take, cursor, where, orderBy } = params;
        return this.prisma.message.findMany({
            skip,
            take,
            cursor,
            where,
            orderBy,
            include: { conversation: true, user: true },
        });
    }

    async createMessage(data: Prisma.MessageCreateInput): Promise<Message> {
        // Validate that the conversation exists before creating the message
        if (data.conversation?.connect?.id) {
            const conversationExists =
                await this.prisma.conversation.findUnique({
                    where: { id: data.conversation.connect.id },
                });

            if (!conversationExists) {
                throw new Error(
                    `Conversation with id ${data.conversation.connect.id} does not exist`
                );
            }
        }

        return this.prisma.message.create({
            data,
            include: { conversation: true, user: true },
        });
    }

    async updateMessage(params: {
        where: Prisma.MessageWhereUniqueInput;
        data: Prisma.MessageUpdateInput;
    }): Promise<Message> {
        const { where, data } = params;
        return this.prisma.message.update({
            data,
            where,
            include: { conversation: true, user: true },
        });
    }

    async deleteMessage(
        where: Prisma.MessageWhereUniqueInput
    ): Promise<Message> {
        return this.prisma.message.delete({
            where,
            include: { conversation: true, user: true },
        });
    }
}
