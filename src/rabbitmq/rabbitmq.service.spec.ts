import { Test, TestingModule } from '@nestjs/testing';
import { RabbitmqService, MessageEvent } from './rabbitmq.service';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';

describe('RabbitmqService', () => {
    let service: RabbitmqService;
    let clientProxy: ClientProxy;

    const mockClientProxy = {
        emit: jest.fn(),
    };

    const mockMessageEvent: MessageEvent = {
        id: 1,
        content: 'Test message',
        conversationId: 1,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
        },
        conversation: {
            id: 1,
            participants: [{ id: 1 }, { id: 2 }],
        },
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

        service = module.get<RabbitmqService>(RabbitmqService);
        clientProxy = module.get<ClientProxy>('RABBITMQ_SERVICE');

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendMessage', () => {
        it('should successfully send a message to RabbitMQ', async () => {
            mockClientProxy.emit.mockReturnValue(of({}));

            await service.sendMessage(mockMessageEvent);

            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_created',
                mockMessageEvent
            );
        });

        it('should log message when NODE_ENV is not test', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            mockClientProxy.emit.mockReturnValue(of({}));
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await service.sendMessage(mockMessageEvent);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Message sent to RabbitMQ:',
                mockMessageEvent.id
            );

            consoleSpy.mockRestore();
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('should handle errors when sending message', async () => {
            const error = new Error('RabbitMQ connection failed');
            mockClientProxy.emit.mockReturnValue(throwError(() => error));

            await expect(service.sendMessage(mockMessageEvent)).rejects.toThrow(
                'RabbitMQ connection failed'
            );
        });

        it('should log error when NODE_ENV is not test', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = new Error('RabbitMQ connection failed');
            mockClientProxy.emit.mockReturnValue(throwError(() => error));
            const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation();

            await expect(service.sendMessage(mockMessageEvent)).rejects.toThrow(
                'RabbitMQ connection failed'
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error sending message to RabbitMQ:',
                error
            );

            consoleErrorSpy.mockRestore();
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('should call emit with correct pattern and payload', async () => {
            mockClientProxy.emit.mockReturnValue(of({}));

            await service.sendMessage(mockMessageEvent);

            expect(mockClientProxy.emit).toHaveBeenCalledTimes(1);
            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_created',
                expect.objectContaining({
                    id: mockMessageEvent.id,
                    content: mockMessageEvent.content,
                    conversationId: mockMessageEvent.conversationId,
                    userId: mockMessageEvent.userId,
                    user: expect.objectContaining({
                        id: mockMessageEvent.user.id,
                        username: mockMessageEvent.user.username,
                        email: mockMessageEvent.user.email,
                    }),
                    conversation: expect.objectContaining({
                        id: mockMessageEvent.conversation.id,
                        participants:
                            mockMessageEvent.conversation.participants,
                    }),
                })
            );
        });
    });

    describe('sendMessageUpdate', () => {
        it('should successfully send message update to RabbitMQ', async () => {
            const updateEvent = {
                messageId: 1,
                content: 'Updated content',
                conversationId: 1,
                userId: 1,
            };

            mockClientProxy.emit.mockReturnValue(of({}));

            await service.sendMessageUpdate(updateEvent);

            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_updated',
                updateEvent
            );
        });
    });

    describe('sendMessageDelete', () => {
        it('should successfully send message deletion to RabbitMQ', async () => {
            const deleteEvent = {
                messageId: 1,
                conversationId: 1,
                userId: 1,
            };

            mockClientProxy.emit.mockReturnValue(of({}));

            await service.sendMessageDelete(deleteEvent);

            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_deleted',
                deleteEvent
            );
        });
    });

    describe('error handling', () => {
        it('should propagate errors from client proxy', async () => {
            const networkError = new Error('Network timeout');
            mockClientProxy.emit.mockReturnValue(
                throwError(() => networkError)
            );

            await expect(service.sendMessage(mockMessageEvent)).rejects.toThrow(
                'Network timeout'
            );
        });

        it('should handle null/undefined message gracefully', async () => {
            mockClientProxy.emit.mockReturnValue(of({}));

            // The service doesn't validate input, so it will pass null to RabbitMQ
            await service.sendMessage(null as any);

            expect(mockClientProxy.emit).toHaveBeenCalledWith(
                'message_created',
                null
            );
        });
    });
});
