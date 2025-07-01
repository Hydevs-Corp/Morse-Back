import {
    Resolver,
    Query,
    Args,
    Int,
    Mutation,
    ResolveField,
    Parent,
    Subscription,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.model';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { GqlLocalAuthGuard } from '../auth/gql-local-auth.guard';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthPayload } from './auth-payload.model';
import { PrismaService } from '../prisma.service';
import { Conversation } from '../conversations/conversation.model';
import { Message } from '../messages/message.model';
import { PubSubService } from '../pubsub/pubsub.service';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class OnlineUser {
    @Field()
    userId: string;

    @Field()
    lastConnection: Date;
}

@ObjectType()
class OnlineUsersPayload {
    @Field(() => [OnlineUser])
    online: OnlineUser[];
}

@Resolver(() => User)
export class UsersResolver {
    private onlineUsers: Set<string> = new Set();

    constructor(
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
        private readonly prisma: PrismaService,
        private readonly pubSubService: PubSubService
    ) {}

    @Query(() => [User])
    async users() {
        return this.usersService.users({});
    }

    @Query(() => User, { nullable: true })
    async user(@Args('id', { type: () => Int }) id: number) {
        return this.usersService.user({ id });
    }

    @Mutation(() => AuthPayload)
    async signup(
        @Args('email') email: string,
        @Args('password') password: string,
        @Args('name', { nullable: true }) name?: string
    ) {
        const hash = await bcrypt.hash(password, 10);
        const user = await this.usersService.createUser({
            email,
            password: hash,
            name,
        });

        const { access_token } = await this.authService.login(user);
        return { user, token: access_token };
    }

    @Mutation(() => String)
    async signin(
        @Args('email') email: string,
        @Args('password') password: string,
        @CurrentUser() user: any
    ) {
        if (user) {
            throw new Error('You are already logged in');
        }

        const authUser = await this.authService.validateUser(email, password);
        if (!authUser) {
            throw new Error('Invalid credentials');
        }

        const { access_token } = await this.authService.login(authUser);
        return access_token;
    }

    @Query(() => User)
    @UseGuards(GqlAuthGuard)
    async me(@CurrentUser() user: any) {
        return this.usersService.user({ id: user.id });
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async setUserOnline(@CurrentUser() user: any): Promise<boolean> {
        this.onlineUsers.add(user.id.toString());

        const onlineList = Array.from(this.onlineUsers).map(userId => ({
            userId,
            lastConnection: new Date(),
        }));

        // Publish to all users
        this.pubSubService.publish('onlineUsersUpdated', {
            onlineUsersUpdated: { online: onlineList },
        });

        return true;
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async setUserOffline(@CurrentUser() user: any): Promise<boolean> {
        this.onlineUsers.delete(user.id.toString());

        const onlineList = Array.from(this.onlineUsers).map(userId => ({
            userId,
            lastConnection: new Date(),
        }));

        // Publish to all users
        this.pubSubService.publish('onlineUsersUpdated', {
            onlineUsersUpdated: { online: onlineList },
        });

        return true;
    }

    @Subscription(() => OnlineUsersPayload)
    onlineUsersUpdated() {
        return this.pubSubService.asyncIterableIterator('onlineUsersUpdated');
    }

    @ResolveField(() => [Conversation])
    async conversations(@Parent() user: User) {
        return this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: { id: user.id },
                },
            },
        });
    }

    @ResolveField(() => [Message])
    async messages(@Parent() user: User) {
        return this.prisma.message.findMany({
            where: { userId: user.id },
        });
    }
}
