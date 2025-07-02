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
        if (!participantIds || participantIds.length === 0) {
            return [];
        }

        const uniqueParticipantIds = [...new Set(participantIds)];

        const conversations = await this.prisma.conversation.findMany({
            include: {
                participants: true,
            },
        });

        return conversations.filter(conversation => {
            const conversationParticipantIds = conversation.participants
                .map(p => p.id)
                .sort();
            const sortedProvidedIds = uniqueParticipantIds.sort();

            return (
                conversationParticipantIds.length ===
                    sortedProvidedIds.length &&
                conversationParticipantIds.every(
                    (id, index) => id === sortedProvidedIds[index]
                )
            );
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
