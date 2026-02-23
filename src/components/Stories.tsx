"use client";

import React from "react";
import Image from "next/image";

interface Story {
  title: string;
  image: string;
  text: string;
  date?: string;
}

interface StoriesProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

export default function Stories({ stories, onStoryClick }: StoriesProps) {
  return (
    <div>
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-2 text-cyan-400">All Stories</h2>
        <p className="text-gray-500 text-sm">// Complete collection</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {stories.map((story, i) => (
          <div
            key={i}
            onClick={() => onStoryClick(story)}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/50 hover:bg-white/10 transition-all duration-300 cursor-pointer group shadow-lg shadow-black/20"
          >
            <div className="aspect-video bg-zinc-900/50 overflow-hidden relative">
              <Image
                src={story.image}
                alt={story.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="text-sm md:text-base font-semibold text-gray-100 group-hover:text-cyan-400 transition-colors">
                {story.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
