import { Injectable } from '@nestjs/common';
import * as DataLoader from 'dataloader';
import { PrismaService } from '../prisma.service';
import { User } from '../users/user.model';
import { Conversation } from '../conversations/conversation.model';
import { Message } from '../messages/message.model';

@Injectable()
export class DataLoaderService {
    constructor(private readonly prisma: PrismaService) {}

    createUserLoader(): DataLoader<number, User | null> {
        return new DataLoader<number, User | null>(
            async (userIds: readonly number[]) => {
                const users = await this.prisma.user.findMany({
                    where: {
                        id: { in: [...userIds] },
                    },
                });

                const userMap = new Map(
                    users.map(user => [
                        user.id,
                        { ...user, name: user.name || undefined },
                    ])
                );
                return userIds.map(id => userMap.get(id) || null);
            }
        );
    }

    createConversationLoader(): DataLoader<number, Conversation | null> {
        return new DataLoader<number, Conversation | null>(
            async (conversationIds: readonly number[]) => {
                const conversations = await this.prisma.conversation.findMany({
                    where: {
                        id: { in: [...conversationIds] },
                    },
                    include: {
                        participants: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                                password: true,
                            },
                        },
                        messages: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        name: true,
                                        password: true,
                                    },
                                },
                            },
                        },
                    },
                });

                const conversationMap = new Map(
                    conversations.map(conv => [
                        conv.id,
                        {
                            ...conv,
                            participants: conv.participants.map(
                                participant => ({
                                    ...participant,
                                    name: participant.name ?? undefined,
                                })
                            ),
                            messages: conv.messages.map(message => ({
                                ...message,
                                user: {
                                    ...message.user,
                                    name: message.user.name ?? undefined,
                                },
                                conversation: {
                                    id: conv.id,
                                    name: conv.name ?? '',
                                    createdAt: conv.createdAt,
                                    updatedAt: conv.updatedAt,
                                    participants: conv.participants.map(
                                        participant => ({
                                            ...participant,
                                            name: participant.name ?? undefined,
                                        })
                                    ),
                                    messages: [],
                                },
                            })),
                        },
                    ])
                );
                return conversationIds.map(
                    id => conversationMap.get(id) || null
                );
            }
        );
    }

    createConversationsByUserLoader(): DataLoader<number, Conversation[]> {
        return new DataLoader<number, Conversation[]>(
            async (userIds: readonly number[]) => {
                const conversations = await this.prisma.conversation.findMany({
                    where: {
                        participants: {
                            some: {
                                id: { in: [...userIds] },
                            },
                        },
                    },
                    include: {
                        participants: true,
                        messages: {
                            include: {
                                user: true,
                            },
                        },
                    },
                });

                const conversationsByUser = new Map<number, Conversation[]>();
                userIds.forEach(userId => {
                    conversationsByUser.set(userId, []);
                });

                conversations.forEach(conversation => {
                    const fixedParticipants = conversation.participants.map(
                        participant => ({
                            ...participant,
                            name: participant.name ?? undefined,
                        })
                    );
                    const fixedMessages = conversation.messages.map(
                        message => ({
                            ...message,
                            user: {
                                ...message.user,
                                name: message.user.name ?? undefined,
                            },
                            conversation: {
                                id: conversation.id,
                                createdAt: conversation.createdAt,
                                updatedAt: conversation.updatedAt,
                                participants: fixedParticipants,
                                messages: [],
                            },
                        })
                    );
                    const fixedConversation: Conversation = {
                        ...conversation,
                        participants: fixedParticipants,
                        messages: fixedMessages as any,
                    };
                    conversation.participants.forEach(participant => {
                        if (userIds.includes(participant.id)) {
                            const userConversations =
                                conversationsByUser.get(participant.id) || [];
                            userConversations.push(fixedConversation);
                            conversationsByUser.set(
                                participant.id,
                                userConversations
                            );
                        }
                    });
                });

                return userIds.map(
                    userId => conversationsByUser.get(userId) || []
                );
            }
        );
    }

    createMessagesByUserLoader(): DataLoader<number, Message[]> {
        return new DataLoader<number, Message[]>(
            async (userIds: readonly number[]) => {
                const messages = await this.prisma.message.findMany({
                    where: {
                        userId: { in: [...userIds] },
                    },
                    include: {
                        conversation: {
                            include: {
                                participants: {
                                    select: {
                                        id: true,
                                        email: true,
                                        name: true,
                                        password: true,
                                    },
                                },
                            },
                        },
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                                password: true,
                            },
                        },
                    },
                });

                const messagesByUser = new Map<number, Message[]>();
                userIds.forEach(userId => {
                    messagesByUser.set(userId, []);
                });

                messages.forEach(message => {
                    const userMessages =
                        messagesByUser.get(message.userId) || [];

                    const fixedMessage = {
                        ...message,
                        user: {
                            ...message.user,
                            name: message.user.name ?? undefined,
                        },
                        conversation: {
                            ...message.conversation,
                            participants: message.conversation.participants.map(
                                participant => ({
                                    ...participant,
                                    name: participant.name ?? undefined,
                                })
                            ),
                            messages: [],
                        },
                    };
                    userMessages.push(fixedMessage as Message);
                    messagesByUser.set(message.userId, userMessages);
                });

                return userIds.map(userId => messagesByUser.get(userId) || []);
            }
        );
    }

    createMessagesByConversationLoader(): DataLoader<number, Message[]> {
        return new DataLoader<number, Message[]>(
            async (conversationIds: readonly number[]) => {
                const messages = await this.prisma.message.findMany({
                    where: {
                        conversationId: { in: [...conversationIds] },
                    },
                    include: {
                        conversation: {
                            include: {
                                participants: {
                                    select: {
                                        id: true,
                                        email: true,
                                        name: true,
                                        password: true,
                                    },
                                },
                            },
                        },
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                                password: true,
                            },
                        },
                    },
                });

                const messagesByConversation = new Map<number, Message[]>();
                conversationIds.forEach(conversationId => {
                    messagesByConversation.set(conversationId, []);
                });

                messages.forEach(message => {
                    const conversationMessages =
                        messagesByConversation.get(message.conversationId) ||
                        [];

                    const fixedMessage = {
                        ...message,
                        user: {
                            ...message.user,
                            name: message.user.name ?? undefined,
                        },
                        conversation: {
                            ...message.conversation,
                            participants: message.conversation.participants.map(
                                participant => ({
                                    ...participant,
                                    name: participant.name ?? undefined,
                                })
                            ),
                            messages: [],
                        },
                    };
                    conversationMessages.push(fixedMessage as Message);
                    messagesByConversation.set(
                        message.conversationId,
                        conversationMessages
                    );
                });

                return conversationIds.map(
                    conversationId =>
                        messagesByConversation.get(conversationId) || []
                );
            }
        );
    }

    createParticipantsByConversationLoader(): DataLoader<number, User[]> {
        return new DataLoader<number, User[]>(
            async (conversationIds: readonly number[]) => {
                const conversations = await this.prisma.conversation.findMany({
                    where: {
                        id: { in: [...conversationIds] },
                    },
                    include: {
                        participants: true,
                    },
                });

                const participantsByConversation = new Map<number, User[]>();
                conversationIds.forEach(conversationId => {
                    participantsByConversation.set(conversationId, []);
                });

                conversations.forEach(conversation => {
                    participantsByConversation.set(
                        conversation.id,
                        conversation.participants.map(participant => ({
                            ...participant,
                            name: participant.name || undefined,
                        }))
                    );
                });

                return conversationIds.map(
                    conversationId =>
                        participantsByConversation.get(conversationId) || []
                );
            }
        );
    }
}
