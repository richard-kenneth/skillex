import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { BaseIssue, safeParse, type GenericSchema } from 'valibot';

@Injectable()
export class ValibotValidationPipe implements PipeTransform {
  constructor(private schema: GenericSchema) {}

  transform(value: unknown) {
    const result = safeParse(this.schema, value);

    if (result.success) {
      return result.output;
    }

    const messages = result.issues.map((issue: BaseIssue<unknown>) => ({
      path: issue.path?.map((p) => p.key).join('.'),
      message: issue.message,
    }));

    throw new BadRequestException({
      message: 'Validation failed',
      errors: messages,
    });
  }
}
