'use client';

import { useRef, useState } from 'react';

import { useAuth } from '@/components/ui/auth-provider';
import { SCREENSHOT_BUCKET, useSignedScreenshotUrls } from '@/lib/screenshot-urls';
import { cx } from '@/lib/utils';

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function getStorageUploadErrorMessage(error: { message?: string }) {
  const message = error.message?.trim() || 'Screenshot upload failed.';
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes('bucket not found') ||
    normalizedMessage.includes('the resource was not found')
  ) {
    return `Storage bucket "${SCREENSHOT_BUCKET}" is missing. Create it in Supabase Storage, then retry the upload.`;
  }

  if (
    normalizedMessage.includes('row-level security') ||
    normalizedMessage.includes('policy') ||
    normalizedMessage.includes('permission')
  ) {
    return 'Storage policy blocked the upload. Check the journal-screenshots bucket policies in Supabase.';
  }

  return message;
}

type ScreenshotInputProps = {
  id: string;
  kind: 'analysis' | 'trade';
  label?: string;
  onChange: (value: string[]) => void;
  value: string[];
};

function getReadableSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(bytes > 1024 * 1024 ? 1 : 2)}MB`;
}

function getFileExtension(file: File) {
  if (file.type === 'image/png') {
    return 'png';
  }

  if (file.type === 'image/jpeg') {
    return 'jpg';
  }

  if (file.type === 'image/webp') {
    return 'webp';
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension && ['png', 'jpg', 'jpeg', 'webp'].includes(extension)
    ? extension
    : 'png';
}

function createRandomId() {
  const browserCrypto =
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (browserCrypto?.randomUUID) {
    return browserCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (browserCrypto?.getRandomValues) {
    browserCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function createStoragePath(kind: ScreenshotInputProps['kind'], file: File) {
  const extension = getFileExtension(file);
  return `screenshots/${kind}s/${Date.now()}-${createRandomId()}.${extension}`;
}

function validateScreenshotFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Use a PNG, JPG, JPEG or WebP image.';
  }

  if (file.size > MAX_SCREENSHOT_BYTES) {
    return `Image is too large. Max size is ${getReadableSize(MAX_SCREENSHOT_BYTES)}.`;
  }

  return null;
}

function isValidImageUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ScreenshotInput({
  id,
  kind,
  label = 'Screenshot',
  onChange,
  value,
}: ScreenshotInputProps) {
  const { supabase, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<'upload' | 'url'>(value.length > 0 ? 'url' : 'upload');
  const [urlDraft, setUrlDraft] = useState('');
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const screenshotUrls = value.map((item) => item.trim()).filter(Boolean);
  const signedScreenshotUrls = useSignedScreenshotUrls(supabase, screenshotUrls);
  const screenshotUrl = screenshotUrls[0] ?? '';
  const imageFailed = Boolean(screenshotUrl && failedImageUrl === screenshotUrl);

  async function uploadFile(file: File) {
    const validationError = validateScreenshotFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!supabase || !user) {
      setError('Sign in before uploading screenshots.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const storagePath = createStoragePath(kind, file);
    const { error: uploadError } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setError(getStorageUploadErrorMessage(uploadError));
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from(SCREENSHOT_BUCKET)
      .getPublicUrl(storagePath);

    if (!data.publicUrl) {
      setError('Upload completed, but the public URL could not be created.');
      setIsUploading(false);
      return;
    }

    setFailedImageUrl(null);
    onChange([...screenshotUrls, data.publicUrl]);
    setMode('upload');
    setIsUploading(false);
  }

  function handleUrlChange(nextValue: string) {
    setUrlDraft(nextValue);
    setFailedImageUrl(null);
    setError(
      isValidImageUrl(nextValue)
        ? null
        : 'Use a valid http or https screenshot URL.',
    );
  }

  function addUrlDraft() {
    const trimmedValue = urlDraft.trim();

    if (!trimmedValue) {
      return;
    }

    if (!isValidImageUrl(trimmedValue)) {
      setError('Use a valid http or https screenshot URL.');
      return;
    }

    onChange([...new Set([...screenshotUrls, trimmedValue])]);
    setUrlDraft('');
    setError(null);
    setFailedImageUrl(null);
  }

  function handleFileSelection(fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    void uploadFile(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;

    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
      return;
    }

    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith('image/'),
    );

    if (!imageItem) {
      setError('Clipboard does not contain an image.');
      return;
    }

    const file = imageItem.getAsFile();

    if (!file) {
      setError('Clipboard image could not be read.');
      return;
    }

    event.preventDefault();
    void uploadFile(file);
  }

  return (
    <div
      className="rounded-[24px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 shadow-[0_18px_42px_-34px_var(--shadow-color)] md:col-span-2"
      tabIndex={0}
      onPaste={handlePaste}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Paste, upload, or link a screenshot.
          </p>
        </div>
        {screenshotUrl ? (
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 text-sm font-medium text-rose-700 transition hover:border-rose-500/34 hover:bg-rose-500/16 dark:text-rose-300"
            type="button"
            onClick={() => {
              onChange([]);
              setError(null);
              setFailedImageUrl(null);
            }}
          >
            Remove screenshot
          </button>
        ) : null}
      </div>

      <div className="mt-4 inline-flex rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] p-1">
        {(['upload', 'url'] as const).map((nextMode) => (
          <button
            key={nextMode}
            className={cx(
              'min-h-9 rounded-full px-4 text-sm font-medium transition',
              mode === nextMode
                ? 'bg-[var(--surface-raised)] text-[var(--foreground)] shadow-[0_10px_24px_-20px_var(--shadow-color)]'
                : 'text-[var(--muted-strong)] hover:text-[var(--foreground)]',
            )}
            type="button"
            onClick={() => {
              setMode(nextMode);
              setError(null);
            }}
          >
            {nextMode === 'upload' ? 'Upload / Paste' : 'URL'}
          </button>
        ))}
      </div>

      {mode === 'url' ? (
        <label className="mt-4 block" htmlFor={id}>
          <span className="mb-2 block text-sm font-medium text-[var(--muted-strong)]">
            Screenshot URL
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="min-h-12 w-full rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
              id={id}
              placeholder="https://..."
              type="url"
              value={urlDraft}
              onChange={(event) => handleUrlChange(event.target.value)}
            />
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-4 text-sm font-medium text-[var(--accent-text)] transition hover:border-[color:var(--accent-border-strong)]"
              type="button"
              onClick={addUrlDraft}
            >
              Add URL
            </button>
          </div>
        </label>
      ) : (
        <div
          className={cx(
            'mt-4 rounded-[22px] border border-dashed px-4 py-6 text-center transition',
            dragActive
              ? 'border-[color:var(--accent-border-strong)] bg-[var(--accent-soft-bg)]'
              : 'border-[color:var(--border-color)] bg-[var(--surface)]',
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleFileSelection(event.dataTransfer.files);
          }}
        >
          <input
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            type="file"
            onChange={(event) => handleFileSelection(event.target.files)}
          />
          <p className="text-sm font-medium text-[var(--foreground)]">
            Drop images here or click to upload
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            PNG, JPG, JPEG or WebP up to {getReadableSize(MAX_SCREENSHOT_BYTES)}.
            You can also focus this area and paste an image.
          </p>
          <button
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-4 text-sm font-medium text-[var(--accent-text)] transition hover:border-[color:var(--accent-border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUploading}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? 'Uploading...' : 'Upload screenshot'}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-[18px] border border-rose-500/18 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {screenshotUrls.length > 0 ? (
        imageFailed ? (
          <div className="mt-4 rounded-[20px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
            Preview unavailable. The URL will still be saved.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {screenshotUrls.map((url, index) => {
              const displayUrl = signedScreenshotUrls[index] ?? url;

              return (
              <a
                key={`${url}-${index}`}
                className="group block overflow-hidden rounded-[20px] border border-[color:var(--border-color)] bg-[var(--surface)]"
                href={displayUrl}
                rel="noreferrer"
                target="_blank"
              >
                <div className="aspect-[16/9] min-h-[130px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`Screenshot preview ${index + 1}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                    src={displayUrl}
                    onError={() => setFailedImageUrl(url)}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-[color:var(--border-color)] px-3 py-2">
                  <span className="text-xs text-[var(--muted)]">Screenshot {index + 1}</span>
                  <button
                    className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-300"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      onChange(screenshotUrls.filter((item) => item !== url));
                    }}
                  >
                    Remove
                  </button>
                </div>
              </a>
              );
            })}
          </div>
        )
      ) : (
        <div className="mt-4 rounded-[20px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
          No screenshot attached yet.
        </div>
      )}
    </div>
  );
}
