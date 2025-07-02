import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { User } from '../users/user.model';
import { Message } from '../messages/message.model';

@ObjectType()
export class Conversation {
    @Field(() => ID)
    id: number;

    @Field(() => String)
    name: string;

    @Field(() => [User])
    participants: User[];

    @Field(() => [Message])
    messages: Message[];

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;

    @Field(() => String, { nullable: true })
    lastMessageDate?: string;
}
