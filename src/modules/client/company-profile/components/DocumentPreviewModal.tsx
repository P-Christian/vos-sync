// src/modules/client/company-profile/components/DocumentPreviewModal.tsx
"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ExternalLink,
  FileText,
  Move,
} from "lucide-react";

export interface PreviewableDoc {
  id: string;
  name: string;
  document_type?: string;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: PreviewableDoc | null;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  doc,
}: DocumentPreviewModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [prevDocId, setPrevDocId] = useState<string | null>(doc?.id ?? null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(isOpen);

  // Reset transforms whenever a new doc opens or modal closes
  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  if (isOpen !== prevIsOpen || doc?.id !== prevDocId) {
    setPrevDocId(doc?.id ?? null);
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }

  if (!doc) return null;

  const isPdf = doc.name.toLowerCase().endsWith(".pdf");
  const docUrl = `/api/client/assets/${doc.id}`;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPdf) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isPdf) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handlers for mobile/tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPdf || e.touches.length === 0) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX - pan.x,
      y: touch.clientY - pan.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isPdf || e.touches.length === 0) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStartRef.current.x,
      y: touch.clientY - dragStartRef.current.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[94vw] h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-primary/20 rounded-2xl shadow-2xl">
        {/* Header Bar */}
        <DialogHeader className="px-5 py-3 border-b border-border/80 bg-muted/40 flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-8">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold truncate text-foreground">
                {doc.name}
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground truncate">
                {isPdf ? "PDF Document" : "Image Document"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Floating Toolbar Controls */}
        <div className="px-5 py-2.5 bg-card/80 border-b border-border/60 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5 || isPdf}
              title="Zoom Out"
              className="h-8 w-8 p-0 rounded-lg text-foreground hover:bg-background"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <span className="text-xs font-mono font-medium px-2 min-w-[3.5rem] text-center text-foreground">
              {Math.round(zoom * 100)}%
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3.5 || isPdf}
              title="Zoom In"
              className="h-8 w-8 p-0 rounded-lg text-foreground hover:bg-background"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRotate}
              disabled={isPdf}
              title="Rotate 90° Clockwise"
              className="h-8 w-8 p-0 rounded-lg text-foreground hover:bg-background"
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetView}
              disabled={isPdf && zoom === 1 && rotation === 0}
              title="Reset View"
              className="h-8 w-8 p-0 rounded-lg text-foreground hover:bg-background"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {!isPdf && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Move className="h-3 w-3" /> Drag to pan
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs gap-1.5 rounded-lg border-primary/20 text-foreground hover:bg-primary/10"
            >
              <a href={docUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                Open Original
              </a>
            </Button>
          </div>
        </div>

        {/* Viewport Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`flex-1 relative overflow-hidden bg-zinc-950/90 flex items-center justify-center ${
            isPdf
              ? "cursor-default"
              : isDragging
              ? "cursor-grabbing"
              : "cursor-grab"
          }`}
        >
          {isPdf ? (
            <iframe
              src={docUrl}
              title={doc.name}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div
              className="relative max-w-full max-h-full flex items-center justify-center p-4 transition-transform select-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transition: isDragging ? "none" : "transform 0.15s ease-out",
                transformOrigin: "center center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={docUrl}
                alt={doc.name}
                draggable={false}
                className="max-h-[70vh] max-w-full object-contain rounded-md shadow-2xl pointer-events-none"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
