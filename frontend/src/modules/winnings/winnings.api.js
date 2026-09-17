import { api, ApiClientError } from '../../services/api.js';
import { notifySessionLoss } from '../../services/session.js';
export const getWinnings = (page, signal) =>
  api(`/winnings?page=${page}&limit=12`, { signal });
export const getWinning = (id, signal) => api('/winnings/' + id, { signal });
export function uploadProof(id, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '') +
        '/winnings/' +
        id +
        '/proof',
    );
    xhr.withCredentials = true;
    xhr.timeout = 45000;
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('X-CSRF-Protection', '1');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(
        new ApiClientError('Upload could not reach the service. Please retry.'),
      );
    xhr.ontimeout = () =>
      reject(
        new ApiClientError(
          'Upload timed out. Refresh the claim before retrying.',
        ),
      );
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        notifySessionLoss(xhr.status, data.error?.code);
        if (xhr.status >= 200 && xhr.status < 300 && data.success)
          resolve(data.data);
        else
          reject(
            new ApiClientError(data.error?.message || 'Upload failed.', {
              status: xhr.status,
              code: data.error?.code,
            }),
          );
      } catch {
        reject(
          new ApiClientError(
            'Invalid upload response. Refresh before retrying.',
          ),
        );
      }
    };
    xhr.send(file);
  });
}
export async function proofUrl(id, submissionId, admin = false) {
  const response = await fetch(
    (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '') +
      `/${admin ? 'admin/winners' : 'winnings'}/${id}/proof/${submissionId}`,
    { credentials: 'include', signal: AbortSignal.timeout(35000) },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    notifySessionLoss(response.status, body.error?.code);
    throw new Error('Evidence could not be downloaded. Please retry.');
  }
  const url = URL.createObjectURL(await response.blob());
  return url;
}
export async function downloadProof(id, submissionId, admin = false) {
  const url = await proofUrl(id, submissionId, admin);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'winning-proof.png';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
