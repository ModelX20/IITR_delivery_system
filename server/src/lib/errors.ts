// Throw an AppError anywhere in a route or service to send { error: message } with that status.
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
