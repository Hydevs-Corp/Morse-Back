import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlLocalAuthGuard extends AuthGuard('local') {
    getRequest(context: ExecutionContext) {
        const ctx = GqlExecutionContext.create(context);
        const gqlContext = ctx.getContext();
        const gqlArgs = ctx.getArgs();
        gqlContext.req.body = { ...gqlContext.req.body, ...gqlArgs };
        return gqlContext.req;
    }
}
