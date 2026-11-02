import { isLoopbackEndpoint } from './r2.service';

describe('isLoopbackEndpoint', () => {
  it.each([
    'http://localhost:9000',
    'http://127.0.0.1:9000',
    'http://[::1]:9000',
    'http://skillex-uploads.localhost:9000',
  ])('treats %s as loopback', (endpoint) => {
    expect(isLoopbackEndpoint(endpoint)).toBe(true);
  });

  it.each([
    'https://9d466d4d040b47709e862bc51cd61aa0.r2.cloudflarestorage.com',
    'https://s3.eu-west-1.amazonaws.com',
    'https://storage.example.com',
  ])('does not treat %s as loopback', (endpoint) => {
    expect(isLoopbackEndpoint(endpoint)).toBe(false);
  });

  it('returns false for an invalid endpoint', () => {
    expect(isLoopbackEndpoint('not-a-url')).toBe(false);
  });
});
