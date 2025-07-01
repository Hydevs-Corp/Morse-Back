import {
    Resolver,
    Query,
    Args,
    Int,
    Mutation,
    ResolveField,
    Parent,
    Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { Conversation } from './conversation.model';
import { PrismaService } from '../prisma.service';
import { User } from '../users/user.model';
import { Message } from '../messages/message.model';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Resolver(() => Conversation)
export class ConversationsResolver {
    constructor(
        private readonly conversationsService: ConversationsService,
        private readonly prisma: PrismaService
    ) {}

    @Query(() => [Conversation])
    async conversations() {
        return this.conversationsService.conversations({});
    }

    @Query(() => Conversation, { nullable: true })
    async conversation(@Args('id', { type: () => Int }) id: number) {
        return this.conversationsService.conversation({ id });
    }

    @Query(() => [Conversation])
    async conversationsByParticipant(
        @Args({ name: 'participantIds', type: () => [Int] })
        participantIds: number[]
    ) {
        const conversations = await this.conversationsService.conversations({
            where: {
                participants: {
                    every: {
                        id: { in: participantIds },
                    },
                },
            },
        });
        return conversations.filter(conv => {
            return true;
        });
    }

    @Query(() => [Conversation])
    @UseGuards(GqlAuthGuard)
    async getMyConversations(@CurrentUser() user: any) {
        if (!user?.id) {
            throw new Error('Not authenticated');
        }
        return this.conversationsService.conversations({
            where: {
                participants: {
                    some: { id: user.id },
                },
            },
        });
    }

    @Mutation(() => Conversation)
    @UseGuards(GqlAuthGuard)
    async createConversation(
        @Args({ name: 'participantIds', type: () => [Int] })
        participantIds: number[],
        @CurrentUser() user: any
    ) {
        // Ensure the current user is included in the conversation
        const allParticipantIds = [...new Set([...participantIds, user.id])];
        return this.conversationsService.createConversation({
            participants: { connect: allParticipantIds.map(id => ({ id })) },
        });
    }

    @Mutation(() => Conversation)
    @UseGuards(GqlAuthGuard)
    async deleteConversation(
        @Args('id', { type: () => Int }) id: number,
        @CurrentUser() user: any
    ) {
        // You might want to add additional authorization logic here
        // to ensure the user can only delete conversations they're part of
        return this.conversationsService.deleteConversation({ id });
    }

    @ResolveField(() => [User])
    async participants(@Parent() conversation: Conversation) {
        return this.prisma.user.findMany({
            where: {
                conversations: {
                    some: { id: conversation.id },
                },
            },
        });
    }

    @ResolveField(() => [Message])
    async messages(@Parent() conversation: Conversation) {
        return this.prisma.message.findMany({
            where: { conversationId: conversation.id },
        });
    }

    @ResolveField(() => String, { nullable: true })
    async lastMessageDate(@Parent() conversation: Conversation) {
        const lastMessage = await this.prisma.message.findFirst({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'desc' },
        });
        return lastMessage ? lastMessage.createdAt.toISOString() : null;
    }
}
