import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { AuthService } from '../src/auth/auth.service';

describe('Messages E2E', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let authService: AuthService;
    let authToken: string;
    let testUser: any;
    let testConversation: any;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        prisma = moduleFixture.get<PrismaService>(PrismaService);
        authService = moduleFixture.get<AuthService>(AuthService);

        await app.init();

        await setupTestData();
    });

    afterAll(async () => {
        try {
            await cleanupTestData();
        } catch (error) {
            console.error('Error during cleanup:', error);
        } finally {
            await prisma.$disconnect();

            if (app) {
                await app.close();
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }
    });

    async function setupTestData() {
        testUser = await prisma.user.create({
            data: {
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User',
            },
        });

        testConversation = await prisma.conversation.create({
            data: {
                participants: {
                    connect: { id: testUser.id },
                },
            },
        });

        const { access_token } = await authService.login(testUser);
        authToken = `Bearer ${access_token}`;
    }

    async function cleanupTestData() {
        await prisma.message.deleteMany({
            where: { userId: testUser.id },
        });

        if (testConversation?.id) {
            await prisma.conversation.update({
                where: { id: testConversation.id },
                data: {
                    participants: {
                        disconnect: { id: testUser.id },
                    },
                },
            });

            await prisma.conversation.deleteMany({
                where: { id: testConversation.id },
            });
        }

        if (testUser?.id) {
            await prisma.user.deleteMany({
                where: { id: testUser.id },
            });
        }
    }

    describe('GraphQL Messages API', () => {
        const graphqlQuery = (query: string, variables?: any) => {
            return request(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', authToken)
                .send({
                    query,
                    variables,
                });
        };

        describe('sendMessage mutation', () => {
            it('should create a new message', async () => {
                const mutation = `
                    mutation SendMessage($conversationId: Int!, $content: String!) {
                        sendMessage(conversationId: $conversationId, content: $content) {
                            id
                            content
                            user {
                                id
                                email
                            }
                        }
                    }
                `;

                const variables = {
                    conversationId: testConversation.id,
                    content: 'Hello, this is a test message!',
                };

                const response = await graphqlQuery(mutation, variables);

                expect(response.status).toBe(200);
                expect(response.body.data.sendMessage).toMatchObject({
                    content: 'Hello, this is a test message!',
                    user: {
                        id: testUser.id.toString(),
                        email: 'test@example.com',
                    },
                });
                expect(response.body.data.sendMessage.id).toBeDefined();
            });

            it('should return error for invalid conversation ID', async () => {
                const mutation = `
                    mutation SendMessage($conversationId: Int!, $content: String!) {
                        sendMessage(conversationId: $conversationId, content: $content) {
                            id
                            content
                        }
                    }
                `;

                const variables = {
                    conversationId: 99999,
                    content: 'This should fail',
                };

                const response = await graphqlQuery(mutation, variables);

                expect(response.status).toBe(200);
                expect(response.body.errors).toBeDefined();
                expect(response.body.errors[0].message).toContain(
                    'Conversation'
                );
            });

            it('should require authentication', async () => {
                const mutation = `
                    mutation SendMessage($conversationId: Int!, $content: String!) {
                        sendMessage(conversationId: $conversationId, content: $content) {
                            id
                            content
                        }
                    }
                `;

                const variables = {
                    conversationId: testConversation.id,
                    content: 'This should be rejected',
                };

                const response = await request(app.getHttpServer())
                    .post('/graphql')

                    .send({
                        query: mutation,
                        variables,
                    });

                expect(response.status).toBe(200);
                expect(response.body.errors).toBeDefined();
                expect(response.body.errors[0].message).toContain(
                    'Unauthorized'
                );
            });
        });

        describe('messages query', () => {
            let testMessage: any;

            beforeAll(async () => {
                testMessage = await prisma.message.create({
                    data: {
                        content: 'Test message for query',
                        userId: testUser.id,
                        conversationId: testConversation.id,
                    },
                });
            });

            it('should fetch all messages', async () => {
                const query = `
                    query GetMessages {
                        messages {
                            id
                            content
                            user {
                                id
                                email
                            }
                        }
                    }
                `;

                const response = await graphqlQuery(query);

                expect(response.status).toBe(200);
                expect(response.body.data.messages).toBeInstanceOf(Array);
                expect(response.body.data.messages.length).toBeGreaterThan(0);

                const message = response.body.data.messages.find(
                    (m: any) => m.id === testMessage.id.toString()
                );
                expect(message).toMatchObject({
                    content: 'Test message for query',
                    user: {
                        id: testUser.id.toString(),
                        email: 'test@example.com',
                    },
                });
            });

            it('should fetch a specific message by ID', async () => {
                const query = `
                    query GetMessage($id: Int!) {
                        message(id: $id) {
                            id
                            content
                            user {
                                id
                                email
                            }
                        }
                    }
                `;

                const variables = { id: testMessage.id };

                const response = await graphqlQuery(query, variables);

                expect(response.status).toBe(200);
                expect(response.body.data.message).toMatchObject({
                    id: testMessage.id.toString(),
                    content: 'Test message for query',
                    user: {
                        id: testUser.id.toString(),
                        email: 'test@example.com',
                    },
                });
            });
        });

        describe('updateMessage mutation', () => {
            let testMessage: any;

            beforeEach(async () => {
                testMessage = await prisma.message.create({
                    data: {
                        content: 'Original content',
                        userId: testUser.id,
                        conversationId: testConversation.id,
                    },
                });
            });

            it('should update message content', async () => {
                const mutation = `
                    mutation UpdateMessage($messageId: Int!, $content: String!) {
                        updateMessage(messageId: $messageId, content: $content) {
                            id
                            content
                        }
                    }
                `;

                const variables = {
                    messageId: testMessage.id,
                    content: 'Updated content',
                };

                const response = await graphqlQuery(mutation, variables);

                expect(response.status).toBe(200);
                expect(response.body.data.updateMessage).toMatchObject({
                    id: testMessage.id.toString(),
                    content: 'Updated content',
                });
            });
        });

        describe('deleteMessage mutation', () => {
            let testMessage: any;

            beforeEach(async () => {
                testMessage = await prisma.message.create({
                    data: {
                        content: 'Message to delete',
                        userId: testUser.id,
                        conversationId: testConversation.id,
                    },
                });
            });

            it('should delete a message', async () => {
                const mutation = `
                    mutation DeleteMessage($messageId: Int!) {
                        deleteMessage(messageId: $messageId)
                    }
                `;

                const variables = { messageId: testMessage.id };

                const response = await graphqlQuery(mutation, variables);

                expect(response.status).toBe(200);
                expect(response.body.data.deleteMessage).toBe(true);

                const deletedMessage = await prisma.message.findUnique({
                    where: { id: testMessage.id },
                });
                expect(deletedMessage).toBeNull();
            });
        });
    });

    describe('Performance Tests', () => {
        it('should handle multiple concurrent message sends', async () => {
            const mutation = `
                mutation SendMessage($conversationId: Int!, $content: String!) {
                    sendMessage(conversationId: $conversationId, content: $content) {
                        id
                        content
                    }
                }
            `;

            const promises = Array.from({ length: 10 }, (_, i) =>
                request(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', authToken)
                    .send({
                        query: mutation,
                        variables: {
                            conversationId: testConversation.id,
                            content: `Concurrent message ${i}`,
                        },
                    })
            );

            const startTime = Date.now();
            const responses = await Promise.all(promises);
            const endTime = Date.now();

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.data.sendMessage).toBeDefined();
            });

            const duration = endTime - startTime;
            expect(duration).toBeLessThan(5000);

            console.log(`10 concurrent messages processed in ${duration}ms`);
        });

        it('should respond to sendMessage within acceptable time', async () => {
            const mutation = `
                mutation SendMessage($conversationId: Int!, $content: String!) {
                    sendMessage(conversationId: $conversationId, content: $content) {
                        id
                        content
                    }
                }
            `;

            const variables = {
                conversationId: testConversation.id,
                content: 'Performance test message',
            };

            const startTime = Date.now();

            const response = await request(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', authToken)
                .send({
                    query: mutation,
                    variables,
                });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            expect(response.status).toBe(200);
            expect(response.body.data.sendMessage).toBeDefined();

            expect(responseTime).toBeLessThan(1000);

            console.log(`sendMessage response time: ${responseTime}ms`);
        });
    });
});
