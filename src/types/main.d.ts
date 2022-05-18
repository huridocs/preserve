declare namespace Preserve {
  type Cookie = {
    domain?: string;
    expirationDate?: number;
    hostOnly?: boolean;
    httpOnly?: boolean;
    name: string;
    path?: string;
    sameSite?: string;
    secure?: boolean;
    session?: boolean;
    storeId?: string;
    value: string;
  };
}
