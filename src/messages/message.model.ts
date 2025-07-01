import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { User } from '../users/user.model';
import { Conversation } from '../conversations/conversation.model';

@ObjectType()
export class Message {
    @Field(() => ID)
    id: number;

    @Field(() => Conversation)
    conversation: Conversation;

    @Field(() => User)
    user: User;

    @Field()
    content: string;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}
