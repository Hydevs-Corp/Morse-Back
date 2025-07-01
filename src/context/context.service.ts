import { Injectable } from '@nestjs/common';
import * as DataLoader from 'dataloader';
import { DataLoaderService } from '../dataloader/dataloader.service';
import { User } from '../users/user.model';
import { Conversation } from '../conversations/conversation.model';
import { Message } from '../messages/message.model';

export interface GraphQLContext {
    req: any;
    loaders: {
        userLoader: DataLoader<number, User | null>;
        conversationLoader: DataLoader<number, Conversation | null>;
        conversationsByUserLoader: DataLoader<number, Conversation[]>;
        messagesByUserLoader: DataLoader<number, Message[]>;
        messagesByConversationLoader: DataLoader<number, Message[]>;
        participantsByConversationLoader: DataLoader<number, User[]>;
    };
}

@Injectable()
export class ContextService {
    constructor(private readonly dataLoaderService: DataLoaderService) {}

    createContext({
        req,
        connection,
    }: {
        req?: any;
        connection?: any;
    }): GraphQLContext {
        return {
            req: connection ? connection.context : req,
            loaders: {
                userLoader: this.dataLoaderService.createUserLoader(),
                conversationLoader:
                    this.dataLoaderService.createConversationLoader(),
                conversationsByUserLoader:
                    this.dataLoaderService.createConversationsByUserLoader(),
                messagesByUserLoader:
                    this.dataLoaderService.createMessagesByUserLoader(),
                messagesByConversationLoader:
                    this.dataLoaderService.createMessagesByConversationLoader(),
                participantsByConversationLoader:
                    this.dataLoaderService.createParticipantsByConversationLoader(),
            },
        };
    }
}
