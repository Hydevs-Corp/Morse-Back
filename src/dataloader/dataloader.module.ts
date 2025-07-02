import { Module } from '@nestjs/common';
import { DataLoaderService } from './dataloader.service';
import { PrismaService } from '../prisma.service';

@Module({
    providers: [DataLoaderService, PrismaService],
    exports: [DataLoaderService],
})
export class DataLoaderModule {}
