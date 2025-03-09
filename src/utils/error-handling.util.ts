import { HttpException, HttpStatus } from '@nestjs/common';

export class ErrorHandling {
    static throwCustomError(message: string, statusCode: number = HttpStatus.BAD_REQUEST) {
        throw new HttpException(
            {
                status: statusCode,
                error: message,
            },
            statusCode,
        );
    }

    static handleMongoError(error: any) {
        if (error.name === 'ValidationError') {
            this.throwCustomError('Validation error: ' + error.message, HttpStatus.BAD_REQUEST);
        }
        if (error.code === 11000) {
            this.throwCustomError('Duplicate key error', HttpStatus.CONFLICT);
        }
        this.throwCustomError('Database error: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
