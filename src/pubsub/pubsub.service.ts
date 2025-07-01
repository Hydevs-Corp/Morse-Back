import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class PubSubService extends PubSub implements OnModuleDestroy {
    constructor() {
        super();
    }

    async onModuleDestroy() {
        // Close any subscriptions and clean up resources
        try {
            // The PubSub from graphql-subscriptions doesn't expose a direct close method
            // but we can manually clean up any event listeners if needed
            this.ee.removeAllListeners();
        } catch (error) {
            // Ignore errors during cleanup
        }
    }
}
