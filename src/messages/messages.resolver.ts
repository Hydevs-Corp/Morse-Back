import {
    Resolver,
    Query,
    Args,
    Int,
    Mutation,
    ResolveField,
    Parent,
    Subscription,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Message } from './message.model';
import { PrismaService } from '../prisma.service';
import { User } from '../users/user.model';
import { Conversation } from '../conversations/conversation.model';
import { ConversationsService } from '../conversations/conversations.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class MessageUpdatePayload {
    @Field()
    id: string;

    @Field()
    content: string;

    @Field()
    conversationId: string;
}

@ObjectType()
class MessageDeletePayload {
    @Field(() => Int)
    messageId: number;

    @Field()
    conversationId: string;
}

@Resolver(() => Message)
export class MessagesResolver {
    constructor(
        private readonly messagesService: MessagesService,
        private readonly prisma: PrismaService,
        private readonly conversationsService: ConversationsService,
        private readonly pubSubService: PubSubService,
        private readonly rabbitmqService: RabbitmqService
    ) {}

    @Query(() => [Message])
    async messages() {
        return this.messagesService.messages({});
    }

    @Query(() => Message, { nullable: true })
    async message(@Args('id', { type: () => Int }) id: number) {
        return this.messagesService.message({ id });
    }

    @Mutation(() => Message)
    @UseGuards(GqlAuthGuard)
    async sendMessage(
        @Args('conversationId', { type: () => Int }) conversationId: number,
        @Args('content') content: string,
        @CurrentUser() currentUser: any
    ) {
        try {
            const message = await this.messagesService.createMessage({
                conversation: { connect: { id: conversationId } },
                user: { connect: { id: currentUser.id } },
                content,
            });

            // Send message to RabbitMQ
            await this.rabbitmqService.sendMessage({
                id: message.id,
                content: message.content,
                conversationId: conversationId,
                userId: currentUser.id,
                createdAt: message.createdAt,
                updatedAt: message.updatedAt,
                user: {
                    id: currentUser.id,
                    username: currentUser.name,
                    email: currentUser.email,
                },
                conversation: {
                    id: conversationId,
                    participants: [], // Will be populated below
                },
            });

            const participants =
                await this.conversationsService.getConversationsParticipants(
                    conversationId
                );

            participants.forEach(participant => {
                this.pubSubService.publish(`messageAdded_${participant.id}`, {
                    messageAdded: {
                        ...message,
                        user: currentUser,
                        conversationId: conversationId, // Keep as number to avoid type confusion
                    },
                });
            });

            return message;
        } catch (error) {
            console.error('Error creating message:', error);
            throw error;
        }
    }

    @Mutation(() => Message)
    @UseGuards(GqlAuthGuard)
    async updateMessage(
        @Args('messageId', { type: () => Int }) messageId: number,
        @Args('content') content: string,
        @CurrentUser() currentUser: any
    ) {
        const updatedMessage = await this.messagesService.updateMessage({
            where: { id: messageId },
            data: { content },
        });

        const fullMessage = await this.messagesService.message({
            id: messageId,
        });

        const participants =
            await this.conversationsService.getConversationsParticipants(
                (updatedMessage as any).conversationId
            );

        participants.forEach(participant => {
            this.pubSubService.publish(`messageUpdated_${participant.id}`, {
                messageUpdated: {
                    id: messageId.toString(),
                    content,
                    conversationId: (
                        updatedMessage as any
                    ).conversationId.toString(),
                },
            });
        });

        return fullMessage;
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async deleteMessage(
        @Args('messageId', { type: () => Int }) messageId: number,
        @CurrentUser() currentUser: any
    ): Promise<boolean> {
        const deletedMessage = await this.messagesService.deleteMessage({
            id: messageId,
        });

        const participants =
            await this.conversationsService.getConversationsParticipants(
                (deletedMessage as any).conversationId
            );

        participants.forEach(participant => {
            this.pubSubService.publish(`messageDeleted_${participant.id}`, {
                messageDeleted: {
                    messageId,
                    conversationId: (
                        deletedMessage as any
                    ).conversationId.toString(),
                },
            });
        });

        return true;
    }

    @Mutation(() => Message)
    async createMessage(
        @Args('conversationId', { type: () => Int }) conversationId: number,
        @Args('userId', { type: () => Int }) userId: number,
        @Args('content') content: string
    ) {
        return this.messagesService.createMessage({
            conversation: { connect: { id: conversationId } },
            user: { connect: { id: userId } },
            content,
        });
    }

    @Subscription(() => Message)
    messageAdded(@Args('userId', { type: () => Int }) userId: number) {
        return this.pubSubService.asyncIterableIterator(
            `messageAdded_${userId}`
        );
    }

    @Subscription(() => MessageUpdatePayload)
    messageUpdated(@Args('userId', { type: () => Int }) userId: number) {
        return this.pubSubService.asyncIterableIterator(
            `messageUpdated_${userId}`
        );
    }

    @Subscription(() => MessageDeletePayload)
    messageDeleted(@Args('userId', { type: () => Int }) userId: number) {
        return this.pubSubService.asyncIterableIterator(
            `messageDeleted_${userId}`
        );
    }

    @ResolveField(() => Conversation)
    async conversation(@Parent() message: Message) {
        const conversationId =
            (message as any).conversationId ?? message.conversation?.id;

        // Ensure conversationId is a number for Prisma
        const id =
            typeof conversationId === 'string'
                ? parseInt(conversationId, 10)
                : conversationId;

        return this.prisma.conversation.findUnique({
            where: { id },
        });
    }

    @ResolveField(() => User)
    async user(@Parent() message: Message) {
        const userId = (message as any).userId ?? message.user?.id;

        // Ensure userId is a number for Prisma
        const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;

        return this.prisma.user.findUnique({
            where: { id },
        });
    }
}
