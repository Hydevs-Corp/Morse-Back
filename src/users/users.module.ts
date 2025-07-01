import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { UsersResolver } from './users.resolver';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [JwtModule],
    providers: [
        UsersService,
        PrismaService,
        UsersResolver,
        AuthService,
        ConfigService,
    ],
    exports: [UsersService],
})
export class UsersModule {}
