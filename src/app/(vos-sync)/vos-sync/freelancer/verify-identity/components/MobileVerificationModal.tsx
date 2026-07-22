import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMobileOtpAction, verifyMobileOtpAction } from "@/modules/freelancer/freelancer-profile/services/identity-verification.actions";
import { toast } from "sonner";

interface MobileVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function MobileVerificationModal({ isOpen, onClose, onSuccess }: MobileVerificationModalProps) {
    const [mobileNumber, setMobileNumber] = useState<string>("");
    const [otp, setOtp] = useState<string>("");
    const [step, setStep] = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSendOtp = async () => {
        if (!mobileNumber) {
            toast.error("Please enter a mobile number.");
            return;
        }
        try {
            setIsSubmitting(true);
            const res = await sendMobileOtpAction(mobileNumber);
            if (!res.success) throw new Error(res.error);
            setStep(2);
            toast.success("OTP sent! (Use 123456 for testing)");
        } catch (error: any) {
            toast.error(error.message || "Failed to send OTP.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp) {
            toast.error("Please enter the OTP.");
            return;
        }
        try {
            setIsSubmitting(true);
            const res = await verifyMobileOtpAction(mobileNumber, otp);
            if (!res.success) throw new Error(res.error);
            toast.success("Mobile number verified successfully!");
            onSuccess();
            onClose();
            // reset state for next time
            setTimeout(() => { setStep(1); setMobileNumber(""); setOtp(""); }, 500);
        } catch (error: any) {
            toast.error(error.message || "Invalid OTP.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setStep(1);
                setMobileNumber("");
                setOtp("");
                onClose();
            }
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Verify Mobile Number</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? "Enter your mobile number to receive a one-time password (OTP)." : "Enter the 6-digit OTP sent to your phone."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {step === 1 ? (
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Mobile Number</label>
                            <Input 
                                type="tel" 
                                placeholder="+63 912 345 6789"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">One-Time Password (OTP)</label>
                            <Input 
                                type="text" 
                                placeholder="123456"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    {step === 1 ? (
                        <Button onClick={handleSendOtp} disabled={isSubmitting}>
                            {isSubmitting ? "Sending..." : "Send OTP"}
                        </Button>
                    ) : (
                        <Button onClick={handleVerifyOtp} disabled={isSubmitting}>
                            {isSubmitting ? "Verifying..." : "Verify OTP"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
