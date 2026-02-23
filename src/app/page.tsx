"use client";

import { useState } from "react";
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
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-zinc-950 border-b border-zinc-800 p-4 z-10">
        <h1 className="text-lg font-bold text-cyan-400 text-center">
          {personalData.name}
        </h1>
        <div className="flex gap-2 mt-3 overflow-x-auto">
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
      <main className="flex-1 lg:ml-80 p-6 md:p-12 overflow-y-auto mt-24 lg:mt-0">
        {activeTab === "work" && <WorkTimeline work={workData} />}
        {activeTab === "projects" && <Projects projects={projectsData} />}
      </main>
    </div>
  );
}
