import { ApiRequestFilter } from './Api';

export class ValidationError extends Error {}

export const validateQuery = (request?: ApiRequestFilter): boolean => {
  if (!request?.query?.filter) {
    return true;
  }
  if (request?.query?.filter.date && request?.query?.filter.date?.gt) {
    return true;
  }
  throw new ValidationError('only filter[date][gt]= is accepted as filter');
};

export const validatePagination = (request?: ApiRequestFilter): boolean => {
  if (!request?.query?.page) {
    return true;
  }
  if (request?.query?.page?.limit) {
    return true;
  }
  throw new ValidationError('only page[limit]= is accepted for pagination');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateBody = (body: any): boolean => {
  if (typeof body.url !== 'string') {
    throw new ValidationError('url should exist and be a string');
  }
  return true;
};
