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
