import {
  buildAvatarKey,
  buildChatAttachmentKey,
  buildDocumentKey,
  getAttachmentExtension,
  getAvatarExtension,
  isExchangeChatKey,
  isOwnedAvatarKey,
  sanitizeFileName,
} from './upload-policy';

describe('upload policy', () => {
  it('allows only safe avatar MIME types', () => {
    expect(getAvatarExtension('image/png')).toBe('png');
    expect(getAvatarExtension('image/jpeg')).toBe('jpg');
    expect(getAvatarExtension('image/svg+xml')).toBeNull();
    expect(getAvatarExtension('text/html')).toBeNull();
  });

  it('derives storage extensions from MIME types, not file names', () => {
    expect(buildAvatarKey('user-1', 'image/png')).toMatch(
      /^avatars\/user-1-\d+\.png$/,
    );
    expect(buildDocumentKey('user-1', 'application/pdf')).toMatch(
      /^documents\/user-1\/[a-f0-9-]+\.pdf$/,
    );
    expect(buildChatAttachmentKey('exchange-1', 'image/webp')).toMatch(
      /^exchange-chat\/exchange-1\/[a-f0-9-]+\.webp$/,
    );
    expect(() => buildDocumentKey('user-1', 'text/html')).toThrow();
  });

  it('only accepts avatar keys owned by the current user', () => {
    expect(isOwnedAvatarKey('user-1', 'avatars/user-1-1700000000000.png')).toBe(
      true,
    );
    expect(isOwnedAvatarKey('user-2', 'avatars/user-1-1700000000000.png')).toBe(
      false,
    );
    expect(isOwnedAvatarKey('user-1', 'avatars/user-1-1700000000000.svg')).toBe(
      false,
    );
    expect(
      isOwnedAvatarKey('user-1', 'avatars/user-1-../user-2-1700000000000.png'),
    ).toBe(false);
  });

  it('only signs chat attachments from the current exchange', () => {
    expect(
      isExchangeChatKey('exchange-1', 'exchange-chat/exchange-1/file.png'),
    ).toBe(true);
    expect(
      isExchangeChatKey('exchange-2', 'exchange-chat/exchange-1/file.png'),
    ).toBe(false);
    expect(
      isExchangeChatKey('exchange-1', 'exchange-chat/exchange-1/../other.png'),
    ).toBe(false);
    expect(
      isExchangeChatKey(
        'exchange-1',
        'exchange-chat/exchange-1/nested/file.png',
      ),
    ).toBe(false);
  });

  it('sanitizes display names and rejects path components', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('my<script>.png')).toBe('my_script_.png');
    expect(sanitizeFileName('')).toBe('attachment');
  });

  it('accepts common document types but not executable content', () => {
    expect(getAttachmentExtension('application/pdf')).toBe('pdf');
    expect(getAttachmentExtension('application/zip')).toBe('zip');
    expect(getAttachmentExtension('application/x-msdownload')).toBeNull();
    expect(getAttachmentExtension('text/html')).toBeNull();
  });
});
