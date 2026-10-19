"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check } from "lucide-react";

interface CameraCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
    title?: string;
    facingMode?: "user" | "environment";
}

export function CameraCaptureModal({
    isOpen,
    onClose,
    onCapture,
    title = "Take Photo",
    facingMode = "user"
}: CameraCaptureModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsStreaming(false);
    }, []);

    const initStream = useCallback(async () => {
        if (!navigator?.mediaDevices?.getUserMedia) {
            setCameraError("Camera access is not supported by your browser.");
            return;
        }

        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsStreaming(true);
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraError("Unable to access camera. Please ensure permissions are granted.");
            setIsStreaming(false);
        }
    }, [facingMode]);

    useEffect(() => {
        if (!isOpen) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
            return;
        }

        let isMounted = true;
        (async () => {
            if (isMounted) {
                await initStream();
            }
        })();

        return () => {
            isMounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, [isOpen, initStream]);

    const handleSnap = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // If facingMode is user, mirror image for natural selfie view
        if (facingMode === "user") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    setCapturedBlob(blob);
                    setCapturedPreview(canvas.toDataURL("image/jpeg", 0.9));
                    stopStream();
                }
            },
            "image/jpeg",
            0.9
        );
    };

    const handleConfirm = () => {
        if (!capturedBlob) return;
        const filename = `${facingMode === "user" ? "selfie" : "id-front"}-${Date.now()}.jpg`;
        const file = new File([capturedBlob], filename, { type: "image/jpeg" });
        onCapture(file);
        onClose();
    };

    const handleRetake = () => {
        setCapturedPreview(null);
        setCapturedBlob(null);
        initStream();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-background">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
                </DialogHeader>

                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    {cameraError ? (
                        <div className="p-4 text-center text-sm text-destructive bg-destructive/10 rounded-lg m-4">
                            {cameraError}
                        </div>
                    ) : capturedPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={capturedPreview}
                            alt="Captured snapshot"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                        />
                    )}
                </div>

                <DialogFooter className="p-4 border-t flex flex-row items-center justify-between sm:justify-between gap-2">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cancel
                    </Button>

                    <div className="flex items-center gap-2">
                        {capturedPreview ? (
                            <>
                                <Button variant="outline" size="sm" onClick={handleRetake}>
                                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                    Retake
                                </Button>
                                <Button size="sm" onClick={handleConfirm} className="bg-primary text-primary-foreground">
                                    <Check className="mr-1.5 h-3.5 w-3.5" />
                                    Use Photo
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="sm"
                                onClick={handleSnap}
                                disabled={!isStreaming || Boolean(cameraError)}
                                className="bg-primary text-primary-foreground"
                            >
                                <Camera className="mr-1.5 h-3.5 w-3.5" />
                                Snap Photo
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
