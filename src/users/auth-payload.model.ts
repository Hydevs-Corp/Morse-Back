import { ObjectType, Field } from '@nestjs/graphql';
import { User } from './user.model';

@ObjectType()
export class AuthPayload {
    @Field(() => User)
    user: User;

    @Field()
    token: string;
}
