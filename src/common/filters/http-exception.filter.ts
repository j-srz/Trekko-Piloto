import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Request, Response } from 'express';

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  requestId?: string;
};

const statusTitles: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
};

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request & { id?: string }>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const detail = this.getDetail(responseBody, status);
    const code = this.getCode(responseBody, status);
    const problem: ProblemDetails = {
      type: `https://httpstatuses.com/${status}`,
      title:
        statusTitles[status] ??
        (status >= 500 ? 'Internal Server Error' : 'Error'),
      status,
      detail,
      instance: request.originalUrl ?? request.url,
      code,
    };
    if (request.id) {
      problem.requestId = request.id;
    }

    if (status >= 500) {
      this.logger.error(
        { status, requestId: request.id, path: request.url },
        'Unhandled HTTP error',
      );
    }
    response.status(status).type('application/problem+json').json(problem);
  }

  private getDetail(
    response: string | object | undefined,
    status: number,
  ): string {
    if (status >= 500) {
      return 'An unexpected error occurred';
    }
    if (typeof response === 'string') {
      return response;
    }
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const message = response.message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }
    return 'Request failed';
  }

  private getCode(
    response: string | object | undefined,
    status: number,
  ): string {
    if (
      typeof response === 'object' &&
      response !== null &&
      'code' in response
    ) {
      return String(response.code);
    }
    if (status === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED';
    if (status === HttpStatus.FORBIDDEN) return 'FORBIDDEN';
    if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
    if (status === HttpStatus.CONFLICT) return 'CONFLICT';
    if (status === HttpStatus.TOO_MANY_REQUESTS) return 'RATE_LIMITED';
    if (status === HttpStatus.BAD_REQUEST) return 'VALIDATION_ERROR';
    return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR';
  }
}
