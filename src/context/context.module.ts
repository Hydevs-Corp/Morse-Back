import { Module } from '@nestjs/common';
import { ContextService } from './context.service';
import { DataLoaderModule } from '../dataloader/dataloader.module';

@Module({
    imports: [DataLoaderModule],
    providers: [ContextService],
    exports: [ContextService],
})
export class ContextModule {}
