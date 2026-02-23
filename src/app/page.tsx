"use client";

import { useState } from "react";
import { Github, Linkedin } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import WorkTimeline from "@/components/WorkTimeline";
import Projects from "@/components/Projects";
import HexagonBackground from "@/components/HexagonBackground";

// Import JSON data
import personalData from "@/data/personal.json";
import workData from "@/data/work.json";
import projectsData from "@/data/projects.json";

export default function Home() {
  const [activeTab, setActiveTab] = useState("work");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex font-mono relative">
      {/* Hexagon Background */}
      <HexagonBackground className="fixed inset-0 z-0" />

      {/* Left Sidebar */}
      <Sidebar
        personal={personalData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--background)]/90 backdrop-blur-xl border-b border-zinc-800 p-4 z-10">
        <div className="text-center mb-3">
          <h1 className="text-lg font-bold text-cyan-400">
            {personalData.name}
          </h1>
          <p className="text-xs text-gray-400">
            {"<"}
            {personalData.title}
            {" />"}
          </p>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed mb-3 text-center">
          {personalData.bio}
        </p>

        <div className="flex justify-center gap-4 mb-3">
          <a
            href={personalData.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
          <a
            href={personalData.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </a>
        </div>

        <div className="flex gap-2 overflow-x-auto justify-center">
          <button
            onClick={() => setActiveTab("work")}
            className={`px-4 py-1.5 rounded text-xs whitespace-nowrap ${
              activeTab === "work"
                ? "bg-cyan-500/10 text-cyan-400"
                : "text-gray-400 bg-zinc-900"
            }`}
          >
            Work
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-1.5 rounded text-xs whitespace-nowrap ${
              activeTab === "projects"
                ? "bg-cyan-500/10 text-cyan-400"
                : "text-gray-400 bg-zinc-900"
            }`}
          >
            Projects
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-80 p-6 md:p-12 overflow-y-auto mt-52 lg:mt-0">
        {activeTab === "work" && <WorkTimeline work={workData} />}
        {activeTab === "projects" && <Projects projects={projectsData} />}
      </main>
    </div>
  );
}
