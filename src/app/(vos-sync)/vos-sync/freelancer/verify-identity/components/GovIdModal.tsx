import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadVerificationDocumentAction, submitIdentityVerificationAction } from "@/modules/freelancer/freelancer-profile/services/identity-verification.actions";
import { toast } from "sonner";

interface GovIdModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GovIdModal({ isOpen, onClose, onSuccess }: GovIdModalProps) {
    const [idType, setIdType] = useState<string>("");
    const [frontId, setFrontId] = useState<File | null>(null);
    const [selfieId, setSelfieId] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!idType || !frontId || !selfieId) {
            toast.error("Please fill in all fields and upload both images.");
            return;
        }

        try {
            setIsSubmitting(true);
            
            const frontFormData = new FormData();
            frontFormData.append("file", frontId);
            const frontRes = await uploadVerificationDocumentAction(0 /* placeholder */, frontFormData);
            
            if (!frontRes.success) throw new Error(frontRes.error);

            const selfieFormData = new FormData();
            selfieFormData.append("file", selfieId);
            const selfieRes = await uploadVerificationDocumentAction(0 /* placeholder */, selfieFormData);

            if (!selfieRes.success) throw new Error(selfieRes.error);

            const submitRes = await submitIdentityVerificationAction({
                type: 'gov_id',
                gov_id_type: idType,
                gov_id_front_image_uuid: frontRes.fileId,
                gov_id_selfie_image_uuid: selfieRes.fileId
            });

            if (!submitRes.success) throw new Error(submitRes.error);

            toast.success("Government ID submitted successfully for review.");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to submit Government ID.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Submit Government ID</DialogTitle>
                    <DialogDescription>
                        Upload a clear photo of your ID and a selfie of you holding it.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">ID Type</label>
                        <Select value={idType} onValueChange={setIdType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select ID Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="driver_license">Driver's License</SelectItem>
                                <SelectItem value="passport">Passport</SelectItem>
                                <SelectItem value="national_id">National ID (PhilSys)</SelectItem>
                                <SelectItem value="postal_id">Postal ID</SelectItem>
                                <SelectItem value="umid">UMID</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Front of ID</label>
                        <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => setFrontId(e.target.files?.[0] || null)} 
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Selfie holding ID</label>
                        <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => setSelfieId(e.target.files?.[0] || null)} 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
