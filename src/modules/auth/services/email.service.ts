import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export async function sendOTP(email: string, otpCode: string) {
    try {
        const info = await transporter.sendMail({
            from: '"Vos Sync" <noreply@vossync.com>',
            to: email,
            subject: "Your Vos Sync Verification Code",
            text: `Your Vos Sync Verification Code is: ${otpCode}. It will expire in 10 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to Vos Sync!</h2>
                    <p>Your one-time verification code is:</p>
                    <h1 style="font-size: 32px; letter-spacing: 5px; color: #1e40af;">${otpCode}</h1>
                    <p>This code will expire in 10 minutes. Please do not share it with anyone.</p>
                </div>
            `
        });

        // Useful for Ethereal email testing during development
        if (process.env.SMTP_HOST?.includes('ethereal')) {
            console.log("Ethereal Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }

        return info;
    } catch (error) {
        console.error("Failed to send OTP email:", error);
        throw new Error("Failed to send verification email.");
    }
}

export async function sendSchoolInvite(email: string, schoolName: string, inviteUrl: string) {
    try {
        const info = await transporter.sendMail({
            from: '"Vos Sync" <noreply@vossync.com>',
            to: email,
            subject: `Invitation to Manage ${schoolName} on Vos Sync`,
            text: `You have been invited to manage ${schoolName} on Vos Sync. Click the following link to register: ${inviteUrl}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to Vos Sync!</h2>
                    <p>You have been invited to manage <strong>${schoolName}</strong>.</p>
                    <p>Please click the button below to complete your registration and set up your school admin account:</p>
                    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 16px;">Register Now</a>
                    <p style="margin-top: 24px; font-size: 14px; color: #666;">This link will expire in 72 hours. If you did not expect this invitation, you can ignore this email.</p>
                </div>
            `
        });

        if (process.env.SMTP_HOST?.includes('ethereal')) {
            console.log("Ethereal Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }

        return info;
    } catch (error) {
        console.error("Failed to send invite email:", error);
        throw new Error("Failed to send invite email.");
    }
}

export async function sendPasswordResetOTP(email: string, otpCode: string) {
    try {
        const info = await transporter.sendMail({
            from: '"Vos Sync" <noreply@vossync.com>',
            to: email,
            subject: "Vos Sync Password Reset",
            text: `Your password reset code is: ${otpCode}. It will expire in 2 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Vos Sync Password Reset</h2>
                    <p>We received a request to reset your password. Your reset code is:</p>
                    <h1 style="font-size: 32px; letter-spacing: 5px; color: #1e40af;">${otpCode}</h1>
                    <p>This code will expire in 2 minutes. If you did not request this, please ignore this email.</p>
                </div>
            `
        });

        if (process.env.SMTP_HOST?.includes('ethereal')) {
            console.log("Ethereal Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }

        return info;
    } catch (error) {
        console.error("Failed to send reset OTP email:", error);
        throw new Error("Failed to send reset email.");
    }
}
