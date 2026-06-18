import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("app.storage")


class StorageService:
    def __init__(self):
        # Configure the S3 client to target local MinIO (or AWS S3)
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=f"http://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",  # Required dummy region for MinIO
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME

    def initialize_bucket(self) -> None:
        """
        Create the target bucket on startup if it doesn't already exist.
        """
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Storage bucket '{self.bucket_name}' already exists.")
        except ClientError as e:
            # If bucket not found, create it
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "404" or error_code == "NoSuchBucket":
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"Created storage bucket '{self.bucket_name}'.")

                    # Set policy to allow public read access to thumbnails or files if desired
                    # For MVP, we use presigned URLs for strict security, so we keep bucket private.
                except Exception as create_err:
                    logger.error(
                        f"Failed to create bucket '{self.bucket_name}': {create_err}"
                    )
            else:
                logger.error(f"Error checking bucket existence: {e}")

    def upload_file(
        self, file_data: bytes, file_name: str, content_type: str
    ) -> Optional[str]:
        """
        Upload file data to MinIO bucket.
        Returns the raw S3 storage path key if successful, or None.
        """
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=file_data,
                ContentType=content_type,
            )
            logger.info(f"Uploaded file '{file_name}' to storage.")
            # Return the unique key/file_name as reference
            return file_name
        except Exception as e:
            logger.error(f"Failed to upload file '{file_name}': {e}")
            return None

    def get_presigned_url(
        self, file_name: str, expires_in_seconds: int = 3600
    ) -> Optional[str]:
        """
        Generate a secure pre-signed download URL for a file.
        Adjusts internal container endpoints to local host address for client access.
        """
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": file_name},
                ExpiresIn=expires_in_seconds,
            )
            # If the backend is running inside docker, the url generated uses 'http://minio:9000/...'
            # Clients (host browsers/apps) cannot resolve 'minio:9000'.
            # We rewrite 'minio:9000' to 'localhost:9000' for host accessibility.
            if "minio:9000" in url:
                url = url.replace("minio:9000", "localhost:9000")

            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for '{file_name}': {e}")
            return None

    def delete_file(self, file_name: str) -> bool:
        """
        Delete a file object from the storage bucket.
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_name)
            logger.info(f"Deleted file '{file_name}' from storage.")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file '{file_name}': {e}")
            return False

    def get_file(self, file_name: str) -> Optional[bytes]:
        """
        Download raw file bytes from the storage bucket.
        """
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=file_name)
            return response["Body"].read()
        except Exception as e:
            logger.error(f"Failed to download file '{file_name}': {e}")
            return None


storage_service = StorageService()

