import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import {
    RabbitmqService,
    MessageEvent,
    MessageUpdateEvent,
    MessageDeleteEvent,
} from '../rabbitmq/rabbitmq.service';
import { Message, User, Conversation } from '@prisma/client';
import { of, throwError } from 'rxjs';

describe('RabbitMQ Service Integration', () => {
    let rabbitmqService: RabbitmqService;
    let clientProxy: jest.Mocked<ClientProxy>;

    const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
    };

    const mockConversation: Conversation = {
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockMessage: Message = {
        id: 1,
        conversationId: 1,
        userId: 1,
        content: 'Integration test message',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockMessageEvent: MessageEvent = {
        ...mockMessage,
        user: {
            id: mockUser.id,
            username: mockUser.name || 'testuser',
            email: mockUser.email,
        },
        conversation: {
            id: mockConversation.id,
            participants: [{ id: mockUser.id }],
        },
    };

    const mockMessageUpdateEvent: MessageUpdateEvent = {
        messageId: mockMessage.id,
        content: mockMessage.content,
        conversationId: mockMessage.conversationId,
        userId: mockMessage.userId,
    };

    const mockMessageDeleteEvent: MessageDeleteEvent = {
        messageId: mockMessage.id,
        conversationId: mockMessage.conversationId,
        userId: mockMessage.userId,
    };

    const mockClientProxy = {
        emit: jest.fn(),
        send: jest.fn(),
        connect: jest.fn(),
        close: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RabbitmqService,
                {
                    provide: 'RABBITMQ_SERVICE',
                    useValue: mockClientProxy,
                },
            ],
        }).compile();

        rabbitmqService = module.get<RabbitmqService>(RabbitmqService);
        clientProxy = module.get('RABBITMQ_SERVICE');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('sendMessage', () => {
        it('should emit message with correct pattern and payload', async () => {
            // Arrange
            mockClientProxy.emit.mockReturnValue(of({}));

            // Act
            await rabbitmqService.sendMessage(mockMessageEvent);

            // Assert
            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_created',
                mockMessageEvent
            );
        });

        it('should handle timeout errors gracefully', async () => {
            // Arrange
            mockClientProxy.emit.mockReturnValue(
                throwError(() => new Error('Network timeout'))
            );

            // Act & Assert
            await expect(
                rabbitmqService.sendMessage(mockMessageEvent)
            ).rejects.toThrow('Network timeout');
        });
    });

    describe('sendMessageUpdate', () => {
        it('should emit update with correct pattern and payload', async () => {
            // Arrange
            mockClientProxy.emit.mockReturnValue(of({}));

            // Act
            await rabbitmqService.sendMessageUpdate(mockMessageUpdateEvent);

            // Assert
            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_updated',
                mockMessageUpdateEvent
            );
        });
    });

    describe('sendMessageDelete', () => {
        it('should emit delete with correct pattern and payload', async () => {
            // Arrange
            mockClientProxy.emit.mockReturnValue(of({}));

            // Act
            await rabbitmqService.sendMessageDelete(mockMessageDeleteEvent);

            // Assert
            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_deleted',
                mockMessageDeleteEvent
            );
        });
    });

    describe('multiple operations', () => {
        it('should emit correct patterns for different operations', async () => {
            // Arrange
            mockClientProxy.emit.mockReturnValue(of({}));

            // Act
            await rabbitmqService.sendMessage(mockMessageEvent);
            await rabbitmqService.sendMessageUpdate(mockMessageUpdateEvent);
            await rabbitmqService.sendMessageDelete(mockMessageDeleteEvent);

            // Assert
            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_created',
                mockMessageEvent
            );
            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_updated',
                mockMessageUpdateEvent
            );
            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_deleted',
                mockMessageDeleteEvent
            );
            expect(mockClientProxy.emit).toHaveBeenCalledTimes(3);
        });

        it('should handle partial failures in multiple operations', async () => {
            // Arrange
            mockClientProxy.emit
                .mockReturnValueOnce(of({})) // First call succeeds
                .mockReturnValueOnce(
                    throwError(() => new Error('RabbitMQ timeout'))
                ) // Second call fails
                .mockReturnValueOnce(of({})); // Third call succeeds

            // Act & Assert
            await expect(
                rabbitmqService.sendMessage(mockMessageEvent)
            ).resolves.toBeUndefined();
            await expect(
                rabbitmqService.sendMessageUpdate(mockMessageUpdateEvent)
            ).rejects.toThrow('RabbitMQ timeout');
            await expect(
                rabbitmqService.sendMessageDelete(mockMessageDeleteEvent)
            ).resolves.toBeUndefined();

            expect(mockClientProxy.emit).toHaveBeenCalledTimes(3);
        });
    });

    describe('connection management', () => {
        it('should handle connection initialization', async () => {
            // Arrange
            mockClientProxy.connect.mockResolvedValue(undefined);

            // Act
            await rabbitmqService.onModuleInit();

            // Assert
            expect(mockClientProxy.connect).toHaveBeenCalled();
        });

        it('should handle connection cleanup', async () => {
            // Arrange
            mockClientProxy.close.mockResolvedValue(undefined);

            // Act
            await rabbitmqService.onModuleDestroy();

            // Assert
            expect(mockClientProxy.close).toHaveBeenCalled();
        });
    });
});
