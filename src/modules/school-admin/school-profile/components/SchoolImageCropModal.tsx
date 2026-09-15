/* eslint-disable @next/next/no-img-element */
// src/modules/school-admin/school-profile/components/SchoolImageCropModal.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Move, Loader2, Check } from "lucide-react";

interface SchoolImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  type: "school_logo" | "school_cover";
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
  uploading?: boolean;
}

function calculateRenderBounds(
  containerW: number,
  containerH: number,
  imgW: number,
  imgH: number,
  zoom: number,
  position: { x: number; y: number }
) {
  if (!imgW || !imgH || !containerW || !containerH) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }

  const imgAspect = imgW / imgH;
  const containerAspect = containerW / containerH;

  let baseW = containerW;
  let baseH = containerH;

  // Object-cover style scaling
  if (imgAspect > containerAspect) {
    baseH = containerH;
    baseW = containerH * imgAspect;
  } else {
    baseW = containerW;
    baseH = containerW / imgAspect;
  }

  const renderW = baseW * zoom;
  const renderH = baseH * zoom;

  const left = (containerW - renderW) / 2 + position.x;
  const top = (containerH - renderH) / 2 + position.y;

  return { left, top, width: renderW, height: renderH };
}

export default function SchoolImageCropModal({
  isOpen,
  imageSrc,
  type,
  onCancel,
  onConfirm,
  uploading = false,
}: SchoolImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ w: 256, h: 256 });

  const containerRef = useRef<HTMLDivElement>(null);

  const isLogo = type === "school_logo";
  const title = isLogo ? "Adjust School Seal / Logo" : "Adjust Campus Banner Cover";

  const updateContainerDimensions = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth || (isLogo ? 256 : 464);
      const h = containerRef.current.clientHeight || (isLogo ? 256 : 160);
      setContainerDimensions({ w, h });
    }
  }, [isLogo]);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setImgElement(img);
      updateContainerDimensions();
    };

    return () => {
      setImgElement(null);
    };
  }, [isOpen, imageSrc, updateContainerDimensions]);

  useEffect(() => {
    if (isOpen) {
      updateContainerDimensions();
    }
  }, [isOpen, updateContainerDimensions]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setPosition({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheelZoom = useCallback((deltaY: number) => {
    const zoomStep = 0.08;
    const delta = deltaY < 0 ? zoomStep : -zoomStep;
    setZoom((prev) => {
      const next = Math.min(3, Math.max(1, prev + delta));
      return Math.round(next * 100) / 100;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleWheelZoom(e.deltaY);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [isOpen, imgElement, handleWheelZoom]);

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    if (!imgElement || !containerDimensions.w || !containerDimensions.h) return;

    const containerW = containerDimensions.w;
    const containerH = containerDimensions.h;

    const outputW = isLogo ? 500 : 1200;
    const outputH = isLogo ? 500 : 400;

    const canvas = document.createElement("canvas");
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputW, outputH);

    const bounds = calculateRenderBounds(
      containerW,
      containerH,
      imgElement.width,
      imgElement.height,
      zoom,
      position
    );

    const scale = outputW / containerW;

    ctx.drawImage(
      imgElement,
      bounds.left * scale,
      bounds.top * scale,
      bounds.width * scale,
      bounds.height * scale
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const filename = isLogo ? "school_logo.png" : "school_cover.png";
        const file = new File([blob], filename, { type: "image/png" });
        onConfirm(file);
      },
      "image/png",
      0.95
    );
  };

  const bounds = imgElement
    ? calculateRenderBounds(
        containerDimensions.w,
        containerDimensions.h,
        imgElement.width,
        imgElement.height,
        zoom,
        position
      )
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !uploading && onCancel()}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Move className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Drag the image to position, and use the slider or mouse wheel to zoom.
          </p>
        </DialogHeader>

        <div className="py-4 space-y-5">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onWheel={(e) => handleWheelZoom(e.deltaY)}
            className={`relative overflow-hidden bg-muted/60 border-2 border-dashed border-primary/50 cursor-grab active:cursor-grabbing select-none flex items-center justify-center ${
              isLogo ? "h-64 w-64 mx-auto rounded-2xl shadow-inner" : "w-full aspect-[3/1] rounded-xl shadow-inner"
            }`}
          >
            {imageSrc && bounds ? (
              <img
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  position: "absolute",
                  left: `${bounds.left}px`,
                  top: `${bounds.top}px`,
                  width: `${bounds.width}px`,
                  height: `${bounds.height}px`,
                  maxWidth: "none",
                  maxHeight: "none",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}

            <div className="absolute inset-0 border border-white/20 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30 z-10">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>
          </div>

          <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" /> Image Scale
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={(vals) => setZoom(vals[0])}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 rounded-lg"
              >
                <RotateCcw className="h-3 w-3" /> Reset Alignment
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={uploading}
            className="h-9 text-xs font-medium rounded-xl border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplyCrop}
            disabled={uploading || !imgElement}
            size="sm"
            className="h-9 px-5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-1.5 transition-transform active:scale-[0.98]"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Apply & Save Photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
