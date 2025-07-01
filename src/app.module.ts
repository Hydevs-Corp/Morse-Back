import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { PubSubModule } from './pubsub/pubsub.module';
import { ContextModule } from './context/context.module';
import { ContextService } from './context/context.service';

@Module({
    imports: [
        ConfigModule.forRoot(),
        PubSubModule,
        ContextModule,
        AuthModule,
        UsersModule,
        ConversationsModule,
        MessagesModule,
        RabbitmqModule,
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
            driver: ApolloDriver,
            imports: [ContextModule],
            inject: [ContextService],
            useFactory: (contextService: ContextService) => ({
                graphiql: true,
                autoSchemaFile: true,
                sortSchema: true,
                subscriptions: {
                    'graphql-ws': true,
                },
                context: ({
                    req,
                    connection,
                }: {
                    req?: any;
                    connection?: any;
                }) => {
                    return contextService.createContext({ req, connection });
                },
            }),
        }),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
