"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Smartphone, MapPin, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useUserProfile } from "@/components/shared/providers/UserProfileProvider";
import { IdentityVerification } from "@/modules/freelancer/freelancer-profile/services/identity-verification.repo";
import { IdProofScoreResult } from "@/modules/freelancer/freelancer-profile/services/identity-verification.service";
import GovIdModal from "./components/GovIdModal";
import AddressModal from "./components/AddressModal";
import MobileVerificationModal from "./components/MobileVerificationModal";
import { PortalPageHeader } from "@/components/shared/layout/PortalPageHeader";

export default function VerifyIdentityPage() {
    const user = useUserProfile();
    const [verifications, setVerifications] = useState<IdentityVerification[]>([]);
    const [scoreData, setScoreData] = useState<IdProofScoreResult | null>(null);


    const [activeModal, setActiveModal] = useState<'gov_id' | 'address' | 'mobile_number' | null>(null);

    const fetchData = async () => {
        await Promise.resolve();
        try {
            const [verifsRes, scoreRes] = await Promise.all([
                fetch("/api/freelancer/verifications"),
                fetch("/api/freelancer/id-proof-score")
            ]);

            if (verifsRes.ok) {
                const vData = await verifsRes.json();
                setVerifications(vData.data || []);
            }
            if (scoreRes.ok) {
                const sData = await scoreRes.json();
                setScoreData(sData);
            }
        } catch (error) {
            console.error("Error fetching verification data:", error);
        }
    };

    useEffect(() => {
        Promise.resolve().then(() => {
            fetchData();
        });
    }, []);

    const getVerificationStatus = (type: string) => {
        const match = verifications.find(v => v.type === type);
        return match ? match.status : 'not_submitted';
    };

    const getRejectionNote = (type: string) => {
        const match = verifications.find(v => v.type === type && v.status === 'rejected');
        return match ? match.rejection_note || undefined : undefined;
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md"><CheckCircle2 className="w-3 h-3" /> Approved</div>;
            case 'pending':
                return <div className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md"><Clock className="w-3 h-3" /> Pending Review</div>;
            case 'rejected':
                return <div className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md"><XCircle className="w-3 h-3" /> Rejected</div>;
            default:
                return <div className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">Not Submitted</div>;
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <PortalPageHeader user={user} />
            <div className="container mx-auto py-8 max-w-5xl space-y-8 flex-1 px-4 flex flex-col items-center justify-center">
                <div className="space-y-3 pb-2 text-center max-w-2xl">
                    <h1 className="text-3xl font-bold tracking-tight">Verify Identity</h1>
                    <p className="text-muted-foreground text-base">
                        Complete these steps to increase your ID Proof Score. A minimum score of 80% is required to apply for jobs.
                    </p>
                </div>

                {scoreData && (
                    <div className={`p-4 rounded-lg border flex items-center justify-between ${scoreData.score >= 80 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-center gap-3">
                            <Shield className={`w-8 h-8 ${scoreData.score >= 80 ? 'text-green-600' : 'text-amber-600'}`} />
                            <div>
                                <h3 className={`font-semibold ${scoreData.score >= 80 ? 'text-green-800' : 'text-amber-800'}`}>
                                    Current ID Proof Score: {scoreData.score}%
                                </h3>
                                <p className={`text-sm ${scoreData.score >= 80 ? 'text-green-700' : 'text-amber-700'}`}>
                                    {scoreData.score >= 80 ? 'You are ready to apply for jobs!' : 'You need at least 80% to apply for jobs.'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right text-sm">
                            <div>Profile Sections: {scoreData.breakdown.profile_sections}/40</div>
                            <div>Gov ID: {scoreData.breakdown.gov_id}/20</div>
                            <div>Address: {scoreData.breakdown.address}/20</div>
                            <div>Mobile: {scoreData.breakdown.mobile_number}/20</div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                    {/* Gov ID Card */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <FileText className="w-6 h-6" />
                                </div>
                                {renderStatusBadge(getVerificationStatus('gov_id'))}
                            </div>
                            <CardTitle className="text-lg">Government ID</CardTitle>
                            <CardDescription>Upload a valid government-issued ID for identity verification.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                className="w-full"
                                variant={getVerificationStatus('gov_id') === 'approved' ? 'outline' : 'default'}
                                disabled={getVerificationStatus('gov_id') === 'pending' || getVerificationStatus('gov_id') === 'approved'}
                                onClick={() => setActiveModal('gov_id')}
                            >
                                {getVerificationStatus('gov_id') === 'rejected' ? 'Resubmit' : (getVerificationStatus('gov_id') === 'approved' ? 'Verified' : 'Submit ID')}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Address Card */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                {renderStatusBadge(getVerificationStatus('address'))}
                            </div>
                            <CardTitle className="text-lg">Address Verification</CardTitle>
                            <CardDescription>Upload a recent utility bill or bank statement showing your address.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                className="w-full"
                                variant={getVerificationStatus('address') === 'approved' ? 'outline' : 'default'}
                                disabled={getVerificationStatus('address') === 'pending' || getVerificationStatus('address') === 'approved'}
                                onClick={() => setActiveModal('address')}
                            >
                                {getVerificationStatus('address') === 'rejected' ? 'Resubmit' : (getVerificationStatus('address') === 'approved' ? 'Verified' : 'Submit Address')}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Mobile Card */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                {renderStatusBadge(getVerificationStatus('mobile_number'))}
                            </div>
                            <CardTitle className="text-lg">Mobile Number</CardTitle>
                            <CardDescription>Verify your mobile number via OTP for account security.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                className="w-full"
                                variant={getVerificationStatus('mobile_number') === 'approved' ? 'outline' : 'default'}
                                disabled={getVerificationStatus('mobile_number') === 'approved'}
                                onClick={() => setActiveModal('mobile_number')}
                            >
                                {getVerificationStatus('mobile_number') === 'approved' ? 'Verified' : 'Verify Mobile'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <GovIdModal
                    isOpen={activeModal === 'gov_id'}
                    onClose={() => setActiveModal(null)}
                    onSuccess={fetchData}
                    rejectionNote={getRejectionNote('gov_id')}
                />
                <AddressModal
                    isOpen={activeModal === 'address'}
                    onClose={() => setActiveModal(null)}
                    onSuccess={fetchData}
                    rejectionNote={getRejectionNote('address')}
                />
                <MobileVerificationModal
                    isOpen={activeModal === 'mobile_number'}
                    onClose={() => setActiveModal(null)}
                    onSuccess={fetchData}
                />
            </div>
        </div>
    );
}
