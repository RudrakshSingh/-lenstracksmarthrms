const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

function sanitizeFileName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180);
}

function getBucket() {
  return process.env.JTS_ATTACHMENTS_S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;
}

function getClient() {
  const region = process.env.AWS_REGION || 'ap-south-1';
  return new S3Client({ region });
}

/**
 * Presigned PUT for direct browser/client upload to S3. Then POST metadata to JTS with returned file_key.
 */
async function getUploadUrlForTask({ tenantId, taskId, file_name, mime_type }) {
  const bucket = getBucket();
  if (!bucket) {
    throw new Error('JTS_ATTACHMENT_STORAGE_NOT_CONFIGURED');
  }

  const prefix = (process.env.JTS_ATTACHMENTS_S3_PREFIX || 'jts-attachments').replace(/\/$/, '');
  const key = `${prefix}/${tenantId}/${taskId}/${uuidv4()}-${sanitizeFileName(file_name)}`;
  const client = getClient();
  const ttl = Number(process.env.JTS_ATTACHMENT_UPLOAD_TTL_SEC) || 900;
  const contentType = mime_type || 'application/octet-stream';

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });

  const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: ttl });

  return {
    storage: 's3',
    bucket,
    file_key: key,
    upload_url: uploadUrl,
    expires_in_seconds: ttl,
    upload_headers: {
      'Content-Type': contentType
    }
  };
}

/**
 * Presigned GET for downloading an object stored at file_key.
 */
async function getDownloadUrl({ file_key, mime_type, file_name }) {
  const bucket = getBucket();
  if (!bucket) {
    throw new Error('JTS_ATTACHMENT_STORAGE_NOT_CONFIGURED');
  }

  const client = getClient();
  const ttl = Number(process.env.JTS_ATTACHMENT_DOWNLOAD_TTL_SEC) || 300;

  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: file_key,
    ...(mime_type ? { ResponseContentType: mime_type } : {}),
    ...(file_name
      ? {
          ResponseContentDisposition: `attachment; filename="${sanitizeFileName(file_name)}"`
        }
      : {})
  });

  const downloadUrl = await getSignedUrl(client, cmd, { expiresIn: ttl });

  return {
    download_url: downloadUrl,
    expires_in_seconds: ttl
  };
}

function isS3PresignConfigured() {
  return !!getBucket();
}

module.exports = {
  getUploadUrlForTask,
  getDownloadUrl,
  isS3PresignConfigured
};
