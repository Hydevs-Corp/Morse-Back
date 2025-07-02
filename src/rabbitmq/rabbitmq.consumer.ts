import { Injectable, Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PubSubService } from '../pubsub/pubsub.service';
import {
    MessageEvent,
    MessageUpdateEvent,
    MessageDeleteEvent,
} from './rabbitmq.service';

@Controller()
@Injectable()
export class RabbitmqConsumer {
    constructor(private readonly pubSubService: PubSubService) {}

    @EventPattern('message_created')
    async handleMessageCreated(@Payload() message: MessageEvent) {
        console.log('Processing message from RabbitMQ:', message.id);

        try {
            const participants = message.conversation.participants;
            participants.forEach(participant => {
                this.pubSubService.publish(`messageAdded_${participant.id}`, {
                    messageAdded: message,
                });
            });

            console.log(
                'Message sent to GraphQL subscription clients:',
                message.id
            );
        } catch (error) {
            console.error('Error processing message from RabbitMQ:', error);
        }
    }

    @EventPattern('message_updated')
    async handleMessageUpdated(@Payload() messageUpdate: MessageUpdateEvent) {
        console.log(
            'Processing message update from RabbitMQ:',
            messageUpdate.messageId
        );

        try {
            this.pubSubService.publish('messageUpdated_global', {
                messageUpdated: messageUpdate,
            });

            console.log(
                'Message update sent to GraphQL subscription clients:',
                messageUpdate.messageId
            );
        } catch (error) {
            console.error(
                'Error processing message update from RabbitMQ:',
                error
            );
        }
    }

    @EventPattern('message_deleted')
    async handleMessageDeleted(@Payload() messageDelete: MessageDeleteEvent) {
        console.log(
            'Processing message delete from RabbitMQ:',
            messageDelete.messageId
        );

        try {
            this.pubSubService.publish('messageDeleted_global', {
                messageDeleted: messageDelete,
            });

            console.log(
                'Message delete sent to GraphQL subscription clients:',
                messageDelete.messageId
            );
        } catch (error) {
            console.error(
                'Error processing message delete from RabbitMQ:',
                error
            );
        }
    }
}
