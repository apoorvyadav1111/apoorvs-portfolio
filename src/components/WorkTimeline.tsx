"use client";

import React from "react";

interface WorkItem {
  title: string;
  company: string;
  location: string;
  period: string;
  description: string;
  tech: string[];
}

interface WorkTimelineProps {
  work: WorkItem[];
}

export default function WorkTimeline({ work }: WorkTimelineProps) {
  return (
    <div className="max-w-4xl">
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-2 text-cyan-400">
          {"{"} Work Experience {"}"}
        </h2>
        <p className="text-gray-500 text-sm">// Professional journey</p>
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-cyan-500 via-cyan-500/50 to-transparent hidden md:block"></div>

        <div className="space-y-12">
          {work.map((job, i) => (
            <div key={i} className="relative md:pl-12">
              {/* Timeline Dot - Hidden on mobile */}
              <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-cyan-500 ring-4 ring-black transform -translate-x-[5px] hidden md:block">
                <div className="absolute inset-0 rounded-full bg-cyan-500 animate-ping opacity-75"></div>
              </div>

              {/* Content */}
              <div className="bg-transparent/5 backdrop-blur-[2px] z-10 border border-white/10 p-6 md:p-8 rounded-lg hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2">
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-100 mb-1">
                      {job.title}
                    </h3>
                    <p className="text-cyan-400 text-base md:text-lg">
                      {job.company}
                    </p>
                    <p className="text-gray-500 text-sm">{job.location}</p>
                  </div>
                  <span className="text-sm text-gray-400 bg-black/20 backdrop-blur-sm px-3 md:px-4 py-1.5 rounded-full border border-white/10 w-fit">
                    {job.period}
                  </span>
                </div>
                <p className="text-gray-300 mb-4 leading-relaxed text-sm md:text-base">
                  {job.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {job.tech.map((tech, j) => (
                    <span
                      key={j}
                      className="text-xs px-2 md:px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
