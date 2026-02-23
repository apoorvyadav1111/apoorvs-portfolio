"use client";

import React from "react";
import { Github, ExternalLink } from "lucide-react";

interface Project {
  name: string;
  description: string;
  tech: string[];
  github?: string;
  live?: string;
  featured?: boolean;
}

interface ProjectsProps {
  projects: Project[];
}

export default function Projects({ projects }: ProjectsProps) {
  return (
    <div className="max-w-4xl">
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-2 text-cyan-400">
          {"["} Projects {"]"}
        </h2>
        <p className="text-gray-500 text-sm">// Things I've built</p>
      </div>

      <div className="space-y-6">
        {projects.map((project, i) => (
          <div
            key={i}
            className={`bg-black/10 backdrop-blur-[2px] border border-white/10 p-6 md:p-8 rounded-lg hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10 ${
              project.featured ? "ring-1 ring-cyan-500/20" : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-100">
                    {project.name}
                  </h3>
                  {project.featured && (
                    <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded">
                      ★ Featured
                    </span>
                  )}
                </div>
                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                  {project.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {project.tech.map((tech, j) => (
                <span
                  key={j}
                  className="text-xs px-2 md:px-3 py-1 bg-black/20 backdrop-blur-sm text-gray-300 rounded border border-white/10"
                >
                  {tech}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  Code
                </a>
              )}
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Live Demo
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
