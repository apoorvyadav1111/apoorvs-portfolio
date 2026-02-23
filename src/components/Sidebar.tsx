"use client";

import React, { useState, useEffect } from "react";
import {
  Github,
  Linkedin,
  Terminal,
  Briefcase,
  Code2,
  BookOpen,
  User,
} from "lucide-react";

interface SidebarProps {
  personal: {
    name: string;
    title: string;
    bio: string;
    github: string;
    linkedin: string;
  };
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({
  personal,
  activeTab,
  setActiveTab,
}: SidebarProps) {
  const [displayedCommand, setDisplayedCommand] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const commandText = "$ whoami";

  useEffect(() => {
    if (commandIndex < commandText.length) {
      const timeout = setTimeout(() => {
        setDisplayedCommand((prev) => prev + commandText[commandIndex]);
        setCommandIndex((prev) => prev + 1);
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [commandIndex, commandText]);

  return (
    <aside className="w-80 bg-[var(--background)]/70 backdrop-blur-xl border-r border-zinc-800/50 p-8 flex flex-col fixed h-screen overflow-y-auto hidden lg:flex z-10">
      {/* Name & Title */}
      <div className="mb-8">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-1 text-cyan-400">
            {personal.name}
          </h1>
          <p className="text-sm text-gray-400">
            {"<"}
            {personal.title}
            {" />"}
          </p>
        </div>
      </div>

      {/* About */}
      <div className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
          <Terminal className="w-3 h-3 animate-blink" />
          <span>
            {displayedCommand}
            {commandIndex < commandText.length && (
              <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-0.5 animate-blink"></span>
            )}
          </span>
        </h2>
        <p className="text-sm text-gray-300 leading-relaxed">{personal.bio}</p>
      </div>

      {/* Socials */}
      <div className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-cyan-400 mb-3">
          // Connect
        </h2>
        <div className="space-y-3">
          <a
            href={personal.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-gray-400 hover:text-cyan-400 transition-colors group"
          >
            <Github className="w-4 h-4" />
            <span className="group-hover:translate-x-1 transition-transform">
              GitHub
            </span>
          </a>
          <a
            href={personal.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-gray-400 hover:text-cyan-400 transition-colors group"
          >
            <Linkedin className="w-4 h-4" />
            <span className="group-hover:translate-x-1 transition-transform">
              LinkedIn
            </span>
          </a>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-auto pt-8 border-t border-zinc-800">
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab("work")}
            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
              activeTab === "work"
                ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400"
                : "text-gray-400 hover:text-gray-300 hover:bg-zinc-900"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            work.json
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
              activeTab === "projects"
                ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400"
                : "text-gray-400 hover:text-gray-300 hover:bg-zinc-900"
            }`}
          >
            <Code2 className="w-4 h-4" />
            projects.json
          </button>
        </nav>
      </div>
    </aside>
  );
}
