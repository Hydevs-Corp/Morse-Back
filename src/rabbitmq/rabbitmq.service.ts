import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

export interface MessageEvent {
    id: number;
    content: string;
    conversationId: number;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: number;
        username: string;
        email: string;
    };
    conversation: {
        id: number;
        participants: Array<{ id: number }>;
    };
}

export interface MessageUpdateEvent {
    messageId: number;
    content: string;
    conversationId: number;
    userId: number;
}

export interface MessageDeleteEvent {
    messageId: number;
    conversationId: number;
    userId: number;
}

@Injectable()
export class RabbitmqService implements OnModuleDestroy {
    constructor(
        @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy
    ) {}

    async sendMessage(message: MessageEvent): Promise<void> {
        try {
            await firstValueFrom(this.client.emit('message_created', message));
            if (process.env.NODE_ENV !== 'test') {
                console.log('Message sent to RabbitMQ:', message.id);
            }
        } catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error('Error sending message to RabbitMQ:', error);
            }
            throw error;
        }
    }

    async sendMessageUpdate(messageUpdate: MessageUpdateEvent): Promise<void> {
        try {
            await firstValueFrom(
                this.client.emit('message_updated', messageUpdate)
            );
            if (process.env.NODE_ENV !== 'test') {
                console.log(
                    'Message update sent to RabbitMQ:',
                    messageUpdate.messageId
                );
            }
        } catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error(
                    'Error sending message update to RabbitMQ:',
                    error
                );
            }
            throw error;
        }
    }

    async sendMessageDelete(messageDelete: MessageDeleteEvent): Promise<void> {
        try {
            await firstValueFrom(
                this.client.emit('message_deleted', messageDelete)
            );
            if (process.env.NODE_ENV !== 'test') {
                console.log(
                    'Message delete sent to RabbitMQ:',
                    messageDelete.messageId
                );
            }
        } catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error(
                    'Error sending message delete to RabbitMQ:',
                    error
                );
            }
            throw error;
        }
    }

    async onModuleInit() {
        await this.client.connect();
    }

    async onModuleDestroy() {
        try {
            await this.client.close();
        } catch (error) {
            // Ignore errors during cleanup as connections might already be closed
            if (process.env.NODE_ENV !== 'test') {
                console.warn('Error closing RabbitMQ connection:', error);
            }
        }
    }
}
