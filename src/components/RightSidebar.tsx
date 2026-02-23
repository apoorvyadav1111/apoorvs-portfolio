"use client";

import Image from "next/image";

interface Story {
  title: string;
  image: string;
  text: string;
  date?: string;
}

interface RightSidebarProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
  onViewAll: () => void;
}

export default function RightSidebar({
  stories,
  onStoryClick,
  onViewAll,
}: RightSidebarProps) {
  if (!stories || stories.length === 0) return null;

  const recentStories = stories.slice(0, 4);

  return (
    <aside className="w-80 bg-[var(--background)]/80 backdrop-blur-xl border-l border-white/10 p-8 fixed right-0 h-screen overflow-y-auto hidden lg:block">
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2 text-cyan-400">Recent Stories</h2>
        <p className="text-xs text-gray-500">// Latest moments</p>
      </div>

      <div className="space-y-4">
        {recentStories.map((story, i) => (
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
          </div>
        ))}
      </div>

      <button
        onClick={onViewAll}
        className="w-full mt-6 px-4 py-2 bg-cyan-500/10 text-cyan-400 rounded text-sm hover:bg-cyan-500/20 transition-colors border border-cyan-500/20"
      >
        View All Stories →
      </button>
    </aside>
  );
}
