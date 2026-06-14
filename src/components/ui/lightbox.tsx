"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";
import { Button } from "./button";

interface LightboxProps {
  images: { src: string; alt: string }[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex = 0, isOpen, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setScale(1);
  }, [initialIndex, isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
          break;
        case "ArrowRight":
          setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
          break;
      }
    },
    [isOpen, images.length, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 h-10 w-10"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 z-10 text-white hover:bg-white/20 h-12 w-12"
            onClick={() =>
              setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
            }
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 z-10 text-white hover:bg-white/20 h-12 w-12"
            onClick={() =>
              setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
            }
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Image */}
      <div className="relative z-10 flex items-center justify-center max-w-[90vw] max-h-[85vh]">
        <img
          src={currentImage.src}
          alt={currentImage.alt}
          className="max-w-full max-h-[85vh] object-contain transition-transform duration-300"
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-8 w-8"
          onClick={() => setScale((prev) => Math.max(0.5, prev - 0.25))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-white text-sm min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-8 w-8"
          onClick={() => setScale((prev) => Math.min(3, prev + 0.25))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-white/30 mx-1" />
        <a
          href={currentImage.src}
          download
          className="text-white hover:bg-white/20 h-8 w-8 flex items-center justify-center rounded-md transition-colors"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 z-10 text-white/80 text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
