export type Cookie = {
  name: string;
  value: string;
  domain?: string;
  expirationDate?: number;
  hostOnly?: boolean;
  httpOnly?: boolean;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
  session?: boolean;
  storeId?: string;
};
