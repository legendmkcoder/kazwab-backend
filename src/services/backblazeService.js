const B2 = require('backblaze-b2');
const logger = require('../utils/logger');

class BackblazeService {
  constructor() {
    // Log configuration for debugging
    logger.info('Backblaze B2 Configuration:', {
      applicationKeyId: process.env.BUCKET_ACCESS_KEY ? 'Set' : 'Not set',
      applicationKey: process.env.BUCKET_SECRET_KEY ? 'Set' : 'Not set',
      bucketId: process.env.BUCKET_ID ? 'Set' : 'Not set',
      bucketName: process.env.BUCKET_NAME ? 'Set' : 'Not set',
      bucketUrl: process.env.BUCKET_URL ? 'Set' : 'Not set',
    });

    this.b2 = new B2({
      applicationKeyId: process.env.BUCKET_ACCESS_KEY,
      applicationKey: process.env.BUCKET_SECRET_KEY,
    });

    this.bucketId = process.env.BUCKET_ID;
    this.bucketName = process.env.BUCKET_NAME; // Use BUCKET_NAME as bucket name
    this.baseUrl = process.env.BUCKET_URL; // Use BUCKET_URL as base URL

    this.isAuthorized = false;
  }

  async authorize() {
    try {
      if (!this.isAuthorized) {
        await this.b2.authorize();
        this.isAuthorized = true;
        logger.info('Backblaze B2 authorized successfully');

        // Test the credentials by getting account info
        try {
          const accountInfo = await this.b2.getAccountInfo();
          logger.info('Account info:', {
            accountId: accountInfo.data.accountId,
            accountAuthToken: accountInfo.data.accountAuthToken
              ? 'Present'
              : 'Not present',
            apiUrl: accountInfo.data.apiUrl,
            downloadUrl: accountInfo.data.downloadUrl,
          });
        } catch (infoError) {
          logger.warn('Could not get account info:', infoError.message);
        }
      }
    } catch (error) {
      logger.error('Backblaze B2 authorization failed:', error);
      throw new Error('Failed to authorize with Backblaze B2');
    }
  }

