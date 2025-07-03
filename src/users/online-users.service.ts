import { Injectable, OnModuleInit } from '@nestjs/common';
import { PubSubService } from '../pubsub/pubsub.service';

export interface OnlineUser {
    userId: string;
    lastConnection: Date;
}

@Injectable()
export class OnlineUsersService implements OnModuleInit {
    private onlineUsers: Map<string, Date> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(private readonly pubSubService: PubSubService) {}

    onModuleInit() {
        this.cleanupInterval = setInterval(
            () => {
                this.cleanupStaleConnections(30);
            },
            10 * 60 * 1000
        );
    }

    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }

    setUserOnline(userId: string): void {
        console.log(`Setting user online: ${userId}`);
        this.onlineUsers.set(userId, new Date());
        console.log(
            `Current online users: ${Array.from(this.onlineUsers.keys()).join(', ')}`
        );
        this.publishUpdate();
    }

    setUserOffline(userId: string): void {
        console.log(`Setting user offline: ${userId}`);
        this.onlineUsers.delete(userId);
        console.log(
            `Current online users: ${Array.from(this.onlineUsers.keys()).join(', ')}`
        );
        this.publishUpdate();
    }

    getOnlineUsers(): OnlineUser[] {
        return Array.from(this.onlineUsers.entries()).map(
            ([userId, lastConnection]) => ({
                userId,
                lastConnection,
            })
        );
    }

    isUserOnline(userId: string): boolean {
        return this.onlineUsers.has(userId);
    }

    private publishUpdate(): void {
        const onlineList = this.getOnlineUsers();
        console.log('Publishing online users update:', onlineList);
        this.pubSubService.publish('onlineUsersUpdated', {
            onlineUsersUpdated: { online: onlineList },
        });
    }

    cleanupStaleConnections(maxAgeMinutes: number = 30): void {
        const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
        let hasChanges = false;

        for (const [userId, lastConnection] of this.onlineUsers.entries()) {
            if (lastConnection < cutoff) {
                this.onlineUsers.delete(userId);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            this.publishUpdate();
        }
    }
}
