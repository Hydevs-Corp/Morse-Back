import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma.service';
import { Message, User, Conversation } from '@prisma/client';

describe('MessagesService', () => {
    let service: MessagesService;
    let prismaService: PrismaService;

    const mockMessage: Message = {
        id: 1,
        content: 'Test message',
        userId: 1,
        conversationId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockUser: Partial<User> = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
    };

    const mockConversation: Partial<Conversation> = {
        id: 1,
    };

    const mockMessageWithRelations = {
        ...mockMessage,
        user: mockUser,
        conversation: mockConversation,
    };

    const mockPrismaService = {
        message: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        conversation: {
            findUnique: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagesService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<MessagesService>(MessagesService);
        prismaService = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('message', () => {
        it('should return a message by id', async () => {
            mockPrismaService.message.findUnique.mockResolvedValue(
                mockMessageWithRelations
            );

            const result = await service.message({ id: 1 });

            expect(result).toEqual(mockMessageWithRelations);
            expect(mockPrismaService.message.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                include: { conversation: true, user: true },
            });
        });

        it('should return null if message not found', async () => {
            mockPrismaService.message.findUnique.mockResolvedValue(null);

            const result = await service.message({ id: 999 });

            expect(result).toBeNull();
        });
    });

    describe('messages', () => {
        it('should return an array of messages', async () => {
            const mockMessages = [mockMessageWithRelations];
            mockPrismaService.message.findMany.mockResolvedValue(mockMessages);

            const result = await service.messages({});

            expect(result).toEqual(mockMessages);
            expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
                skip: undefined,
                take: undefined,
                cursor: undefined,
                where: undefined,
                orderBy: undefined,
                include: { conversation: true, user: true },
            });
        });

        it('should apply pagination parameters', async () => {
            const params = {
                skip: 10,
                take: 5,
                orderBy: { createdAt: 'desc' as const },
            };

            mockPrismaService.message.findMany.mockResolvedValue([]);

            await service.messages(params);

            expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
                ...params,
                cursor: undefined,
                where: undefined,
                include: { conversation: true, user: true },
            });
        });
    });

    describe('createMessage', () => {
        it('should create and return a new message', async () => {
            const createData = {
                content: 'New message',
                user: { connect: { id: 1 } },
                conversation: { connect: { id: 1 } },
            };

            mockPrismaService.conversation.findUnique.mockResolvedValue(
                mockConversation
            );

            mockPrismaService.message.create.mockResolvedValue(
                mockMessageWithRelations
            );

            const result = await service.createMessage(createData);

            expect(result).toEqual(mockMessageWithRelations);
            expect(
                mockPrismaService.conversation.findUnique
            ).toHaveBeenCalledWith({
                where: { id: 1 },
            });
            expect(mockPrismaService.message.create).toHaveBeenCalledWith({
                data: createData,
                include: { conversation: true, user: true },
            });
        });

        it('should throw error when conversation does not exist', async () => {
            const createData = {
                content: 'New message',
                user: { connect: { id: 1 } },
                conversation: { connect: { id: 999 } },
            };

            mockPrismaService.conversation.findUnique.mockResolvedValue(null);

            await expect(service.createMessage(createData)).rejects.toThrow(
                'Conversation with id 999 does not exist'
            );

            expect(
                mockPrismaService.conversation.findUnique
            ).toHaveBeenCalledWith({
                where: { id: 999 },
            });
            expect(mockPrismaService.message.create).not.toHaveBeenCalled();
        });
    });

    describe('updateMessage', () => {
        it('should update and return the message', async () => {
            const updateParams = {
                where: { id: 1 },
                data: { content: 'Updated message' },
            };

            const updatedMessage = {
                ...mockMessageWithRelations,
                content: 'Updated message',
            };

            mockPrismaService.message.update.mockResolvedValue(updatedMessage);

            const result = await service.updateMessage(updateParams);

            expect(result).toEqual(updatedMessage);
            expect(mockPrismaService.message.update).toHaveBeenCalledWith({
                data: updateParams.data,
                where: updateParams.where,
                include: { conversation: true, user: true },
            });
        });
    });

    describe('deleteMessage', () => {
        it('should delete and return the message', async () => {
            mockPrismaService.message.delete.mockResolvedValue(
                mockMessageWithRelations
            );

            const result = await service.deleteMessage({ id: 1 });

            expect(result).toEqual(mockMessageWithRelations);
            expect(mockPrismaService.message.delete).toHaveBeenCalledWith({
                where: { id: 1 },
                include: { conversation: true, user: true },
            });
        });
    });
});
