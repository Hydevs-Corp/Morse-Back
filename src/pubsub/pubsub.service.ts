import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class PubSubService extends PubSub implements OnModuleDestroy {
    constructor() {
        super();
    }

    async onModuleDestroy() {
        try {
            this.ee.removeAllListeners();
        } catch (error) {}
    }
}