  async uploadFile(fileBuffer, fileName, contentType) {
    try {
      await this.authorize();

      logger.info(
        `Starting upload for file: ${fileName}, size: ${fileBuffer.length}, type: ${contentType}`
      );

      // Try to use the bucket ID directly first
      let actualBucketId = this.bucketId;

      try {
        // Test if we can get upload URL with the provided bucket ID
        const uploadUrlResponse = await this.b2.getUploadUrl({
          bucketId: actualBucketId,
        });

        logger.info(`Got upload URL: ${uploadUrlResponse.data.uploadUrl}`);

        // Upload file
        const uploadResponse = await this.b2.uploadFile({
          uploadUrl: uploadUrlResponse.data.uploadUrl,
          uploadAuthToken: uploadUrlResponse.data.authorizationToken,
          fileName: fileName,
          data: fileBuffer,
          contentType: contentType,
        });

        const fileUrl = `${this.baseUrl}/file/${this.bucketName}/${fileName}`;

        logger.info(`File uploaded to Backblaze B2: ${fileName}`);

        return {
          fileId: uploadResponse.data.fileId,
          fileName: uploadResponse.data.fileName,
          fileUrl: fileUrl,
          size: uploadResponse.data.contentLength,
          contentType: uploadResponse.data.contentType,
          uploadTimestamp: uploadResponse.data.uploadTimestamp,
        };
      } catch (bucketError) {
        logger.warn(
          `Failed with provided bucket ID, trying to list buckets: ${bucketError.message}`
        );

        // If that fails, try to list buckets to find the correct one
        const bucketsResponse = await this.b2.listBuckets();
        logger.info(
          'Available buckets:',
          bucketsResponse.data.buckets.map((b) => ({
            bucketId: b.bucketId,
            bucketName: b.bucketName,
          }))
        );

        // Find the bucket by name
        const bucket = bucketsResponse.data.buckets.find(
          (b) => b.bucketName === this.bucketName
        );
        if (!bucket) {
          throw new Error(`Bucket '${this.bucketName}' not found`);
        }

        actualBucketId = bucket.bucketId;
        logger.info(
          `Using bucket ID: ${actualBucketId} for bucket: ${this.bucketName}`
        );

        // Get upload URL with correct bucket ID
        const uploadUrlResponse = await this.b2.getUploadUrl({
          bucketId: actualBucketId,
        });

        logger.info(`Got upload URL: ${uploadUrlResponse.data.uploadUrl}`);

        // Upload file
        const uploadResponse = await this.b2.uploadFile({
          uploadUrl: uploadUrlResponse.data.uploadUrl,
          uploadAuthToken: uploadUrlResponse.data.authorizationToken,
          fileName: fileName,
          data: fileBuffer,
          contentType: contentType,
        });

        const fileUrl = `${this.baseUrl}/file/${this.bucketName}/${fileName}`;

        logger.info(`File uploaded to Backblaze B2: ${fileName}`);

        return {
          fileId: uploadResponse.data.fileId,
          fileName: uploadResponse.data.fileName,
          fileUrl: fileUrl,
          size: uploadResponse.data.contentLength,
          contentType: uploadResponse.data.contentType,
          uploadTimestamp: uploadResponse.data.uploadTimestamp,
        };
      }
    } catch (error) {
      logger.error('Backblaze B2 upload failed:', error);

      // Log more details about the error
      if (error.response) {
        logger.error('Error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async deleteFile(fileName) {
    try {
      await this.authorize();

      // Get file info first
      const fileInfo = await this.b2.getFileInfo({
        fileName: fileName,
        bucketName: this.bucketName,
      });

      // Delete file
      await this.b2.deleteFileVersion({
        fileName: fileName,
        fileId: fileInfo.data.fileId,
      });

      logger.info(`File deleted from Backblaze B2: ${fileName}`);
      return true;
    } catch (error) {
      logger.error('Backblaze B2 delete failed:', error);
      // Don't throw error if file doesn't exist
      if (error.response && error.response.status === 404) {
        logger.warn(`File not found in Backblaze B2: ${fileName}`);
        return false;
      }
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getFileInfo(fileName) {
    try {
      await this.authorize();

      const fileInfo = await this.b2.getFileInfo({
        fileName: fileName,
        bucketName: this.bucketName,
      });

      return {
        fileId: fileInfo.data.fileId,
        fileName: fileInfo.data.fileName,
        fileUrl: `${this.baseUrl}/file/${this.bucketName}/${fileName}`,
        size: fileInfo.data.contentLength,
        contentType: fileInfo.data.contentType,
        uploadTimestamp: fileInfo.data.uploadTimestamp,
      };
    } catch (error) {
      logger.error('Backblaze B2 get file info failed:', error);
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  async listFiles(prefix = '', maxCount = 100) {
    try {
      await this.authorize();

      const files = await this.b2.listFileNames({
        bucketId: this.bucketId,
        prefix: prefix,
        maxFileCount: maxCount,
      });

      return files.data.files.map((file) => ({
        fileId: file.fileId,
        fileName: file.fileName,
        fileUrl: `${this.baseUrl}/file/${this.bucketName}/${file.fileName}`,
        size: file.contentLength,
        contentType: file.contentType,
        uploadTimestamp: file.uploadTimestamp,
      }));
    } catch (error) {
      logger.error('Backblaze B2 list files failed:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  getFileUrl(fileName) {
    return `${this.baseUrl}/file/${this.bucketName}/${fileName}`;
  }

  // Helper method to generate unique filename
  generateFileName(originalName, prefix = '') {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = originalName.split('.').pop();
    const name = originalName.split('.').slice(0, -1).join('.');

    const fileName = prefix
      ? `${prefix}/${name}-${timestamp}-${random}.${ext}`
      : `${name}-${timestamp}-${random}.${ext}`;

    return fileName;
  }
}

// Create singleton instance
const backblazeService = new BackblazeService();

module.exports = backblazeService;
