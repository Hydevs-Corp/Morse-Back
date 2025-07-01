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

@Module({
    imports: [
        ConfigModule.forRoot(),
        PubSubModule,
        AuthModule,
        UsersModule,
        ConversationsModule,
        MessagesModule,
        RabbitmqModule,
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            graphiql: true,
            autoSchemaFile: true,
            sortSchema: true,
            subscriptions: {
                'graphql-ws': true,
            },
            context: ({ req, connection }) => {
                if (connection) {
                    // For subscriptions
                    return { req: connection.context };
                }
                // For queries and mutations
                return { req };
            },
        }),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
