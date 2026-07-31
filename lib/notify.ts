// Sends password-reset codes via AWS SES (email) and AWS SNS (SMS).
// Requires AWS_REGION + SES_FROM_EMAIL. Credentials come from explicit
// AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY (local dev) if both are set,
// otherwise the SDK's default credential chain (e.g. the Amplify compute
// service role in production).

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const region = process.env.AWS_REGION || "ap-south-1";
const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

const ses = new SESClient({ region, ...(credentials ? { credentials } : {}) });
const sns = new SNSClient({ region, ...(credentials ? { credentials } : {}) });

export async function sendResetCodeEmail(toEmail: string, code: string): Promise<void> {
  await ses.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "Your Vaishnora password reset code" },
        Body: { Text: { Data: `Your password reset code is ${code}. It expires in 15 minutes.` } },
      },
    })
  );
}

export async function sendResetCodeSms(toPhoneE164: string, code: string): Promise<void> {
  await sns.send(
    new PublishCommand({
      PhoneNumber: toPhoneE164,
      Message: `Vaishnora password reset code: ${code}. Expires in 15 minutes.`,
    })
  );
}
