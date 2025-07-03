import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class User {
    @Field(() => ID)
    id: number;

    @Field()
    email: string;

    @Field()
    name: string;

    @Field({ nullable: true })
    avatar?: string;
}
