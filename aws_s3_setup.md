# AWS S3 Configuration Guide

To use Amazon S3 for file storage instead of your local disk, you need to create an S3 bucket and an IAM user with the correct permissions. This guide walks you through the process of obtaining the necessary environment variables:
`S3_BUCKET_NAME`, `S3_REGION`, `APP_AWS_ACCESS_KEY_ID`, and `APP_AWS_SECRET_ACCESS_KEY`.

---

## 1. Create an S3 Bucket

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Navigate to the **S3** service.
3. Click **Create bucket**.
4. **Bucket name:** Enter a unique name for your bucket (e.g., `my-provisional-certs-bucket`).
   - *Note this down, this will be your `S3_BUCKET_NAME`.*
5. **AWS Region:** Select the region closest to your users or deployment server (e.g., `us-east-1`).
   - *Note this down, this will be your `S3_REGION`.*
6. **Object Ownership:** Leave as **ACLs disabled (recommended)**.
7. **Block Public Access settings:** Ensure **Block all public access** is **CHECKED**. 
   - *Our application serves files securely via authenticated API routes, so the bucket itself must remain completely private.*
8. Click **Create bucket** at the bottom of the page.

---

## 2. Create an IAM Policy

Next, we create a policy that grants the exact permissions our application needs (`PutObject`, `GetObject`, `DeleteObject`) and nothing more.

1. Navigate to the **IAM** (Identity and Access Management) service in the AWS Console.
2. In the left sidebar, click **Policies**, then click **Create policy**.
3. Select the **JSON** tab and paste the following policy. 
   - *Be sure to replace `YOUR_BUCKET_NAME` with the actual name of the bucket you just created.*

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowAppToManageObjects",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
        }
    ]
}
```
4. Click **Next: Tags**, then **Next: Review**.
5. Give the policy a name, like `ProvisionalCertsAppS3Policy`.
6. Click **Create policy**.

---

## 3. Create an IAM User and Get Access Keys

Now, create a user for your application and attach the policy you just made.

1. Still in the **IAM** console, click **Users** in the left sidebar.
2. Click **Add users**.
3. **User name:** Enter a name like `provisional-certs-app-user`. Click **Next**.
4. **Permissions options:** Select **Attach policies directly**.
5. In the search box, find the policy you created in Step 2 (`ProvisionalCertsAppS3Policy`), check the box next to it, and click **Next**.
6. Click **Create user**.
7. In the success screen (or by clicking into the new user's profile), navigate to the **Security credentials** tab.
8. Scroll down to **Access keys** and click **Create access key**.
9. Select **Application running outside AWS** (or your relevant use case). Click **Next**.
10. Click **Create access key**.
11. **IMPORTANT:** You will now see your **Access key ID** and **Secret access key**. 
    - *Copy these immediately. You will not be able to see the Secret access key again after you close this page.*

---

## 4. Configure Your Environment Variables

Update your `.env.local` (or your deployment provider's environment variables dashboard, e.g., Netlify/Vercel) with the values you gathered:

```env
S3_BUCKET_NAME="my-provisional-certs-bucket"
S3_REGION="us-east-1"
APP_AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
APP_AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

Once these are set, the application will automatically switch from local disk storage to S3 object storage seamlessly.
