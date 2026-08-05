const TOKEN_KEY = 'tawalian_api_token';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const getApiToken = () => localStorage.getItem(TOKEN_KEY);
export const setApiToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearApiToken = () => localStorage.removeItem(TOKEN_KEY);

export const apiRequest = async <T>(
  pathname: string,
  options: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(options.headers);
  const token = getApiToken();
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(pathname, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      body.error || 'Permintaan ke backend gagal.',
      response.status,
      body.code,
    );
  }
  return body as T;
};
