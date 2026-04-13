import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// install uuid: npm install uuid @types/uuid

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

// ── Upload a file to S3 ───────────────────────────────────────────────────────
export async function uploadToS3(
    fileBuffer: Buffer,
    mimeType: string
): Promise<string> {
    const key = `todos/${uuidv4()}.jpg`;  // unique filename

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
    }));

    // return public URL of the uploaded image
    return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// ── Delete a file from S3 ─────────────────────────────────────────────────────
export async function deleteFromS3(imageUrl: string): Promise<void> {
    // extract key from URL
    const key = imageUrl.split(".amazonaws.com/")[1];

    await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
    }));
}