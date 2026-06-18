import boto3
from botocore.client import Config
import requests

bucket_name = "health-documents"
# Use the key from the user's error message
file_key = "221140d5-94e2-4025-93b2-34b688ad1cb6/bfb832c0-d741-42ce-b46f-0209136ffc38.jpeg"

# 1. Sign URL using localhost:9000
client = boto3.client(
    "s3",
    endpoint_url="http://localhost:9000",
    aws_access_key_id="minioadmin",
    aws_secret_access_key="minioadminpassword",
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)

url = client.generate_presigned_url(
    "get_object",
    Params={"Bucket": bucket_name, "Key": file_key},
    ExpiresIn=3600,
)

print(f"Generated URL:\n{url}\n")

# 2. Test accessing the URL
response = requests.get(url)
print(f"Status Code: {response.status_code}")
print(f"Response Content:\n{response.text[:500]}")
