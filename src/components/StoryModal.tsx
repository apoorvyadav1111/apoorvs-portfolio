"use client";

import React from "react";
import { X } from "lucide-react";
import Image from "next/image";
import HexagonBackground from "./HexagonBackground";

interface Story {
  title: string;
  image: string;
  text: string;
  date?: string;
}

interface StoryModalProps {
  story: Story | null;
  onClose: () => void;
}

export default function StoryModal({ story, onClose }: StoryModalProps) {
  if (!story) return null;

  return (
    <div
      className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-black/10 backdrop-blur-2xl border border-white/10 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl shadow-black/60 relative flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors z-20 rounded-full p-1.5"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image - Left Side, Full Height */}
        <div className="w-full md:w-[40%] flex-shrink-0 relative z-10">
          <div className="relative h-64 md:h-full min-h-[300px] md:min-h-[400px]">
            <Image
              src={story.image}
              alt={story.title}
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Text Content - Right Side */}
        <div className="flex-1 p-6 md:p-8 flex items-center border-l border-white/10 relative z-10">
          <p className="text-gray-100 leading-relaxed text-sm font-medium drop-shadow-sm">
            {story.text}
          </p>
        </div>
      </div>
    </div>
  );
}
